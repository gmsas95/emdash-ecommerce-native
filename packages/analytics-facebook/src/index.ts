import type { AnalyticsAdapter, AnalyticsEvent, AnalyticsEventName } from "@emdash-cms/analytics-core";

const FACEBOOK_SCRIPT = "https://connect.facebook.net/en_US/fbevents.js";
const EVENT_NAMES: Record<AnalyticsEventName, string> = {
  page_view: "PageView",
  view_item: "ViewContent",
  search: "Search",
  add_to_cart: "AddToCart",
  remove_from_cart: "RemoveFromCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  refund: "Refund",
  lead: "Lead",
};

type FacebookQueue = ((command: string, ...args: unknown[]) => void) & {
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FacebookQueue;
  }
}

export type FacebookPixelOptions = {
  pixelId: string;
};

function createQueue(): FacebookQueue {
  const queue = ((command: string, ...args: unknown[]) => {
    queue.queue?.push([command, ...args]);
  }) as FacebookQueue;
  queue.queue = [];
  queue.loaded = true;
  queue.version = "2.0";
  return queue;
}

function loadScript(): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const script = document.createElement("script");
  script.async = true;
  script.src = FACEBOOK_SCRIPT;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Facebook Pixel script failed to load"));
  document.head.appendChild(script);
  return promise;
}

export function createFacebookPixelAdapter(options: FacebookPixelOptions): AnalyticsAdapter {
  let loadPromise: Promise<void> | undefined;

  return {
    id: "facebook-pixel",
    async load() {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      if (window.fbq) {
        window.fbq("init", options.pixelId);
        return;
      }
      const fbq = createQueue();
      window.fbq = fbq;
      loadPromise ??= loadScript();
      await loadPromise;
      fbq("init", options.pixelId);
    },
    track(event) {
      if (typeof window === "undefined") return;
      const fbq = window.fbq;
      if (!fbq) return;
      const items = event.items ?? [];
      const contentIds = items.map((item) => item.id);
      const payload = {
        ...(contentIds.length > 0 ? { content_ids: contentIds } : {}),
        ...(items[0]?.name ? { content_name: items[0].name } : {}),
        ...(event.value === undefined ? {} : { value: event.value }),
        ...(event.currency ? { currency: event.currency } : {}),
        ...(items.length > 0 ? { num_items: items.reduce((sum, item) => sum + (item.quantity ?? 1), 0) } : {}),
        eventID: event.id,
      };
      fbq("track", EVENT_NAMES[event.name], payload);
    },
  };
}
