import { describe, expect, it } from "vitest";

import { createSectionId, parsePageLayout } from "../src/layout.js";
import { createSectionRegistry } from "../src/registry.js";
import { safeParsePageLayout } from "../src/validation.js";

const registry = createSectionRegistry();

function heroLayout(settings: Record<string, unknown> = { heading: "Welcome" }) {
  return {
    version: 1,
    sections: [{ id: "hero-1", type: "hero", settings }],
  };
}

describe("page layout validation", () => {
  it("parses a registered section and applies schema defaults", () => {
    const layout = parsePageLayout({
      version: 1,
      sections: [{ id: "product-grid-1", type: "product-grid", settings: {} }],
    }, registry);

    expect(layout.sections[0]?.settings).toEqual({ columns: "4" });
  });

  it("rejects an unknown section type", () => {
    expect(() => parsePageLayout({
      version: 1,
      sections: [{ id: "missing-1", type: "missing", settings: {} }],
    }, registry)).toThrow("Unknown section type");
  });

  it("rejects duplicate IDs", () => {
    expect(() => parsePageLayout({
      version: 1,
      sections: [
        { id: "hero-1", type: "hero", settings: { heading: "One" } },
        { id: "hero-1", type: "hero", settings: { heading: "Two" } },
      ],
    }, registry)).toThrow("Duplicate section ID");
  });

  it("rejects a preset not supported by the section", () => {
    expect(() => parsePageLayout({
      version: 1,
      sections: [{ id: "faq-1", type: "faq", settings: { items: [{ question: "Q", answer: "A" }] }, layout: { desktop: "three-column" } }],
    }, registry)).toThrow("Unsupported three-column preset");
  });

  it("reports invalid settings without throwing from safe parsing", () => {
    const result = safeParsePageLayout(heroLayout({ heading: 42 }), registry);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("Invalid input");
  });

  it("creates a unique section ID", () => {
    expect(createSectionId("hero", new Set(["hero-1", "hero-2"]))).toBe("hero-3");
  });
});
