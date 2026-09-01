import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_SETTINGS,
  FONT_REGISTRY,
  applyThemePatch,
  emitThemeCss,
  listThemeFonts,
  resolveThemeSettings,
} from "../src/index.js";

describe("theme token defaults and resolution", () => {
  it("returns neutral defaults for missing settings", () => {
    const resolved = resolveThemeSettings(undefined);
    expect(resolved.version).toBe(1);
    expect(resolved.typography.display.font).toBe("plus-jakarta");
    expect(resolved.motion).toMatchObject({ enabled: true, intensity: "subtle" });
  });

  it("migrates the versioned persisted wrapper and preserves defaults", () => {
    const resolved = resolveThemeSettings({
      theme: { version: 1, tokens: { "color.brand": "#123456" } },
    });
    expect(resolved.version).toBe(1);
    expect(resolved.tokens.color.brand).toBe("#123456");
    expect(resolved.tokens.layout.contentWidth).toBe(DEFAULT_THEME_SETTINGS.tokens.layout.contentWidth);
  });

  it("rejects unknown fonts and unsafe token values", () => {
    expect(() => applyThemePatch(resolveThemeSettings(undefined), {
      "typography.heading.font": "https://evil.example/font.css",
      "color.brand": "url(javascript:alert(1))",
      "layout.contentWidth": "99999px",
    })).toThrow();
  });

  it("applies a valid partial typography and motion patch", () => {
    const result = applyThemePatch(resolveThemeSettings(undefined), {
      "typography.heading.font": "dm-sans",
      "typography.heading.weight": 700,
      "motion.hover": "lift",
    });
    expect(result.settings.typography.heading.font).toBe("dm-sans");
    expect(result.settings.motion.hover).toBe("lift");
    expect(result.changes).toHaveLength(3);
    expect(result.changes.map((change) => change.path)).toEqual([
      "typography.heading.font",
      "typography.heading.weight",
      "motion.hover",
    ]);
  });
});

describe("theme token boundaries", () => {
  it.each(["system-sans", "system-serif", "inter", "plus-jakarta", "source-sans", "source-serif", "dm-sans"])(
    "accepts approved font family %s",
    (font) => {
      const result = applyThemePatch(resolveThemeSettings(undefined), {
        "typography.body.font": font,
      });
      expect(result.settings.typography.body.font).toBe(font);
    },
  );

  it("exposes pinned font records and filters them by query", () => {
    expect(FONT_REGISTRY).toHaveLength(7);
    expect(listThemeFonts("Jakarta").map((font) => font.id)).toEqual(["plus-jakarta"]);
    expect(listThemeFonts("serif").map((font) => font.id)).toEqual(["system-serif", "source-serif"]);
    expect(listThemeFonts("not-a-font")).toEqual([]);
    expect(listThemeFonts()).toEqual(FONT_REGISTRY);
  });

  it("accepts every registered font weight and rejects unsupported weights", () => {
    for (const font of FONT_REGISTRY) {
      const weight = font.weights[0];
      expect(weight).toBeDefined();
      const result = applyThemePatch(resolveThemeSettings(undefined), {
        "typography.ui.font": font.id,
        "typography.ui.weight": weight,
      });
      expect(result.settings.typography.ui.weight).toBe(weight);
    }
    expect(() => applyThemePatch(resolveThemeSettings(undefined), {
      "typography.heading.font": "inter",
      "typography.heading.weight": 100,
    })).toThrow();
  });

  it("allows only registered subsets and delivery modes", () => {
    const result = applyThemePatch(resolveThemeSettings(undefined), {
      "typography.google.subsets": ["latin", "latin-ext"],
      "typography.google.delivery": "self-hosted",
    });
    expect(result.settings.typography.google).toMatchObject({
      subsets: ["latin", "latin-ext"],
      delivery: "self-hosted",
    });
    expect(() => applyThemePatch(resolveThemeSettings(undefined), {
      "typography.google.subsets": ["cyrillic"],
    })).toThrow();
    expect(() => applyThemePatch(resolveThemeSettings(undefined), {
      "typography.google.delivery": "remote",
    })).toThrow();
  });

  it.each(["none", "subtle", "expressive"])("accepts motion intensity %s", (intensity) => {
    expect(applyThemePatch(resolveThemeSettings(undefined), { "motion.intensity": intensity }).settings.motion.intensity)
      .toBe(intensity);
  });

  it("accepts closed motion and component variants", () => {
    const result = applyThemePatch(resolveThemeSettings(undefined), {
      "motion.hover": "soft-scale",
      "motion.reveal": "fade-up",
      "motion.durationScale": "fast",
      "motion.easing": "snappy",
      "variants.header": "compact",
      "variants.hero": "centered",
      "variants.button": "outline",
      "variants.card": "flat",
      "variants.footer": "minimal",
    });
    expect(result.settings.motion.hover).toBe("soft-scale");
    expect(result.settings.variants).toEqual({
      header: "compact", hero: "centered", button: "outline", card: "flat", footer: "minimal",
    });
  });

  it("rejects invalid variants, colors, lengths, shadows, and malformed patches", () => {
    const current = resolveThemeSettings(undefined);
    for (const patch of [
      { "variants.header": "arbitrary" },
      { "color.brand": "red" },
      { "color.brand": "url(javascript:alert(1))" },
      { "layout.contentWidth": "20px" },
      { "layout.contentWidth": "99999px" },
      { "elevation.card": "0 0 0 red" },
      { "unknown.path": "value" },
    ]) expect(() => applyThemePatch(current, patch)).toThrow();
  });
});

describe("theme CSS emission", () => {
  it("emits deterministic CSS custom properties", () => {
    const css = emitThemeCss(resolveThemeSettings(undefined));
    expect(css).toContain("--theme-color-brand:");
    expect(css).toContain("--theme-font-display:");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("font-display: swap");
    expect(css).toBe(emitThemeCss(resolveThemeSettings(undefined)));
  });

  it("escapes serialized values and emits local fallbacks", () => {
    const settings = resolveThemeSettings({
      tokens: { "color.brand": "#123456" },
      typography: { display: { font: "source-serif", weight: 700 } },
    });
    const css = emitThemeCss(settings);
    expect(css).toContain("--theme-font-display:");
    expect(css).toContain("serif");
    expect(css).not.toContain("<script>");
  });
});
