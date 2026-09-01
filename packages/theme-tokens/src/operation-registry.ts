import { z } from "zod";

import { FONT_REGISTRY, listThemeFonts } from "./fonts.js";
import {
  FONT_IDS,
  FONT_SUBSETS,
  GOOGLE_DELIVERY_MODES,
  motionSchema,
  resolvedThemeSettingsSchema,
  themeChangeSchema,
  themeFontRecordSchema,
  themeOperationSchema,
  themeTokenPatchSchema,
  variantsSchema,
} from "./schema.js";
import type { ResolvedThemeSettings, ThemeChange, ThemeOperation } from "./schema.js";

export const themeSearchInputSchema = z.object({
  query: z.string().max(200),
  area: z.enum(["tokens", "typography", "motion", "variants"]).optional(),
}).strict();
export const themeExecuteInputSchema = z.object({ operation: z.string().min(1), input: z.unknown() }).strict();
const emptyInputSchema = z.object({}).strict();
const updateInputSchema = z.object({ patch: themeTokenPatchSchema }).strict();

export type ThemeSearchInput = z.infer<typeof themeSearchInputSchema>;
export type ThemeExecuteInput = z.infer<typeof themeExecuteInputSchema>;
export type ThemeOperationArea = NonNullable<ThemeSearchInput["area"]>;
const GOOGLE_FONT_IDS = FONT_REGISTRY.filter((font) => font.provider === "google").map((font) => font.id);
const fontMetadata = listThemeFonts().map(({ id, displayName, provider, weights, subsets, deliveryModes }) => ({ id, displayName, provider, weights, subsets, deliveryModes }));
export function compatibleGoogleFontWeights(fontId: (typeof FONT_IDS)[number], currentWeights: readonly number[]): number[] {
  const record = FONT_REGISTRY.find((font) => font.id === fontId && font.provider === "google");
  if (!record) return [];
  const compatible = currentWeights.filter((weight) => record.weights.includes(weight));
  return compatible.length > 0 ? compatible : [record.weights[0] ?? 400];
}
const updatePaths = {
  "color.brand": { type: "string", description: "CSS color" },
  "color.brandHover": { type: "string", description: "CSS color" },
  "color.accent": { type: "string", description: "CSS color" },
  "color.text": { type: "string", description: "CSS color" },
  "color.muted": { type: "string", description: "CSS color" },
  "color.surface": { type: "string", description: "CSS color" },
  "color.surfaceAlt": { type: "string", description: "CSS color" },
  "color.border": { type: "string", description: "CSS color" },
  "color.success": { type: "string", description: "CSS color" },
  "color.danger": { type: "string", description: "CSS color" },
  "layout.contentWidth": { type: "string", min: "320px", max: "2400px" },
  "layout.narrowWidth": { type: "string", min: "240px", max: "1400px" },
  "layout.sectionSpacing": { type: "string", min: "0px", max: "240px" },
  "layout.gridGap": { type: "string", min: "0px", max: "96px" },
  "layout.componentSpacing": { type: "string", min: "0px", max: "96px" },
  "shape.radiusSmall": { type: "string", min: "0px", max: "64px" },
  "shape.radiusMedium": { type: "string", min: "0px", max: "64px" },
  "shape.radiusLarge": { type: "string", min: "0px", max: "96px" },
  "elevation.card": { type: "string", enum: ["none", "0 5px 16px rgba(32,41,52,0.06)", "0 16px 40px rgba(32,41,52,0.12)"] },
  "elevation.floating": { type: "string", enum: ["none", "0 5px 16px rgba(32,41,52,0.06)", "0 16px 40px rgba(32,41,52,0.12)"] },
  "typography.display.provider": { type: "string", enum: ["registry"] },
  "typography.display.font": { type: "string", enum: [...FONT_IDS] },
  "typography.display.weight": { type: "integer", min: 100, max: 900 },
  "typography.display.style": { type: "string", enum: ["normal", "italic"] },
  "typography.heading.provider": { type: "string", enum: ["registry"] },
  "typography.heading.font": { type: "string", enum: [...FONT_IDS] },
  "typography.heading.weight": { type: "integer", min: 100, max: 900 },
  "typography.heading.style": { type: "string", enum: ["normal", "italic"] },
  "typography.body.provider": { type: "string", enum: ["registry"] },
  "typography.body.font": { type: "string", enum: [...FONT_IDS] },
  "typography.body.weight": { type: "integer", min: 100, max: 900 },
  "typography.body.style": { type: "string", enum: ["normal", "italic"] },
  "typography.ui.provider": { type: "string", enum: ["registry"] },
  "typography.ui.font": { type: "string", enum: [...FONT_IDS] },
  "typography.ui.weight": { type: "integer", min: 100, max: 900 },
  "typography.ui.style": { type: "string", enum: ["normal", "italic"] },
  "typography.scale": { type: "string", enum: ["compact", "comfortable", "spacious"] },
  "typography.bodyLineHeight": { type: "string", pattern: "^\\d(?:\\.\\d{1,2})?$" },
  "typography.headingTracking": { type: "string", pattern: "^-?(?:0|0?\\.\\d{1,2})em$" },
  "typography.google.family": { type: "string", enum: GOOGLE_FONT_IDS },
  "typography.google.weights": { type: "array", items: { type: "integer", min: 100, max: 900 }, minItems: 1, maxItems: 8 },
  "typography.google.subsets": { type: "array", items: { type: "string", enum: [...FONT_SUBSETS] }, minItems: 1, maxItems: 2 },
  "typography.google.delivery": { type: "string", enum: [...GOOGLE_DELIVERY_MODES] },
  "motion.enabled": { type: "boolean" },
  "motion.intensity": { type: "string", enum: ["none", "subtle", "expressive"] },
  "motion.hover": { type: "string", enum: ["none", "lift", "soft-scale"] },
  "motion.reveal": { type: "string", enum: ["none", "fade", "fade-up"] },
  "motion.durationScale": { type: "string", enum: ["instant", "fast", "standard", "slow"] },
  "motion.easing": { type: "string", enum: ["standard", "snappy", "smooth"] },
  "variants.header": { type: "string", enum: ["standard", "compact"] },
  "variants.hero": { type: "string", enum: ["split", "centered", "minimal"] },
  "variants.button": { type: "string", enum: ["solid", "outline", "soft"] },
  "variants.card": { type: "string", enum: ["elevated", "flat", "bordered"] },
  "variants.footer": { type: "string", enum: ["standard", "minimal"] },
} as const satisfies Record<string, Record<string, unknown>>;

