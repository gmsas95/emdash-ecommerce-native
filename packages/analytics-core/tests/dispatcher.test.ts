import { describe, expect, it, vi } from "vitest";

import { createAnalyticsDispatcher } from "../src/dispatcher.js";
import { parseAnalyticsEvent } from "../src/types.js";
import type { AnalyticsAdapter, AnalyticsEvent } from "../src/types.js";

const clientEvent: AnalyticsEvent = {
  id: "event-1",
  name: "view_item",
  occurredAt: "2026-08-31T00:00:00.000Z",
  source: "client",
  items: [{ id: "product-1", quantity: 1 }],
};

const purchaseEvent: AnalyticsEvent = {
  id: "purchase-1",
  name: "purchase",
  occurredAt: "2026-08-31T00:00:00.000Z",
  source: "server",
  currency: "MYR",
  value: 18.9,
  items: [{ id: "product-1", quantity: 1, value: 18.9, currency: "MYR" }],
};

function fakeAdapter(overrides: Partial<AnalyticsAdapter> = {}): AnalyticsAdapter {
  return {
    id: "fake",
    load: vi.fn(async () => undefined),
    track: vi.fn(),
    ...overrides,
  };
}

describe("AnalyticsDispatcher", () => {
  it("does not load or dispatch when required consent is denied", async () => {
    const adapter = fakeAdapter();
    const dispatcher = createAnalyticsDispatcher({ adapters: [adapter], readConsent: () => false });

    await dispatcher.start();
    const accepted = await dispatcher.track(clientEvent);

    expect(accepted).toBe(false);
    expect(adapter.load).not.toHaveBeenCalled();
    expect(adapter.track).not.toHaveBeenCalled();
  });

  it("queues events before consent is resolved and flushes after consent", async () => {
    const adapter = fakeAdapter();
    const dispatcher = createAnalyticsDispatcher({ adapters: [adapter], readConsent: () => true });

    const accepted = await dispatcher.track(clientEvent);
    expect(accepted).toBe(true);
    expect(dispatcher.queuedCount).toBe(1);

    await dispatcher.start();

    expect(adapter.load).toHaveBeenCalledOnce();
    expect(adapter.track).toHaveBeenCalledWith(clientEvent);
    expect(dispatcher.queuedCount).toBe(0);
  });

  it("deduplicates repeated event IDs", async () => {
    const adapter = fakeAdapter();
    const dispatcher = createAnalyticsDispatcher({ adapters: [adapter], readConsent: () => true });

    await dispatcher.start();
    expect(await dispatcher.track(purchaseEvent)).toBe(true);
    expect(await dispatcher.track(purchaseEvent)).toBe(false);
    expect(adapter.track).toHaveBeenCalledOnce();
  });

  it("requires server source for purchase and refund", () => {
    expect(() => parseAnalyticsEvent({ ...purchaseEvent, source: "client" })).toThrow("must come from server");
    expect(() => parseAnalyticsEvent({ ...purchaseEvent, name: "refund", source: "client" })).toThrow("must come from server");
  });

  it("isolates adapter failures", async () => {
    const failing = fakeAdapter({ id: "failing", track: vi.fn(() => { throw new Error("provider down"); }) });
    const healthy = fakeAdapter({ id: "healthy" });
    const errors: string[] = [];
    const dispatcher = createAnalyticsDispatcher({
      adapters: [failing, healthy],
      readConsent: () => true,
      onError: (id) => errors.push(id),
    });

    await dispatcher.start();
    await dispatcher.track(clientEvent);

    expect(healthy.track).toHaveBeenCalledWith(clientEvent);
    expect(errors).toEqual(["failing"]);
  });
});
