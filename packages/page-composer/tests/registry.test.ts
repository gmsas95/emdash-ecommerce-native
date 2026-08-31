import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createSectionRegistry } from "../src/registry.js";

const definition = {
  type: "test-section",
  label: "Test section",
  category: "content" as const,
  settingsSchema: z.object({ heading: z.string() }).strict(),
  supportedPresets: ["stack"] as const,
  render: ({ section }: { section: { id: string } }) => section.id,
};

describe("section registry", () => {
  it("rejects duplicate section types", () => {
    expect(() => createSectionRegistry([definition, definition])).toThrow("Duplicate section type");
  });

  it("lists definitions in registration order", () => {
    const registry = createSectionRegistry([definition]);
    expect(registry.list().map((item) => item.type)).toEqual(["test-section"]);
    expect(registry.has("test-section")).toBe(true);
  });

  it("rejects definitions without a supported preset", () => {
    expect(() => createSectionRegistry([{ ...definition, supportedPresets: [] }])).toThrow("must support a layout preset");
  });
});
