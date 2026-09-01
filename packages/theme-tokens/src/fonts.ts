function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
import type { FontId, ThemeFontRecord } from "./schema.js";

const systemSansFallback = "Arial, Helvetica, sans-serif";
const systemSerifFallback = "Georgia, Times New Roman, serif";

const fontRegistry: readonly ThemeFontRecord[] = [
  {
    id: "system-sans", name: "System Sans", displayName: "System Sans", provider: "system", weights: [400, 500, 600, 700],
    italic: true, supportsItalic: true, variable: false, supportsVariable: false, subsets: ["latin"], license: "System font license",
    fallback: systemSansFallback, fallbackStack: systemSansFallback, deliveryModes: ["self-hosted"],
  },
  {
    id: "system-serif", name: "System Serif", displayName: "System Serif", provider: "system", weights: [400, 500, 600, 700],
    italic: true, supportsItalic: true, variable: false, supportsVariable: false, subsets: ["latin"], license: "System font license",
    fallback: systemSerifFallback, fallbackStack: systemSerifFallback, deliveryModes: ["self-hosted"],
  },
  {
    id: "inter", name: "Inter", displayName: "Inter", provider: "google", weights: [400, 500, 600, 700],
    italic: true, supportsItalic: true, variable: true, supportsVariable: true, subsets: ["latin", "latin-ext"], license: "SIL Open Font License 1.1",
    fallback: systemSansFallback, fallbackStack: systemSansFallback, deliveryModes: ["preview", "self-hosted"], googleFamily: "Inter",
  },
  {
    id: "plus-jakarta", name: "Plus Jakarta Sans", displayName: "Plus Jakarta Sans", provider: "google", weights: [400, 500, 600, 700, 800],
    italic: true, supportsItalic: true, variable: true, supportsVariable: true, subsets: ["latin", "latin-ext"], license: "SIL Open Font License 1.1",
    fallback: systemSansFallback, fallbackStack: systemSansFallback, deliveryModes: ["preview", "self-hosted"], googleFamily: "Plus Jakarta Sans",
  },
  {
    id: "source-sans", name: "Source Sans 3", displayName: "Source Sans 3", provider: "google", weights: [400, 500, 600, 700],
    italic: true, supportsItalic: true, variable: true, supportsVariable: true, subsets: ["latin", "latin-ext"], license: "SIL Open Font License 1.1",
    fallback: systemSansFallback, fallbackStack: systemSansFallback, deliveryModes: ["preview", "self-hosted"], googleFamily: "Source Sans 3",
  },
  {
    id: "source-serif", name: "Source Serif 4", displayName: "Source Serif 4", provider: "google", weights: [400, 600, 700],
    italic: true, supportsItalic: true, variable: true, supportsVariable: true, subsets: ["latin", "latin-ext"], license: "SIL Open Font License 1.1",
    fallback: systemSerifFallback, fallbackStack: systemSerifFallback, deliveryModes: ["preview", "self-hosted"], googleFamily: "Source Serif 4",
  },
  {
    id: "dm-sans", name: "DM Sans", displayName: "DM Sans", provider: "google", weights: [400, 500, 600, 700],
    italic: true, supportsItalic: true, variable: true, supportsVariable: true, subsets: ["latin", "latin-ext"], license: "SIL Open Font License 1.1",
    fallback: systemSansFallback, fallbackStack: systemSansFallback, deliveryModes: ["preview", "self-hosted"], googleFamily: "DM Sans",
  },
];

export const FONT_REGISTRY = deepFreeze(fontRegistry);
const fontById = new Map<FontId, ThemeFontRecord>(FONT_REGISTRY.map((font) => [font.id, font]));

export function getThemeFont(fontId: FontId): ThemeFontRecord {
  const font = fontById.get(fontId);
  if (!font) throw new Error(`Unknown theme font: ${fontId}`);
  return font;
}

export function listThemeFonts(query?: string): ThemeFontRecord[] {
  const normalizedQuery = query?.trim().toLocaleLowerCase();
  const matches = normalizedQuery
    ? FONT_REGISTRY.filter((font) => [font.id, font.name, font.displayName, font.googleFamily, font.provider].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)))
    : FONT_REGISTRY;
  return matches.map((font) => ({
    ...font,
    weights: [...font.weights],
    subsets: [...font.subsets],
    deliveryModes: [...font.deliveryModes],
  }));
}
