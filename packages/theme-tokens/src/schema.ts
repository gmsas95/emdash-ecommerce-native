import { z } from "zod";

export const THEME_VERSION = 1 as const;
export const FONT_IDS = ["system-sans", "system-serif", "inter", "plus-jakarta", "source-sans", "source-serif", "dm-sans"] as const;
export type FontId = (typeof FONT_IDS)[number];
export const FONT_PROVIDERS = ["system", "google"] as const;
export const TYPOGRAPHY_PROVIDERS = ["registry"] as const;
export const GOOGLE_DELIVERY_MODES = ["preview", "self-hosted"] as const;
export const FONT_SUBSETS = ["latin", "latin-ext"] as const;

function isCssColor(value: string): boolean {
  if (/^#(?:[\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test(value)) return true;
  const match = /^(rgb|rgba|hsl|hsla)\(\s*(.*?)\s*\)$/.exec(value);
  if (!match) return false;
  const body = match[2] ?? "";
  const kind = match[1] ?? "";
  const channels = body.split(",").map((channel) => channel.trim());
  const first = channels[0] ?? "";
  const second = channels[1] ?? "";
  const third = channels[2] ?? "";
  const fourth = channels[3];
  const isNumber = (channel: string, min: number, max: number) => {
    const amount = Number(channel);
    return channel.length > 0 && Number.isFinite(amount) && amount >= min && amount <= max;
  };
  if (kind.startsWith("rgb")) {
    if (channels.length !== (kind === "rgba" ? 4 : 3)) return false;
    const validChannels = channels.slice(0, 3).every((channel) => channel.endsWith("%") ? isNumber(channel.slice(0, -1), 0, 100) : isNumber(channel, 0, 255));
    const validAlpha = fourth === undefined ? true : fourth.endsWith("%") ? isNumber(fourth.slice(0, -1), 0, 100) : isNumber(fourth, 0, 1);
    return validChannels && validAlpha;
  }
  if (channels.length !== (kind === "hsla" ? 4 : 3)) return false;
  const hue = first.replace(/deg$/, "");
  const validAlpha = fourth === undefined ? true : fourth.endsWith("%") ? isNumber(fourth.slice(0, -1), 0, 100) : isNumber(fourth, 0, 1);
  return isNumber(hue, 0, 360) && /^\d+(?:\.\d+)?%$/.test(second) && /^\d+(?:\.\d+)?%$/.test(third)
    && isNumber(second.slice(0, -1), 0, 100) && isNumber(third.slice(0, -1), 0, 100)
    && validAlpha;
}
const cssLengthPattern = /^\d+(?:\.\d+)?(?:px|rem|em)$/;
export const cssColorSchema = z.string().refine(isCssColor, "Expected a valid hex, rgb(), or hsl() color");
export const cssLengthSchema = (min: number, max: number) => z.string().refine((value) => {
  const match = cssLengthPattern.exec(value);
  if (!match) return false;
  const amount = Number.parseFloat(value);
  return amount >= min && amount <= max;
}, `Expected a CSS length between ${min} and ${max}`);
export const shadowSchema = z.enum(["none", "0 5px 16px rgba(32,41,52,0.06)", "0 16px 40px rgba(32,41,52,0.12)"]);

const tokenSchema = z.object({
  color: z.object({
    brand: cssColorSchema, brandHover: cssColorSchema, accent: cssColorSchema, text: cssColorSchema, muted: cssColorSchema,
    surface: cssColorSchema, surfaceAlt: cssColorSchema, border: cssColorSchema, success: cssColorSchema, danger: cssColorSchema,
  }).strict(),
  layout: z.object({
    contentWidth: cssLengthSchema(320, 2400), narrowWidth: cssLengthSchema(240, 1400), sectionSpacing: cssLengthSchema(0, 240),
    gridGap: cssLengthSchema(0, 96), componentSpacing: cssLengthSchema(0, 96),
  }).strict(),
  shape: z.object({ radiusSmall: cssLengthSchema(0, 64), radiusMedium: cssLengthSchema(0, 64), radiusLarge: cssLengthSchema(0, 96) }).strict(),
  elevation: z.object({ card: shadowSchema, floating: shadowSchema }).strict(),
}).strict();

export const typographyRoleSchema = z.object({
  provider: z.enum(TYPOGRAPHY_PROVIDERS), font: z.enum(FONT_IDS), weight: z.number().int().min(100).max(900), style: z.enum(["normal", "italic"]).default("normal"),
}).strict();
export const typographySchema = z.object({
  display: typographyRoleSchema, heading: typographyRoleSchema, body: typographyRoleSchema, ui: typographyRoleSchema,
  scale: z.enum(["compact", "comfortable", "spacious"]), bodyLineHeight: z.string().regex(/^\d(?:\.\d{1,2})?$/),
  headingTracking: z.string().regex(/^-?(?:0|0?\.\d{1,2})em$/),
  google: z.object({ family: z.enum(FONT_IDS), weights: z.array(z.number().int().min(100).max(900)).min(1).max(8), subsets: z.array(z.enum(FONT_SUBSETS)).min(1).max(2), delivery: z.enum(GOOGLE_DELIVERY_MODES) }).strict(),
}).strict();
export const motionSchema = z.object({
  enabled: z.boolean(), intensity: z.enum(["none", "subtle", "expressive"]), hover: z.enum(["none", "lift", "soft-scale"]), reveal: z.enum(["none", "fade", "fade-up"]),
  durationScale: z.enum(["instant", "fast", "standard", "slow"]), easing: z.enum(["standard", "snappy", "smooth"]),
}).strict();
export const variantsSchema = z.object({
  header: z.enum(["standard", "compact"]), hero: z.enum(["split", "centered", "minimal"]), button: z.enum(["solid", "outline", "soft"]),
  card: z.enum(["elevated", "flat", "bordered"]), footer: z.enum(["standard", "minimal"]),
}).strict();
export const themeSettingsSchema = z.object({ version: z.literal(THEME_VERSION), tokens: tokenSchema, typography: typographySchema, motion: motionSchema, variants: variantsSchema }).strict();
export const resolvedThemeSettingsSchema = themeSettingsSchema;
export const themeTokenPatchSchema = z.record(z.string(), z.unknown());
export const themeOperationSchema = z.enum(["theme.settings.get", "theme.settings.update", "theme.settings.reset", "theme.fonts.list", "theme.motion.get", "theme.variants.list"]);
export const themeChangeSchema = z.object({ path: z.string(), previous: z.unknown(), next: z.unknown() }).strict();

export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export type ResolvedThemeSettings = z.infer<typeof resolvedThemeSettingsSchema>;
export type ThemeTokenPatch = z.infer<typeof themeTokenPatchSchema>;
export const themeFontRecordSchema = z.object({
  id: z.enum(FONT_IDS),
  name: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.enum(FONT_PROVIDERS),
  weights: z.array(z.number().int().min(100).max(900)).min(1).readonly(),
  italic: z.boolean(),
  supportsItalic: z.boolean(),
  variable: z.boolean(),
  supportsVariable: z.boolean(),
  subsets: z.array(z.enum(FONT_SUBSETS)).min(1).max(2).readonly(),
  license: z.string().min(1),
  fallback: z.string().min(1),
  fallbackStack: z.string().min(1),
  deliveryModes: z.array(z.enum(GOOGLE_DELIVERY_MODES)).min(1).max(2).readonly(),
  googleFamily: z.string().min(1).optional(),
}).strict();
export type ThemeFontRecord = z.infer<typeof themeFontRecordSchema>;
export type ThemeChange = z.infer<typeof themeChangeSchema>;
export type ThemeOperation = z.infer<typeof themeOperationSchema>;
export type ThemeTokenSchema = typeof tokenSchema;
export { tokenSchema };
