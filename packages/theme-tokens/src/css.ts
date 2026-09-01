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

  const declarations = Object.entries(variables)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  const googleFont = getThemeFont(settings.typography.google.family);
  const fontQuery = settings.typography.google.weights.join(";");
  const subsetQuery = settings.typography.google.subsets.join(",");
  const fontBlock = googleFont.provider === "google" && settings.typography.google.delivery === "preview"
    ? `@import url(\"https://fonts.googleapis.com/css2?family=${encodeURIComponent(googleFont.googleFamily ?? googleFont.name).replaceAll("%20", "+")}:wght@${fontQuery}&subset=${encodeURIComponent(subsetQuery)}\");\n\n`
    : googleFont.provider === "google"
      ? `@font-face {\n  font-family: \"${escapeCss(googleFont.name)}\";\n  font-style: normal;\n  font-weight: ${fontQuery.replaceAll(";", " ")};\n  font-display: swap;\n  src: url(\"/fonts/${escapeCss(googleFont.id)}.woff2\") format(\"woff2\");\n}\n\n`
      : "";
  const motionRules = settings.motion.enabled
    ? ""
    : "\n  *, *::before, *::after {\n    animation: none !important;\n    transition: none !important;\n    transform: none !important;\n  }";
  return `${fontBlock}:root {\n${declarations}\n}${motionRules}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n    transform: none !important;\n  }\n}\n`;
}
