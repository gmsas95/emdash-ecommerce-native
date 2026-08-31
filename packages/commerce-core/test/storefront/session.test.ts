import { describe, expect, it } from "vitest";
import {
  createCartSession,
  expireCartSessions,
  resolveCartSession,
} from "../../src/storefront/session.js";
import { createMemoryRepositories } from "../../src/storage/repositories.js";

describe("cart sessions", () => {
  it("creates an opaque token and resolves it to the cart", async () => {
    const repositories = createMemoryRepositories();
    const session = await createCartSession(repositories.cartSessions, "cart-1", 1_800_000_000_000);

    expect(session.token).not.toBe("cart-1");
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    await expect(resolveCartSession(repositories.cartSessions, new Request("https://store.test", {
      headers: { "Cart-Token": session.token },
    }), 1_800_000_000_000)).resolves.toMatchObject({ cartId: "cart-1", transport: "token" });
  });
  it("resolves an encoded browser cookie to the same cart", async () => {
    const repositories = createMemoryRepositories();
    const session = await createCartSession(repositories.cartSessions, "cart-1", 1_800_000_000_000);

    await expect(resolveCartSession(repositories.cartSessions, new Request("https://store.test", {
      headers: { Cookie: `emdash_commerce_cart=${encodeURIComponent(session.token)}` },
    }), 1_800_000_000_000)).resolves.toMatchObject({ cartId: "cart-1", transport: "cookie" });
  });

  it("rejects conflicting token and cookie credentials", async () => {
    const repositories = createMemoryRepositories();
    const first = await createCartSession(repositories.cartSessions, "cart-1", 1_800_000_000_000);
    const second = await createCartSession(repositories.cartSessions, "cart-2", 1_800_000_000_000);

    await expect(resolveCartSession(repositories.cartSessions, new Request("https://store.test", {
      headers: {
        "Cart-Token": first.token,
        Cookie: `emdash_commerce_cart=${encodeURIComponent(second.token)}`,
      },
    }), 1_800_000_000_000)).rejects.toMatchObject({ code: "CART_SESSION_CONFLICT", status: 409 });
  });

  it("treats expired sessions as absent and removes their lookup record", async () => {
    const repositories = createMemoryRepositories();
    const session = await createCartSession(repositories.cartSessions, "cart-1", 1_000, 1);

    await expect(resolveCartSession(repositories.cartSessions, new Request("https://store.test", {
      headers: { "Cart-Token": session.token },
    }), 1_001)).resolves.toBeUndefined();
    await expect(repositories.cartSessions.get(session.id)).resolves.toBeUndefined();
  });
  it("sweeps expired sessions during maintenance", async () => {
    const repositories = createMemoryRepositories();
    const expired = await createCartSession(repositories.cartSessions, "cart-1", 1_000, 1);
    const active = await createCartSession(repositories.cartSessions, "cart-2", 1_000, 1_000);

    await expect(expireCartSessions(repositories.cartSessions, 1_001)).resolves.toBe(1);
    await expect(repositories.cartSessions.get(expired.id)).resolves.toBeUndefined();
    await expect(repositories.cartSessions.get(active.id)).resolves.toBeDefined();
  });
});
