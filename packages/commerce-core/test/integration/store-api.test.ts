import { describe, expect, it } from "vitest";
import { createPlugin } from "../../src/index.js";
import type { StoreCart } from "../../src/storefront/types.js";
import { createMemoryRepositories } from "../../src/storage/repositories.js";
import type { CommerceRepositories } from "../../src/storage/repositories.js";

function storageFor(repositories: CommerceRepositories) {
  return Object.fromEntries(Object.entries(repositories).map(([name, repository]) => [name, {
    get: async (id: string) => (await repository.get(id)) ?? null,
    put: (id: string, data: never) => repository.put(id, data),
    delete: async (id: string) => {
      await repository.delete(id);
      return true;
    },
    query: (options?: never) => repository.query(options),
    count: (where?: never) => repository.count(where),
  }]));
}

async function createStoreApiFixture(input: { priceMinor?: number } = {}) {
  const repositories = createMemoryRepositories();
  await repositories.products.put("p-1", {
    id: "p-1",
    status: "published",
    name: "Tea",
    priceMinor: input.priceMinor ?? 1_000,
    currency: "USD",
  });
  const plugin = createPlugin();
  const context = (body: unknown, method: string, token?: string, queryLineId?: string) => ({
    input: body,
    request: new Request(`https://commerce.test${queryLineId === undefined ? "" : `?lineId=${encodeURIComponent(queryLineId)}`}`, {
      method,
      ...(token === undefined ? {} : { headers: { "Cart-Token": token } }),
    }),
    storage: storageFor(repositories),
    requestMeta: {},
  }) as never;
  return { plugin, repositories, context };
}

describe("Commerce Store API cart resources", () => {
  it("returns an empty cart without creating a session", async () => {
    const { plugin, repositories, context } = await createStoreApiFixture();
    const result = await plugin.routes.cart.handler(context(undefined, "GET")) as StoreCart;

    expect(result.lines).toEqual([]);
    expect(result.totals.totalMinor).toBe(0);
    expect(await repositories.cartSessions.count()).toBe(0);
  });
  it("creates an empty cart session through the cart resource", async () => {
    const { plugin, repositories, context } = await createStoreApiFixture();
    const result = await plugin.routes.cart.handler(context({ currency: "MYR" }, "POST")) as StoreCart;

    expect(result.currency).toBe("MYR");
    expect(result.lines).toEqual([]);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(await repositories.cartSessions.count()).toBe(1);
  });
  it("creates a USD cart when the POST body is omitted", async () => {
    const { plugin, repositories, context } = await createStoreApiFixture();
    const result = await plugin.routes.cart.handler(context(undefined, "POST")) as StoreCart;

    expect(result.currency).toBe("USD");
    expect(result.lines).toEqual([]);
    expect(await repositories.cartSessions.count()).toBe(1);
  });
  it("rejects an invalid cart currency before creating state", async () => {
    const { plugin, repositories, context } = await createStoreApiFixture();

    await expect(plugin.routes.cart.handler(context({ currency: "not-a-currency" }, "POST")))
      .rejects.toMatchObject({ code: "BAD_REQUEST", status: 400 });
    expect(await repositories.carts.count()).toBe(0);
    expect(await repositories.cartSessions.count()).toBe(0);
  });

  it("creates a token on the first add and returns server totals", async () => {
    const { plugin, repositories, context } = await createStoreApiFixture({ priceMinor: 1_250 });
    const result = await plugin.routes["cart/items"].handler(context({ productId: "p-1", quantity: 2 }, "POST")) as StoreCart;

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(result.lines).toMatchObject([{ productId: "p-1", quantity: 2, unitAmountMinor: 1_250, totalMinor: 2_500 }]);
    expect(result.totals.totalMinor).toBe(2_500);
    expect(await repositories.carts.count()).toBe(1);
  });

  it("replaces and removes lines using lineId without trusting price input", async () => {
    const fixture = await createStoreApiFixture({ priceMinor: 1_000 });
    const added = await fixture.plugin.routes["cart/items"].handler(fixture.context({ productId: "p-1", quantity: 1 }, "POST")) as StoreCart;
    const lineId = added.lines[0]!.lineId;
    const updated = await fixture.plugin.routes["cart/items"].handler(fixture.context({ lineId, quantity: 3, unitAmountMinor: 1 }, "PUT", added.token)) as StoreCart;
    const removed = await fixture.plugin.routes["cart/items"].handler(fixture.context(undefined, "DELETE", added.token, lineId)) as StoreCart;

    expect(updated.totals.totalMinor).toBe(3_000);
    expect(removed.lines).toEqual([]);
  });
  it("starts a fresh cart after a completed checkout", async () => {
    const fixture = await createStoreApiFixture({ priceMinor: 1_000 });
    const added = await fixture.plugin.routes["cart/items"].handler(fixture.context({ productId: "p-1", quantity: 1 }, "POST")) as StoreCart;
    await fixture.repositories.carts.put(added.id, {
      id: added.id,
      currency: added.currency,
      lines: added.lines,
      status: "checked_out",
      checkoutKey: "done",
      checkoutOrderId: "order-1",
      checkoutResult: { orderId: "order-1", checkoutUrl: "https://pay.test", totalMinor: 1_000, currency: "USD" },
    } as never);

    const empty = await fixture.plugin.routes.cart.handler(fixture.context(undefined, "GET", added.token)) as StoreCart;
    const next = await fixture.plugin.routes["cart/items"].handler(fixture.context({ productId: "p-1", quantity: 1 }, "POST", added.token)) as StoreCart;

    expect(empty.lines).toEqual([]);
    expect(next.token).toBeDefined();
    expect(next.token).not.toBe(added.token);
    expect(next.lines).toHaveLength(1);
    expect(await fixture.repositories.carts.count()).toBe(2);
  });
  it("reports configured inventory availability for cart lines", async () => {
    const fixture = await createStoreApiFixture();
    await fixture.repositories.inventory.put("inv-1", {
      productId: "p-1",
      sku: "TEA",
      status: "active",
      available: 2,
      reserved: 0,
    });

    const added = await fixture.plugin.routes["cart/items"].handler(fixture.context({ productId: "p-1", quantity: 1 }, "POST")) as StoreCart;
    const lineId = added.lines[0]!.lineId;
    const updated = await fixture.plugin.routes["cart/items"].handler(fixture.context({ lineId, quantity: 3 }, "PUT", added.token)) as StoreCart;

    expect(added.availability).toEqual([{ lineId, status: "available", requestedQuantity: 1, availableQuantity: 2 }]);
    expect(updated.availability).toEqual([{ lineId, status: "unavailable", requestedQuantity: 3, availableQuantity: 2, reason: "Insufficient stock" }]);
  });
});

