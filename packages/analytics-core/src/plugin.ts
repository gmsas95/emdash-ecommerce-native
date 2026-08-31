import { definePlugin } from "emdash";
import type { PluginDescriptor, ResolvedPlugin } from "emdash";

import type { AnalyticsAdapter, AnalyticsEvent } from "./types.js";

const PLUGIN_ID = "emdash-analytics";
const PLUGIN_VERSION = "0.1.0";

export type AnalyticsPluginOptions = {
  enabled?: boolean;
  consentRequired?: boolean;
  environment?: "development" | "staging" | "production";
};

export type AnalyticsPluginDescriptorOptions = AnalyticsPluginOptions;

export type AnalyticsRuntimeConfig = {
  facebookPixelId?: string;
  tikTokPixelId?: string;
  ga4MeasurementId?: string;
  consentRequired: boolean;
  environment: "development" | "staging" | "production";
  debug: boolean;
  dataSharing: boolean;
};

function inlineConfig(config: AnalyticsRuntimeConfig): string {
  const serialized = JSON.stringify(config).replace(/</g, "\\u003c");
  return `window.__emdashAnalyticsConfig=${serialized};`;
}

async function readRuntimeConfig(ctx: { kv: { get<T>(key: string): Promise<T | null> } }): Promise<AnalyticsRuntimeConfig> {
  const [facebookPixelId, tikTokPixelId, ga4MeasurementId, consentRequired, environment, debug, dataSharing] = await Promise.all([
    ctx.kv.get<string>("settings:facebookPixelId"),
    ctx.kv.get<string>("settings:tiktokPixelId"),
    ctx.kv.get<string>("settings:ga4MeasurementId"),
    ctx.kv.get<boolean>("settings:consentRequired"),
    ctx.kv.get<AnalyticsRuntimeConfig["environment"]>("settings:environment"),
    ctx.kv.get<boolean>("settings:debug"),
    ctx.kv.get<boolean>("settings:dataSharing"),
  ]);

  return {
    ...(facebookPixelId ? { facebookPixelId } : {}),
    ...(tikTokPixelId ? { tikTokPixelId } : {}),
    ...(ga4MeasurementId ? { ga4MeasurementId } : {}),
    consentRequired: consentRequired ?? true,
    environment: environment ?? "production",
    debug: debug ?? false,
    dataSharing: dataSharing ?? false,
  };
}

export function analyticsPlugin(
  options: AnalyticsPluginDescriptorOptions = {},
): PluginDescriptor<AnalyticsPluginDescriptorOptions> {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoint: "@emdash-cms/analytics-core",
    options,
    capabilities: ["hooks.page-fragments:register"],
  };
}

export function createAnalyticsPlugin(options: AnalyticsPluginOptions = {}): ResolvedPlugin {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: ["hooks.page-fragments:register"],
    hooks: {
      "page:fragments": {
        errorPolicy: "continue",
        handler: async (_event, ctx) => {
          const config = await readRuntimeConfig(ctx);
          if (!config.facebookPixelId && !config.tikTokPixelId && !config.ga4MeasurementId) return null;
          return {
            kind: "inline-script",
            placement: "head",
            code: inlineConfig({
              ...config,
              ...(options.consentRequired === undefined ? {} : { consentRequired: options.consentRequired }),
              ...(options.environment === undefined ? {} : { environment: options.environment }),
            }),
            key: "emdash-analytics-config",
          };
        },
      },
    },
    admin: {
      settingsSchema: {
        facebookPixelId: { type: "string", label: "Facebook Pixel ID" },
        tiktokPixelId: { type: "string", label: "TikTok Pixel ID" },
        ga4MeasurementId: { type: "string", label: "GA4 Measurement ID" },
        consentRequired: { type: "boolean", label: "Require analytics consent", default: true },
        environment: {
          type: "select",
          label: "Environment",
          options: [
            { value: "development", label: "Development" },
            { value: "staging", label: "Staging" },
            { value: "production", label: "Production" },
          ],
          default: "production",
        },
        debug: { type: "boolean", label: "Debug mode", default: false },
        dataSharing: { type: "boolean", label: "Allow data sharing", default: false },
      },
    },
  });
}

export type { AnalyticsAdapter, AnalyticsEvent };
