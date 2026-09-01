import { describe, expect, it } from "vitest";
import type { RouteContext } from "emdash";

import { DEFAULT_THEME_SETTINGS, compatibleGoogleFontWeights, createPlugin } from "../src/index.js";

type TestResult = {
  operations: Array<{ id: string }>;
  changes: Array<{ path: string; next: unknown }>;
  settings?: unknown;
};

function context(input: unknown, store: Map<string, unknown> = new Map()): RouteContext {
  return {
    input,
    request: new Request("https://example.test/_emdash/api/plugins/emdash-theme-tokens/tokens", { method: "POST" }),
    requestMeta: { ip: null, userAgent: null, referer: null, geo: null },
    kv: {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: unknown) => void store.set(key, value),
      delete: async (key: string) => store.delete(key),
    },
  } as unknown as RouteContext;
}

async function invoke(route: "tokens/search" | "tokens/execute", input: unknown, store?: Map<string, unknown>) {
  const plugin = createPlugin();
  return plugin.routes[route].handler(context(input, store));
}

describe("theme token native plugin contract", () => {
  it("declares exactly search and execute MCP tools", () => {
    const plugin = createPlugin();
    expect(Object.keys(plugin.mcp?.tools ?? {}).sort()).toEqual(["execute", "search"]);
  });

  it("declares private routes and permissions", () => {
    const plugin = createPlugin();
    expect(Object.keys(plugin.routes).sort()).toEqual(["tokens/execute", "tokens/search"]);
    expect(plugin.routes["tokens/search"].public).not.toBe(true);
    expect(plugin.routes["tokens/search"].permission).toBe("settings:read");
    expect(plugin.routes["tokens/execute"].permission).toBe("settings:manage");
  });

  it("search returns only matching capability metadata", async () => {
    const result = await invoke("tokens/search", { query: "heading font", area: "typography" }) as TestResult;
    expect(result.operations.map((item) => item.id)).toContain("theme.settings.update");
    expect(JSON.stringify(result)).not.toContain("COMMERCE_BRIDGE_SECRET");
  });

  it("execute rejects unknown operations and unsafe patches", async () => {
    await expect(invoke("tokens/execute", { operation: "theme.shell.rawCss", input: {} })).rejects.toThrow();
    await expect(invoke("tokens/execute", {
      operation: "theme.settings.update",
      input: { patch: { "typography.heading.font": "https://evil.example/x.css" } },
    })).rejects.toThrow();
  });

  it("execute returns normalized changes for a valid update and persists settings", async () => {
    const store = new Map<string, unknown>();
    const result = await invoke("tokens/execute", {
      operation: "theme.settings.update",
      input: { patch: { "typography.heading.font": "dm-sans", "motion.enabled": false } },
    }, store) as TestResult;
    expect(result.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "typography.heading.font", value: "dm-sans" }),
      expect.objectContaining({ path: "motion.enabled", value: false }),
    ]));
    expect(store.get("settings:theme")).toEqual(expect.objectContaining({ version: 1 }));
  });

  it("falls back to defaults and reset clears persisted overrides", async () => {
    const store = new Map<string, unknown>();
    const initial = await invoke("tokens/execute", { operation: "theme.settings.get", input: {} }, store) as TestResult;
    expect(initial.settings).toEqual(DEFAULT_THEME_SETTINGS);
    await invoke("tokens/execute", { operation: "theme.settings.update", input: { patch: { "color.brand": "#123456" } } }, store);
    await invoke("tokens/execute", { operation: "theme.settings.reset", input: {} }, store);
    expect(store.get("settings:theme")).toEqual(DEFAULT_THEME_SETTINGS);
  });
  it("returns machine-readable update constraints", async () => {
    const result = await invoke("tokens/search", { query: "heading font", area: "typography" }) as { operations: Array<{ id: string; inputSchema: Record<string, unknown> }> };
    const update = result.operations.find((item) => item.id === "theme.settings.update");
    expect(update).toBeDefined();
    const properties = (update?.inputSchema.properties as Record<string, unknown>).patch as Record<string, unknown>;
    expect(properties.properties).toHaveProperty("typography.heading.font");
    expect((properties.properties as Record<string, Record<string, unknown>>)["typography.heading.font"].enum).toContain("dm-sans");
  });

  it("turns patch validation failures into actionable route errors", async () => {
    await expect(invoke("tokens/execute", {
      operation: "theme.settings.update",
      input: { patch: { "color.brand": "not-a-color" } },
    })).rejects.toThrow(/Invalid theme settings patch:/i);
  });
  it("keeps Google family changes usable with compatible weights", () => {
    expect(compatibleGoogleFontWeights("inter", [800, 900])).toEqual([400]);
    expect(compatibleGoogleFontWeights("dm-sans", [400, 700])).toEqual([400, 700]);
  });

  it("marks execute destructive and validates MCP output schemas", () => {
    const plugin = createPlugin();
    expect(plugin.mcp?.tools.execute.destructive).toBe(true);
    expect(plugin.mcp?.tools.search.output?.safeParse({ operations: [] }).success).toBe(true);
    expect(plugin.mcp?.tools.execute.output?.safeParse({ operation: "theme.settings.get", settings: DEFAULT_THEME_SETTINGS, changes: [] }).success).toBe(true);
  });
});
