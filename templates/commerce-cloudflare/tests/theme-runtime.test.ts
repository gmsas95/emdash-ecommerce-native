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
 
it("ships neutral starter content", async () => {
  const seed = (await import("../seed/seed.json")).default;
  expect(seed.meta.name).toBe("EmDash Commerce Starter");
  expect(JSON.stringify(seed)).not.toContain("ZIAS");
});
