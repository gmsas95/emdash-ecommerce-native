import { PluginRouteError } from "emdash";
import type { DocumentRepository, JsonDocument } from "../storage/repositories.js";

export const CART_SESSION_COOKIE = "emdash_commerce_cart";
export const CART_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CartSessionRecord {
  cartId: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface CartSession {
  id: string;
  token: string;
  cartId: string;
  expiresAt: string;
}

export type CartSessionTransport = "token" | "cookie";

export interface CartSessionResolution {
  id: string;
  cartId: string;
  transport: CartSessionTransport;
  expiresAt: string;
}

function requireCrypto(): Crypto {
  if (!globalThis.crypto?.randomUUID || !globalThis.crypto.subtle) {
    throw new Error("Web Crypto is required for cart sessions");
  }
  return globalThis.crypto;
}

function createToken(): string {
  const crypto = requireCrypto();
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

async function hashToken(token: string): Promise<string> {
  const crypto = requireCrypto();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readCartToken(request: Request): string | undefined {
  const token = request.headers.get("cart-token")?.trim();
  return token === "" ? undefined : token;
}

export function readCartCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== CART_SESSION_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return undefined;
    try {
      return decodeURIComponent(value.replace(/^"|"$/g, ""));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function createCartSession(
  repository: DocumentRepository,
  cartId: string,
  now: number = Date.now(),
  ttlMs: number = CART_SESSION_TTL_MS,
): Promise<CartSession> {
  if (cartId.trim() === "") throw new Error("Cart session requires a cart ID");
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(ttlMs) || ttlMs < 1) {
    throw new Error("Cart session clock values must be safe integers");
  }
  const token = createToken();
  const id = await hashToken(token);
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttlMs).toISOString();
  const record: CartSessionRecord = { cartId, createdAt, lastSeenAt: createdAt, expiresAt };
  await repository.put(id, record as unknown as JsonDocument);
  return { id, token, cartId, expiresAt };
}

export async function expireCartSessions(repository: DocumentRepository, now: number = Date.now()): Promise<number> {
  if (!Number.isSafeInteger(now)) throw new Error("Cart session clock must be a safe integer");
  const expiresAt = new Date(now).toISOString();
  let cursor: string | undefined;
  let removed = 0;
  do {
    const page = await repository.query({
      where: { expiresAt: { lte: expiresAt } },
      limit: 100,
      ...(cursor === undefined ? {} : { cursor }),
    });
    await Promise.all(page.items.map(({ id }) => repository.delete(id)));
    removed += page.items.length;
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor !== undefined);
  return removed;
}

async function resolveCredential(
  repository: DocumentRepository,
  token: string,
  now: number,
): Promise<{ id: string; record: CartSessionRecord } | undefined> {
  const id = await hashToken(token);
  const record = await repository.get(id) as unknown as CartSessionRecord | undefined;
  if (!record) return undefined;
  const expiresAt = Date.parse(record.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    await repository.delete(id);
    return undefined;
  }
  const lastSeenAt = new Date(now).toISOString();
  await repository.put(id, { ...record, lastSeenAt });
  return { id, record: { ...record, lastSeenAt } };
}

export async function resolveCartSession(
  repository: DocumentRepository,
  request: Request,
  now: number = Date.now(),
): Promise<CartSessionResolution | undefined> {
  const token = readCartToken(request);
  const cookie = readCartCookie(request);
  const [tokenSession, cookieSession] = await Promise.all([
    token === undefined ? undefined : resolveCredential(repository, token, now),
    cookie === undefined ? undefined : resolveCredential(repository, cookie, now),
  ]);

  if (tokenSession && cookieSession && tokenSession.record.cartId !== cookieSession.record.cartId) {
    throw new PluginRouteError("CART_SESSION_CONFLICT", "Cart credentials resolve to different carts", 409);
  }
  const session = tokenSession ?? cookieSession;
  if (!session) return undefined;
  return {
    id: session.id,
    cartId: session.record.cartId,
    transport: tokenSession ? "token" : "cookie",
    expiresAt: session.record.expiresAt,
  };
}
