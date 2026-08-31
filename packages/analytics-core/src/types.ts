import { z } from "zod";

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "view_item",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "purchase",
  "refund",
  "lead",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsScalar = string | number | boolean | null;

export type AnalyticsItem = {
  id: string;
  name?: string;
  quantity?: number;
  value?: number;
  currency?: string;
};

export type AnalyticsPageContext = {
  url?: string;
  path?: string;
  title?: string;
  referrer?: string;
};

export type AnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  occurredAt: string;
  source: "client" | "server";
  currency?: string;
  value?: number;
  items?: AnalyticsItem[];
  page?: AnalyticsPageContext;
  properties?: Record<string, AnalyticsScalar>;
};

export type AnalyticsAdapter = {
  id: string;
  load(): Promise<void>;
  track(event: AnalyticsEvent): void;
  flush?(): void;
};

export type AnalyticsConsent = {
  required: boolean;
  granted: boolean;
};

const scalarSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

export const analyticsEventSchema = z
  .object({
    id: z.string().min(1).max(200),
    name: z.enum(ANALYTICS_EVENT_NAMES),
    occurredAt: z.string().datetime(),
    source: z.enum(["client", "server"]),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    value: z.number().finite().nonnegative().optional(),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(200),
            name: z.string().max(500).optional(),
            quantity: z.number().int().positive().optional(),
            value: z.number().finite().nonnegative().optional(),
            currency: z.string().regex(/^[A-Z]{3}$/).optional(),
          })
          .strict(),
      )
      .max(100)
      .optional(),
    page: z
      .object({
        url: z.string().url().max(2_000).optional(),
        path: z.string().max(2_000).optional(),
        title: z.string().max(500).optional(),
        referrer: z.string().url().max(2_000).optional(),
      })
      .strict()
      .optional(),
    properties: z.record(z.string(), scalarSchema).optional(),
  })
  .strict()
  .superRefine((event, context) => {
    if ((event.name === "purchase" || event.name === "refund") && event.source !== "server") {
      context.addIssue({
        code: "custom",
        path: ["source"],
        message: `${event.name} events must come from server-confirmed Commerce state`,
      });
    }
    for (const key of Object.keys(event.properties ?? {})) {
      if (/password|secret|token|credential|card|address|phone|email/i.test(key)) {
        context.addIssue({
          code: "custom",
          path: ["properties", key],
          message: `Sensitive analytics property is not allowed: ${key}`,
        });
      }
    }
  });

export function parseAnalyticsEvent(input: unknown): AnalyticsEvent {
  return analyticsEventSchema.parse(input) as AnalyticsEvent;
}
