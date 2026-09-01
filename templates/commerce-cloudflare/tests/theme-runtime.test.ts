import { normalizeMediaValue } from "../../../packages/core/src/media/normalize";
import { describe, expect, it } from "vitest";
import { renderThemeCss } from "../src/lib/theme-runtime";

describe("renderThemeCss", () => {
  it("emits default theme variables when settings are missing", () => {
    const css = renderThemeCss(undefined);

    expect(css).toContain("--theme-color-brand:");
    expect(css).toContain("--theme-font-display:");
  });

  it("applies a valid persisted theme override", () => {
    const css = renderThemeCss({
      theme: {
        version: 1,
        tokens: {
          "color.brand": "#123456",
        },
      },
    });

    expect(css).toContain("--theme-color-brand: #123456;");
  });

  it("falls back to defaults for invalid persisted settings", () => {
    expect(() =>
      renderThemeCss({
        theme: {
          version: 1,
          tokens: {
            "color.brand": "url(javascript:alert(1))",
          },
        },
      }),
    ).not.toThrow();

    expect(
      renderThemeCss({
        theme: {
          version: 1,
          tokens: {
            "color.brand": "url(javascript:alert(1))",
          },
        },
      }),
    ).toContain("--theme-color-brand: #176b59;");
  });
});
 
it("ships local CMS media values without seed downloads", async () => {
  const seed = (await import("../seed/seed.json")).default as Record<string, unknown>;
  const mediaValues: Array<Record<string, unknown>> = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if ("$media" in record) throw new Error("starter seed must not use downloadable $media references");
    if (record.provider === "external" && typeof record.id === "string" && typeof record.src === "string") {
      mediaValues.push(record);
    }
    Object.values(record).forEach(visit);
  };

  visit(seed);

  expect(mediaValues).toHaveLength(6);
  expect(new Set(mediaValues.map((value) => value.id))).toEqual(new Set([
    "starter-mark",
    "starter-hero",
    "starter-story-roots",
    "starter-story-craft",
    "starter-story-care",
  ]));
  for (const value of mediaValues) {
    expect(value.src).toMatch(/^\/media\/demo\/[a-z-]+\.svg$/);
    expect(value.mimeType).toBe("image/svg+xml");
  }
  const normalizedValues = await Promise.all(
    mediaValues.map((value) => normalizeMediaValue(value, () => undefined)),
  );
  for (const [index, normalized] of normalizedValues.entries()) {
    expect(normalized).toMatchObject({
      provider: "external",
      id: mediaValues[index]?.id,
      src: mediaValues[index]?.src,
    });
  }
});