export interface ThemeOperationDescription {
  id: ThemeOperation;
  area: ThemeOperationArea;
  description: string;
  inputSchema: Record<string, unknown>;
  destructive: boolean;
  keywords: readonly string[];
}

const updateInputMetadata = {
  type: "object",
  properties: { patch: { type: "object", properties: updatePaths, additionalProperties: false, minProperties: 1 } }, fontMetadata,
  required: ["patch"],
  additionalProperties: false,
} as const satisfies Record<string, unknown>;

const OPERATION_DESCRIPTIONS: readonly ThemeOperationDescription[] = [
  { id: "theme.settings.get", area: "tokens", description: "Read normalized versioned theme settings.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, destructive: false, keywords: ["settings", "theme", "tokens", "read", "get"] },
  { id: "theme.settings.update", area: "tokens", description: "Apply validated changes to approved theme settings.", inputSchema: updateInputMetadata, destructive: true, keywords: ["settings", "theme", "tokens", "color", "typography", "heading", "font", "layout", "shape", "elevation", "motion", "subtle", "product", "variant", "update", "change"] },
  { id: "theme.settings.reset", area: "tokens", description: "Restore all theme settings to approved defaults.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, destructive: true, keywords: ["settings", "theme", "reset", "defaults"] },
  { id: "theme.fonts.list", area: "typography", description: "List approved font families, weights, subsets, and delivery modes.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, destructive: false, keywords: ["fonts", "font", "typography", "google", "family", "weights", "subsets"] },
  { id: "theme.motion.get", area: "motion", description: "Read normalized motion settings.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, destructive: false, keywords: ["motion", "animation", "hover", "reveal", "duration", "easing"] },
  { id: "theme.variants.list", area: "variants", description: "List approved component variant values.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, destructive: false, keywords: ["variants", "variant", "header", "hero", "button", "card", "footer"] },
];
export const THEME_OPERATION_REGISTRY = OPERATION_DESCRIPTIONS;
export const themeOperationRegistry = THEME_OPERATION_REGISTRY;

const searchOperationSchema = z.object({ id: themeOperationSchema, area: z.enum(["tokens", "typography", "motion", "variants"]), description: z.string(), inputSchema: z.record(z.string(), z.unknown()), destructive: z.boolean() }).strict();
export const themeSearchOutputSchema = z.object({ operations: z.array(searchOperationSchema) }).strict();
const outputChangeSchema = themeChangeSchema.extend({ value: z.unknown() });
const baseOutput = { changes: z.array(outputChangeSchema) };
export const themeExecuteOutputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("theme.settings.get"), settings: resolvedThemeSettingsSchema, ...baseOutput }).strict(),
  z.object({ operation: z.literal("theme.settings.update"), settings: resolvedThemeSettingsSchema, ...baseOutput }).strict(),
  z.object({ operation: z.literal("theme.settings.reset"), settings: resolvedThemeSettingsSchema, ...baseOutput }).strict(),
  z.object({ operation: z.literal("theme.fonts.list"), fonts: z.array(themeFontRecordSchema), ...baseOutput }).strict(),
  z.object({ operation: z.literal("theme.motion.get"), motion: motionSchema, ...baseOutput }).strict(),
  z.object({ operation: z.literal("theme.variants.list"), variants: variantsSchema, ...baseOutput }).strict(),
]);

export type ThemeSearchOutput = z.infer<typeof themeSearchOutputSchema>;
export type ThemeExecuteOutput = z.infer<typeof themeExecuteOutputSchema>;
export type ThemeOutputChange = z.infer<typeof outputChangeSchema>;
export type ThemeExecuteOperation = ThemeExecuteOutput["operation"];
export type ThemeOperationInput = Record<ThemeOperation, z.infer<typeof emptyInputSchema> | z.infer<typeof updateInputSchema>>;
export { emptyInputSchema, updateInputSchema, listThemeFonts };
export type { ResolvedThemeSettings, ThemeChange };
