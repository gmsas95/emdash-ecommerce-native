function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
import type { ResolvedThemeSettings } from "./schema.js";

const defaultThemeSettings: ResolvedThemeSettings = {
  version: 1,
  tokens: {
    color: {
      brand: "#176b59",
      brandHover: "#0e5143",
      accent: "#f2b84b",
      text: "#202934",
      muted: "#68737f",
      surface: "#ffffff",
      surfaceAlt: "#f7f8fa",
      border: "#e4e8ec",
      success: "#25855a",
      danger: "#b63d3d",
    },
    layout: {
      contentWidth: "1180px",
      narrowWidth: "720px",
      sectionSpacing: "72px",
      gridGap: "16px",
      componentSpacing: "24px",
    },
    shape: {
      radiusSmall: "8px",
      radiusMedium: "12px",
      radiusLarge: "16px",
    },
    elevation: {
      card: "0 5px 16px rgba(32,41,52,0.06)",
      floating: "0 16px 40px rgba(32,41,52,0.12)",
    },
  },
  typography: {
    display: { provider: "registry", font: "plus-jakarta", weight: 800, style: "normal" },
    heading: { provider: "registry", font: "plus-jakarta", weight: 700, style: "normal" },
    body: { provider: "registry", font: "system-sans", weight: 400, style: "normal" },
    ui: { provider: "registry", font: "system-sans", weight: 600, style: "normal" },
    scale: "comfortable",
    bodyLineHeight: "1.65",
    headingTracking: "-0.04em",
    google: {
      family: "plus-jakarta",
      weights: [400, 500, 600, 700, 800],
      subsets: ["latin"],
      delivery: "self-hosted",
    },
  },
  motion: {
    enabled: true,
    intensity: "subtle",
    hover: "lift",
    reveal: "fade",
    durationScale: "standard",
    easing: "standard",
  },
  variants: {
    header: "standard",
    hero: "split",
    button: "solid",
    card: "elevated",
    footer: "standard",
  },
};

export const DEFAULT_THEME_SETTINGS = deepFreeze(defaultThemeSettings);
export const DEFAULT_THEME = DEFAULT_THEME_SETTINGS;
