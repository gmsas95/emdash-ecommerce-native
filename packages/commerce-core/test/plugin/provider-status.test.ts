import { describe, expect, it } from "vitest";
import { createPlugin } from "../../src/index.js";

describe("Commerce provider status", () => {
  it("surfaces provider-supplied metadata without exposing bridge secrets", async () => {
    const plugin = createPlugin({
      paymentBridges: {
        chip: {
          pluginId: "chip-for-emdash",
          basePath: "https://store.test/chip/create",
          eventPath: "https://store.test/commerce/events",
          capabilities: ["payment.create"],
          sharedSecret: "server-only-secret",
          label: "CHIP Payments",
          settingsPath: "/_emdash/admin/plugins/chip-for-emdash/settings",
          paymentsPath: "/_emdash/admin/plugins/chip-for-emdash/payments",
        },
        unknown: {
          pluginId: "unknown-gateway",
          basePath: "https://gw.test/pay",
          eventPath: "https://gw.test/events",
          capabilities: ["payment.create"],
          sharedSecret: "another-secret",
        },
      },
    });
    const response = await plugin.routes["provider-status"].handler({
      input: undefined,
      request: new Request("https://commerce.test", { method: "GET" }),
      storage: {},
      requestMeta: {},
    } as never) as { providers: Array<Record<string, unknown>> };

    expect(response.providers).toContainEqual({
      id: "chip",
      label: "CHIP Payments",
      configured: true,
      settingsPath: "/_emdash/admin/plugins/chip-for-emdash/settings",
      paymentsPath: "/_emdash/admin/plugins/chip-for-emdash/payments",
    });
    expect(response.providers).toContainEqual({
      id: "unknown",
      label: "unknown",
      configured: true,
    });
    expect(JSON.stringify(response)).not.toContain("server-only-secret");
    expect(JSON.stringify(response)).not.toContain("another-secret");
  });
  it("prefers the configured payment provider display label", async () => {
    const plugin = createPlugin({
      paymentProviders: {
        hosted: {
          label: "Hosted checkout",
          createPayment: async () => ({ checkoutUrl: "https://pay.test/checkout" }),
        },
      },
    });
    const response = await plugin.routes["provider-status"].handler({
      input: undefined,
      request: new Request("https://commerce.test", { method: "GET" }),
      storage: {},
      requestMeta: {},
    } as never) as { providers: Array<Record<string, unknown>> };

    expect(response.providers).toContainEqual({
      id: "hosted",
      label: "Hosted checkout",
      configured: true,
    });
  });

  it("marks unconfigured providers", async () => {
    const plugin = createPlugin({});
    const response = await plugin.routes["provider-status"].handler({
      input: undefined,
      request: new Request("https://commerce.test", { method: "GET" }),
      storage: {},
      requestMeta: {},
    } as never) as { providers: Array<Record<string, unknown>> };

    expect(response.providers).toEqual([]);
  });
});
