import { describe, expect, it } from "vitest";
import { CommerceApiError, createCommerceClient } from "../../src/storefront/client.js";

describe("createCommerceClient", () => {
  it("unwraps envelopes and propagates/captures Cart-Token", async () => {
    const calls: Array<{ url: string; headers: Headers; credentials: RequestCredentials }> = [];
    const client = createCommerceClient(async (url, init) => {
      calls.push({
        url,
        headers: new Headers(init?.headers),
        credentials: init?.credentials as RequestCredentials,
      });
      return new Response(JSON.stringify({
        success: true,
        data: {
          token: "next-token",
          id: "cart-1",
          currency: "USD",
          lines: [],
          totals: { subtotalMinor: 0, discountMinor: 0, taxMinor: 0, shippingMinor: 0, totalMinor: 0, currency: "USD" },
          availability: [],
          errors: [],
          extensions: {},
        },
      }), { status: 200 });
    }, "/api", { cartToken: "stored-token" });

    expect((await client.cart.get()).id).toBe("cart-1");
    expect(calls[0]!.url).toBe("/api/cart");
    expect(calls[0]!.headers.get("Cart-Token")).toBe("stored-token");
    expect(calls[0]!.headers.get("X-EmDash-Request")).toBe("1");
    expect(calls[0]!.credentials).toBe("same-origin");
    expect(client.getCartToken()).toBe("next-token");
    await client.cart.remove("line/1");
    expect(calls[1]!.url).toBe("/api/cart/items?lineId=line%2F1");
    expect(calls[1]!.headers.get("content-type")).toBeNull();
  });

  it("serializes checkout idempotency and expected totals", async () => {
    let body: unknown;
    const client = createCommerceClient(async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        success: true,
        data: { orderId: "order-1", orderAccessToken: "access-1", checkoutUrl: "https://pay.test/1", totalMinor: 1_250, currency: "USD" },
      }), { status: 200 });
    }, "/api");

    await client.checkout.start({ paymentProvider: "chip", idempotencyKey: "idem-1", expectedTotalMinor: 1_250 });
    expect(body).toMatchObject({ paymentProvider: "chip", idempotencyKey: "idem-1", expectedTotalMinor: 1_250 });
  });

  it("preserves typed API errors", async () => {
    const client = createCommerceClient(async () => new Response(JSON.stringify({
      success: false,
      error: { code: "INSUFFICIENT_STOCK", message: "No stock" },
    }), { status: 409 }), "/api");

    await expect(client.checkout.start({ paymentProvider: "payment-provider", idempotencyKey: "idem-1" }))
      .rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", status: 409 });
  });

  it("rejects malformed envelopes", async () => {
    const client = createCommerceClient(async () => new Response(JSON.stringify({ success: true }), { status: 200 }), "/api");
    await expect(client.cart.get()).rejects.toBeInstanceOf(CommerceApiError);
  });
});