describe("Commerce Store API checkout resource", () => {
  it("returns canonical checkout state and safe payment methods", async () => {
    const fixture = await createStoreApiFixture({ priceMinor: 1_250 });
    const plugin = createPlugin({
      paymentProviders: {
        chip: {
          label: "Hosted payment",
          mode: "redirect",
          createPayment: async () => ({ checkoutUrl: "https://pay.test/checkout" }),
        },
      },
    });
    const added = await fixture.plugin.routes["cart/items"].handler(fixture.context({ productId: "p-1", quantity: 2 }, "POST")) as StoreCart;
    const result = await plugin.routes.checkout.handler(fixture.context(undefined, "GET", added.token)) as {
      cart: StoreCart;
      paymentMethods: Array<Record<string, unknown>>;
      fields: { customer: string[]; shippingAddress: string[] };
    };

    expect(result.cart.totals.totalMinor).toBe(2_500);
    expect(result.paymentMethods).toEqual([{ id: "chip", label: "Hosted payment", mode: "redirect", enabled: true }]);
    expect(result.paymentMethods[0]).not.toHaveProperty("settingsPath");
    expect(result.fields.customer).toContain("email");
  });

  it("persists checkout input and rejects stale expected totals", async () => {
    const fixture = await createStoreApiFixture({ priceMinor: 1_250 });
    const plugin = createPlugin({
      paymentProviders: {
        chip: { createPayment: async () => ({ checkoutUrl: "https://pay.test/checkout" }) },
      },
    });
    const added = await fixture.plugin.routes["cart/items"].handler(fixture.context({ productId: "p-1", quantity: 1 }, "POST")) as StoreCart;
    const updated = await plugin.routes.checkout.handler(fixture.context({
      paymentProvider: "chip",
      customer: { email: "buyer@example.test" },
    }, "PUT", added.token)) as { cart: StoreCart };

    expect(updated.cart.totals.totalMinor).toBe(1_250);
    await expect(plugin.routes.checkout.handler(fixture.context({
      paymentProvider: "chip",
      idempotencyKey: "idem-stale",
      expectedTotalMinor: 1_251,
    }, "POST", added.token))).rejects.toMatchObject({ code: "TOTAL_MISMATCH", status: 409 });

    const completed = await plugin.routes.checkout.handler(fixture.context({
      idempotencyKey: "idem-ok",
      expectedTotalMinor: 1_250,
    }, "POST", added.token)) as { orderId: string };
    const order = await fixture.repositories.orders.get(completed.orderId) as {
      customer?: { email?: string };
      paymentProviderId: string;
    };

    expect(order.paymentProviderId).toBe("chip");
    expect(order.customer?.email).toBe("buyer@example.test");
    const nextCheckout = await plugin.routes.checkout.handler(fixture.context(undefined, "GET", added.token)) as { cart: StoreCart };
    expect(nextCheckout.cart.lines).toEqual([]);
    expect(nextCheckout.cart.token).toBeDefined();
    expect(nextCheckout.cart.token).not.toBe(added.token);
  });
  it("rejects a payment bridge that is not configured", async () => {
    const fixture = await createStoreApiFixture();
    const plugin = createPlugin({
      paymentBridges: {
        chip: {
          pluginId: "chip-for-emdash",
          basePath: "https://store.test/chip/create",
          eventPath: "https://store.test/commerce/events",
          capabilities: ["payment.create"],
          sharedSecret: "",
        },
      },
    });
    const added = await fixture.plugin.routes["cart/items"].handler(fixture.context({ productId: "p-1", quantity: 1 }, "POST")) as StoreCart;

    await expect(plugin.routes.checkout.handler(fixture.context({
      paymentProvider: "chip",
      idempotencyKey: "idem-disabled",
    }, "POST", added.token))).rejects.toMatchObject({ code: "BAD_REQUEST", status: 400 });
  });
});
