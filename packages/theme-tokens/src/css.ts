import { getThemeFont } from "./fonts.js";
import type { ResolvedThemeSettings } from "./schema.js";

function escapeCss(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("'", "\\'").replace(/[\r\n]/g, "");
}

function cssFamily(fontId: ResolvedThemeSettings["typography"]["display"]["font"]): string {
  const font = getThemeFont(fontId);
  const family = font.provider === "system" ? font.id === "system-serif" ? "Georgia" : "Arial" : font.name;
  return `"${escapeCss(family)}", ${font.fallback}`;
}

function addVariable(variables: Record<string, string>, name: string, value: unknown): void {
  variables[`--theme-${name}`] = escapeCss(String(value));
}

function selectedGoogleWeights(settings: ResolvedThemeSettings): Map<string, Set<number>> {
  const weightsByFont = new Map<string, Set<number>>();
  const add = (fontId: string, weight: number) => {
    const weights = weightsByFont.get(fontId) ?? new Set<number>();
    weights.add(weight);
    weightsByFont.set(fontId, weights);
  };
  const google = settings.typography.google;
  for (const weight of google.weights) add(google.family, weight);
  for (const role of ["display", "heading", "body", "ui"] as const) {
    const typography = settings.typography[role];
    const font = getThemeFont(typography.font);
    if (font.provider === "google") add(font.id, typography.weight);
  }
  return weightsByFont;
}

function emitFontBlocks(settings: ResolvedThemeSettings): string {
  if (settings.typography.google.delivery === "preview") {
    const imports: string[] = [];
    for (const [fontId, weights] of selectedGoogleWeights(settings)) {
      const font = getThemeFont(fontId as ResolvedThemeSettings["typography"]["display"]["font"]);
      if (font.provider !== "google") continue;
      const weightQuery = [...weights].sort((a, b) => a - b).join(";");
      const subsetQuery = settings.typography.google.subsets.join(",");
      const family = encodeURIComponent(font.googleFamily ?? font.name).replaceAll("%20", "+");
      imports.push(`@import url(\"https://fonts.googleapis.com/css2?family=${family}:wght@${weightQuery}&subset=${encodeURIComponent(subsetQuery)}\");`);
    }
    return imports.sort().join("\n") + (imports.length ? "\n\n" : "");
  }
  const blocks: string[] = [];
  for (const [fontId, weights] of selectedGoogleWeights(settings)) {
    const font = getThemeFont(fontId as ResolvedThemeSettings["typography"]["display"]["font"]);
    if (font.provider !== "google") continue;
    for (const weight of [...weights].sort((a, b) => a - b)) {
      blocks.push(`@font-face {\n  font-family: \"${escapeCss(font.name)}\";\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(\"/fonts/${escapeCss(font.id)}-${weight}.woff2\") format(\"woff2\");\n}`);
    }
  }
  return blocks.sort().join("\n\n") + (blocks.length ? "\n\n" : "");
}

export function emitThemeCss(settings: ResolvedThemeSettings): string {
  const variables: Record<string, string> = {};
  for (const [group, values] of Object.entries(settings.tokens)) {
    for (const [name, value] of Object.entries(values)) addVariable(variables, `${group}-${name}`, value);
  }
  for (const role of ["display", "heading", "body", "ui"] as const) {
    const typography = settings.typography[role];
    addVariable(variables, `font-${role}`, cssFamily(typography.font));
    addVariable(variables, `font-${role}-weight`, typography.weight);
    addVariable(variables, `font-${role}-style`, typography.style);
  }
  addVariable(variables, "type-scale", settings.typography.scale);
  addVariable(variables, "body-line-height", settings.typography.bodyLineHeight);
  addVariable(variables, "heading-tracking", settings.typography.headingTracking);
  for (const [name, value] of Object.entries(settings.motion)) addVariable(variables, `motion-${name}`, value);
  for (const [name, value] of Object.entries(settings.variants)) addVariable(variables, `variant-${name}`, value);
  const declarations = Object.entries(variables).sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => `  ${name}: ${value};`).join("\n");
  const motionRules = settings.motion.enabled ? "" : "\n  *, *::before, *::after {\n    animation: none !important;\n    transition: none !important;\n    transform: none !important;\n  }";
  return `${emitFontBlocks(settings)}:root {\n${declarations}\n}${motionRules}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n    transform: none !important;\n  }\n}\n`;
}
