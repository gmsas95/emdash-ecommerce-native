import type { AnalyticsAdapter, AnalyticsEvent, AnalyticsEventName } from "@emdash-cms/analytics-core";

const TIKTOK_SCRIPT = "https://analytics.tiktok.com/i18n/pixel/events.js";
const EVENT_NAMES: Record<AnalyticsEventName, string> = {
  page_view: "Page",
  view_item: "ViewContent",
  search: "Search",
  add_to_cart: "AddToCart",
  remove_from_cart: "RemoveFromCart",
  begin_checkout: "InitiateCheckout",
  purchase: "CompletePayment",
  refund: "Refund",
  lead: "Lead",
};

type TikTokQueue = {
  load(pixelId: string): void;
  track(eventName: string, payload: Record<string, unknown>): void;
  page(): void;
  queue: unknown[][];
};

declare global {
  interface Window {
    ttq?: TikTokQueue;
  }
}

export type TikTokPixelOptions = {
  pixelId: string;
};

function createQueue(): TikTokQueue {
  const queue: TikTokQueue = {
    queue: [],
    load(pixelId) {
      queue.queue.push(["load", pixelId]);
    },
    track(eventName, payload) {
      queue.queue.push(["track", eventName, payload]);
    },
    page() {
      queue.queue.push(["page"]);
    },
  };
  return queue;
}

function loadScript(pixelId: string): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const script = document.createElement("script");
  script.async = true;
  script.src = `${TIKTOK_SCRIPT}?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("TikTok Pixel script failed to load"));
  document.head.appendChild(script);
  return promise;
}

export function createTikTokPixelAdapter(options: TikTokPixelOptions): AnalyticsAdapter {
  let loadPromise: Promise<void> | undefined;

  return {
    id: "tiktok-pixel",
    async load() {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const ttq = window.ttq ?? createQueue();
      window.ttq = ttq;
      ttq.load(options.pixelId);
      loadPromise ??= loadScript(options.pixelId);
      await loadPromise;
    },
    track(event) {
      if (typeof window === "undefined") return;
      const ttq = window.ttq;
      if (!ttq) return;
      const item = event.items?.[0];
      ttq.track(EVENT_NAMES[event.name], {
        ...(item ? { content_id: item.id, content_type: "product", quantity: item.quantity ?? 1 } : {}),
        ...(event.value === undefined ? {} : { value: event.value }),
        ...(event.currency ? { currency: event.currency } : {}),
        event_id: event.id,
      });
    },
  };
}
