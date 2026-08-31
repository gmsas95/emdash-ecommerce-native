import { createConsentReader, type ConsentReader } from "./consent.js";
import { parseAnalyticsEvent } from "./types.js";
import type { AnalyticsAdapter, AnalyticsEvent } from "./types.js";

export type AnalyticsDispatcherOptions = {
  adapters: readonly AnalyticsAdapter[];
  consentRequired?: boolean;
  readConsent?: ConsentReader;
  onError?: (adapterId: string, error: unknown) => void;
};

export class AnalyticsDispatcher {
  private readonly adapters: readonly AnalyticsAdapter[];
  private readonly readConsent: ConsentReader;
  private readonly onError: (adapterId: string, error: unknown) => void;
  private readonly queued: AnalyticsEvent[] = [];
  private readonly seenEventIds = new Set<string>();
  private readonly readyAdapterIds = new Set<string>();
  private started = false;
  private consentGranted: boolean | undefined;

  constructor(options: AnalyticsDispatcherOptions) {
    this.adapters = options.adapters;
    this.readConsent = createConsentReader(options.consentRequired ?? true, options.readConsent);
    this.onError = options.onError ?? (() => undefined);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.setConsent(await this.readConsent());
  }

  async setConsent(granted: boolean): Promise<void> {
    this.consentGranted = granted;
    if (!granted) {
      this.queued.length = 0;
      return;
    }

    await this.loadAdapters();
    const queued = this.queued.splice(0);
    for (const event of queued) {
      this.dispatch(event);
    }
  }

  async track(input: unknown): Promise<boolean> {
    const event = parseAnalyticsEvent(input);
    if (this.consentGranted === false || this.seenEventIds.has(event.id)) return false;

    this.seenEventIds.add(event.id);
    if (!this.started || this.consentGranted === undefined) {
      this.queued.push(event);
      return true;
    }

    await this.loadAdapters();
    this.dispatch(event);
    return true;
  }
  flush(): void {
    for (const adapter of this.adapters) {
      if (!this.readyAdapterIds.has(adapter.id) || !adapter.flush) continue;
      try {
        adapter.flush();
      } catch (error) {
        this.onError(adapter.id, error);
      }
    }
  }

  get hasConsent(): boolean {
    return this.consentGranted === true;
  }

  get queuedCount(): number {
    return this.queued.length;
  }

  private async loadAdapters(): Promise<void> {
    for (const adapter of this.adapters) {
      if (this.readyAdapterIds.has(adapter.id)) continue;
      try {
        await adapter.load();
        this.readyAdapterIds.add(adapter.id);
      } catch (error) {
        this.onError(adapter.id, error);
      }
    }
  }

  private dispatch(event: AnalyticsEvent): void {
    for (const adapter of this.adapters) {
      if (!this.readyAdapterIds.has(adapter.id)) continue;
      try {
        adapter.track(event);
      } catch (error) {
        this.onError(adapter.id, error);
      }
    }
  }
}

export function createAnalyticsDispatcher(options: AnalyticsDispatcherOptions): AnalyticsDispatcher {
  return new AnalyticsDispatcher(options);
}
