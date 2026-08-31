import {
  AnalyticsDispatcher,
  createAnalyticsDispatcher,
  type AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsScalar,
} from "@emdash-cms/analytics-core/runtime";
import { createFacebookPixelAdapter } from "@emdash-cms/analytics-facebook";
import { createGA4Adapter } from "@emdash-cms/analytics-ga4";
import { createTikTokPixelAdapter } from "@emdash-cms/analytics-tiktok";

export type BrowserAnalyticsConfig = {
  facebookPixelId?: string;
  tikTokPixelId?: string;
  ga4MeasurementId?: string;
  consentRequired: boolean;
  environment: "development" | "staging" | "production";
  debug: boolean;
  dataSharing: boolean;
};

type AnalyticsEventInput = Omit<AnalyticsEvent, "id" | "occurredAt"> & {
  id?: string;
  occurredAt?: string;
};

type ConsentDetail = { granted?: boolean };

declare global {
  interface Window {
    __emdashAnalyticsConfig?: BrowserAnalyticsConfig;
  }
}
let dispatcher: AnalyticsDispatcher | undefined;

function eventId(): string {
  return globalThis.crypto.randomUUID();
}

export function emitAnalytics(input: AnalyticsEventInput): void {
  if (typeof window === "undefined") return;
  const detail: AnalyticsEvent = {
    ...input,
    id: input.id ?? eventId(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent<AnalyticsEvent>("emdash:analytics", { detail }));
}

function storedConsent(): boolean {
  try {
    return window.localStorage.getItem("emdash-analytics-consent") === "granted";
  } catch {
    return false;
  }
}

function saveConsent(granted: boolean): void {
  try {
    window.localStorage.setItem("emdash-analytics-consent", granted ? "granted" : "denied");
  } catch {
    // Storage may be unavailable; the in-memory dispatcher still honors this decision.
  }
}

export function initAnalytics(): void {
  if (typeof window === "undefined" || dispatcher) return;
  const config = window.__emdashAnalyticsConfig;
  if (!config) return;

  const adapters = [
    ...(config.facebookPixelId ? [createFacebookPixelAdapter({ pixelId: config.facebookPixelId })] : []),
    ...(config.tikTokPixelId ? [createTikTokPixelAdapter({ pixelId: config.tikTokPixelId })] : []),
    ...(config.ga4MeasurementId ? [createGA4Adapter({ measurementId: config.ga4MeasurementId })] : []),
  ];
  if (adapters.length === 0) return;

  dispatcher = createAnalyticsDispatcher({
    adapters,
    consentRequired: config.consentRequired,
    readConsent: storedConsent,
    onError: (adapterId, error) => {
      if (config.debug) console.warn(`[EmDash analytics] ${adapterId} failed`, error);
    },
  });

  window.addEventListener("emdash:analytics", (event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    void dispatcher?.track(detail).catch((error) => {
      if (config.debug) console.warn("[EmDash analytics] invalid event", error);
    });
  });
  window.addEventListener("emdash:consent", (event) => {
    const detail = (event as CustomEvent<ConsentDetail>).detail;
    if (typeof detail?.granted !== "boolean") return;
    saveConsent(detail.granted);
    void dispatcher?.setConsent(detail.granted);
  });
  void dispatcher.start();
}

export type { AnalyticsEventName, AnalyticsScalar };
