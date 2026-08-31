import type { OrderSnapshot } from "../domain/orders.js";
import { isRecord } from "../domain/guards.js";
import type {
  CartCreateInput,
  CartItemInput,
  CartItemUpdateInput,
  CartLineInput,
  CartResult,
  CatalogResult,
  CheckoutResource,
  CheckoutResult,
  CheckoutStartInput,
  CheckoutUpdateInput,
  CommerceClient,
  CommerceClientOptions,
  StoreCart,
} from "./types.js";

export type CommerceFetcher = (url: string, init?: RequestInit) => Promise<Response>;

export class CommerceApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CommerceApiError";
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: unknown };
}


export function createCommerceClient(
  fetcher: CommerceFetcher = fetch,
  basePath = "/_emdash/api/plugins/emdash-commerce",
  options: CommerceClientOptions = {},
): CommerceClient {
  const normalizedBasePath = basePath.replace(/\/+$/, "");
  let cartToken = options.cartToken;

  function setCartToken(token: string | undefined): void {
    cartToken = token;
    options.onCartToken?.(token);
  }

  async function request<T>(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: unknown,
  ): Promise<T> {
    const headers = new Headers({
      "X-EmDash-Request": "1",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cartToken === undefined ? {} : { "Cart-Token": cartToken }),
    });
    const response = await fetcher(`${normalizedBasePath}${path}`, {
      method,
      credentials: "same-origin",
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new CommerceApiError("Commerce returned invalid JSON", "INVALID_RESPONSE", response.status);
    }
    if (!isRecord(parsed) || typeof parsed.success !== "boolean") {
      throw new CommerceApiError("Commerce returned an invalid response envelope", "INVALID_RESPONSE", response.status);
    }
    const envelope = parsed as unknown as ApiEnvelope<T>;
    if (!response.ok || envelope.success !== true) {
      throw new CommerceApiError(
        envelope.error?.message ?? `Commerce request failed (${response.status})`,
        envelope.error?.code ?? `HTTP_${response.status}`,
        response.status,
        envelope.error?.details,
      );
    }
    if (!("data" in envelope)) {
      throw new CommerceApiError("Commerce response did not include data", "INVALID_RESPONSE", response.status);
    }
    if (isRecord(envelope.data) && typeof envelope.data.token === "string") {
      setCartToken(envelope.data.token);
    }
    return envelope.data as T;
  }

  return {
    getCartToken: () => cartToken,
    setCartToken,
    catalog: {
      list: () => request<CatalogResult>("/catalog", "GET"),
    },
    cart: {
      get: () => request<StoreCart>("/cart", "GET"),
      create: (input: CartCreateInput = {}) => request<CartResult>("/cart", "POST", input),
      add: (input: CartItemInput) => request<StoreCart>("/cart/items", "POST", input),
      addLine: (input: CartLineInput) => request<CartResult>("/cart/items", "POST", input.line),
      update: (input: CartItemUpdateInput) => request<StoreCart>("/cart/items", "PUT", input),
      remove: (lineId: string) => request<StoreCart>(`/cart/items?lineId=${encodeURIComponent(lineId)}`, "DELETE"),
    },
    checkout: {
      get: () => request<CheckoutResource>("/checkout", "GET"),
      update: (input: CheckoutUpdateInput) => request<CheckoutResource>("/checkout", "PUT", input),
      start: (input: CheckoutStartInput) => request<CheckoutResult>("/checkout", "POST", input),
    },
    orders: {
      get: (orderId: string, orderAccessToken: string) =>
        request<OrderSnapshot>(`/order?orderId=${encodeURIComponent(orderId)}&orderAccessToken=${encodeURIComponent(orderAccessToken)}`, "GET"),
    },
  };
}
