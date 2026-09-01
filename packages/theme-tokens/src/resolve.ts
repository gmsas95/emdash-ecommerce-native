import { DEFAULT_THEME_SETTINGS } from "./defaults.js";
import { FONT_REGISTRY, getThemeFont } from "./fonts.js";
import {
  type FontId,
  type ResolvedThemeSettings,
  type ThemeChange,
  type ThemeTokenPatch,
  resolvedThemeSettingsSchema,
} from "./schema.js";

const tokenSections = new Set(["color", "layout", "shape", "elevation"]);
const topLevelSections = new Set(["typography", "motion", "variants"]);
const knownPaths = new Set([
  "typography.display.provider", "typography.display.font", "typography.display.weight", "typography.display.style",
  "typography.heading.provider", "typography.heading.font", "typography.heading.weight", "typography.heading.style",
  "typography.body.provider", "typography.body.font", "typography.body.weight", "typography.body.style",
  "typography.ui.provider", "typography.ui.font", "typography.ui.weight", "typography.ui.style",
  "typography.scale", "typography.bodyLineHeight", "typography.headingTracking",
  "typography.google.family", "typography.google.weights", "typography.google.subsets", "typography.google.delivery",
  "motion.enabled", "motion.intensity", "motion.hover", "motion.reveal", "motion.durationScale", "motion.easing",
  "variants.header", "variants.hero", "variants.button", "variants.card", "variants.footer",
]);
for (const section of tokenSections) {
  for (const property of section === "color"
    ? ["brand", "brandHover", "accent", "text", "muted", "surface", "surfaceAlt", "border", "success", "danger"]
    : section === "layout"
      ? ["contentWidth", "narrowWidth", "sectionSpacing", "gridGap", "componentSpacing"]
      : section === "shape"
        ? ["radiusSmall", "radiusMedium", "radiusLarge"]
        : ["card", "floating"]) knownPaths.add(`${section}.${property}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneSettings(settings: ResolvedThemeSettings): ResolvedThemeSettings {
  return structuredClone(settings);
}

function setNested(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split(".");
  let cursor = target;
  for (const segment of segments.slice(0, -1)) {
    const next = cursor[segment];
    if (!isRecord(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments.at(-1) as string] = value;
}

function getNested(target: Record<string, unknown>, path: string): unknown {
  let cursor: unknown = target;
  for (const segment of path.split(".")) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function patchPath(path: string): string {
  if (path.startsWith("tokens.")) return path.slice("tokens.".length);
  if (path.startsWith("typography.") || path.startsWith("motion.") || path.startsWith("variants.")) return path;
  if (path.includes(".")) return path;
  return path;
}

function flattenPersisted(value: Record<string, unknown>): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  const source = isRecord(value.theme) ? value.theme : value;
  const tokens = isRecord(source.tokens) ? source.tokens : {};
  for (const [key, tokenValue] of Object.entries(tokens)) {
    if (key.includes(".")) flattened[key] = tokenValue;
    else if (isRecord(tokenValue)) {
      for (const [property, nestedValue] of Object.entries(tokenValue)) flattened[`${key}.${property}`] = nestedValue;
    }
  }
  for (const section of ["typography", "motion", "variants"] as const) {
    const sectionValue = source[section];
    if (isRecord(sectionValue)) {
      const flattenSection = (prefix: string, record: Record<string, unknown>) => {
        for (const [key, nestedValue] of Object.entries(record)) {
          if (isRecord(nestedValue)) flattenSection(`${prefix}.${key}`, nestedValue);
          else flattened[`${prefix}.${key}`] = nestedValue;
        }
      };
      flattenSection(section, sectionValue);
    }
  }
  return flattened;
}

function validateFontSelections(settings: ResolvedThemeSettings): ResolvedThemeSettings {
  const normalized = cloneSettings(settings);
  const roles = ["display", "heading", "body", "ui"] as const;
  for (const role of roles) {
    const typographyRole = normalized.typography[role];
    const record = getThemeFont(typographyRole.font);
    if (!record.weights.includes(typographyRole.weight)) {
      throw new Error(`Weight ${typographyRole.weight} is not available for ${typographyRole.font}`);
    }
    typographyRole.provider = "registry";
  }
  const googleRecord = getThemeFont(normalized.typography.google.family);
  if (googleRecord.provider !== "google") throw new Error("Google family must be a Google font");
  if (normalized.typography.google.weights.some((weight) => !googleRecord.weights.includes(weight))) {
    throw new Error(`Unsupported Google font weight for ${googleRecord.id}`);
  }
  if (normalized.typography.google.subsets.some((subset) => !googleRecord.subsets.includes(subset))) {
    throw new Error(`Unsupported Google font subset for ${googleRecord.id}`);
  }
  normalized.typography.google.weights = [...new Set(normalized.typography.google.weights)].sort((a, b) => a - b);
  normalized.typography.google.subsets = [...new Set(normalized.typography.google.subsets)].sort();
  return normalized;
}

function validateSettings(settings: unknown): ResolvedThemeSettings {
  return validateFontSelections(resolvedThemeSettingsSchema.parse(settings));
}

export function resolveThemeSettings(raw: unknown): ResolvedThemeSettings {
  if (!isRecord(raw)) return cloneSettings(DEFAULT_THEME_SETTINGS);
  const patch = flattenPersisted(raw);
  try {
    return applyThemePatch(cloneSettings(DEFAULT_THEME_SETTINGS), patch).settings;
  } catch {
    return cloneSettings(DEFAULT_THEME_SETTINGS);
  }
}

export function applyThemePatch(current: ResolvedThemeSettings, patch: unknown): { settings: ResolvedThemeSettings; changes: ThemeChange[] } {
  const baseline = validateSettings(current);
  if (!isRecord(patch) || Object.keys(patch).length === 0) {
    if (!isRecord(patch)) throw new Error("Theme patch must be an object");
    return { settings: baseline, changes: [] };
  }
  const candidate = cloneSettings(baseline);
  const changes: ThemeChange[] = [];
  for (const [rawPath, value] of Object.entries(patch)) {
    const path = patchPath(rawPath);
    if (!knownPaths.has(path)) throw new Error(`Unknown theme token path: ${rawPath}`);
    const previous = getNested(candidate as unknown as Record<string, unknown>, path.startsWith("color.") || path.startsWith("layout.") || path.startsWith("shape.") || path.startsWith("elevation.") ? `tokens.${path}` : path);
    const targetPath = path.startsWith("color.") || path.startsWith("layout.") || path.startsWith("shape.") || path.startsWith("elevation.") ? `tokens.${path}` : path;
    setNested(candidate as unknown as Record<string, unknown>, targetPath, value);
    changes.push({ path: rawPath, previous, next: value });
  }
  return { settings: validateSettings(candidate), changes };
}

export { FONT_REGISTRY };
export type { FontId };
