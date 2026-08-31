import type { AnalyticsAdapter, AnalyticsEvent, AnalyticsEventName } from "@emdash-cms/analytics-core";

const GA4_SCRIPT = "https://www.googletagmanager.com/gtag/js";
const EVENT_NAMES: Record<AnalyticsEventName, string> = {
  page_view: "page_view",
  view_item: "view_item",
  search: "search",
  add_to_cart: "add_to_cart",
  remove_from_cart: "remove_from_cart",
  begin_checkout: "begin_checkout",
  purchase: "purchase",
  refund: "refund",
  lead: "generate_lead",
};

type Gtag = (command: "js" | "config" | "event", value: unknown, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
  }
}

export type GA4Options = {
  measurementId: string;
};

function createGtag(): Gtag {
  const dataLayer = (window.dataLayer ??= []);
  return ((command: "js" | "config" | "event", value: unknown, params?: Record<string, unknown>) => {
    dataLayer.push([command, value, ...(params ? [params] : [])]);
  });
}

function loadScript(measurementId: string): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const script = document.createElement("script");
  script.async = true;
  script.src = `${GA4_SCRIPT}?id=${encodeURIComponent(measurementId)}`;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("GA4 script failed to load"));
  document.head.appendChild(script);
  return promise;
}

export function createGA4Adapter(options: GA4Options): AnalyticsAdapter {
  let loadPromise: Promise<void> | undefined;

  return {
    id: "ga4",
    async load() {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const gtag = window.gtag ?? createGtag();
      window.gtag = gtag;
      gtag("js", new Date());
      gtag("config", options.measurementId, { send_page_view: false });
      loadPromise ??= loadScript(options.measurementId);
      await loadPromise;
    },
    track(event) {
      if (typeof window === "undefined") return;
      const gtag = window.gtag;
      if (!gtag) return;
      const items = event.items?.map((item) => ({
        item_id: item.id,
        ...(item.name ? { item_name: item.name } : {}),
        ...(item.quantity === undefined ? {} : { quantity: item.quantity }),
        ...(item.value === undefined ? {} : { price: item.value }),
      }));
      gtag("event", EVENT_NAMES[event.name], {
        ...(event.value === undefined ? {} : { value: event.value }),
        ...(event.currency ? { currency: event.currency } : {}),
        ...(items && items.length > 0 ? { items } : {}),
        event_id: event.id,
        ...(event.page?.path ? { page_location: event.page.path } : {}),
      });
    },
  };
}
