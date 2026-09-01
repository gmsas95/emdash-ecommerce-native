import { definePlugin, PluginRouteError } from "emdash";
import type { PluginDescriptor, PluginAdminExports, ResolvedPlugin, RouteContext } from "emdash";

import { DEFAULT_THEME_SETTINGS } from "./defaults.js";
import { listThemeFonts } from "./fonts.js";
import { applyThemePatch, resolveThemeSettings } from "./resolve.js";
import {
  emptyInputSchema,
  themeExecuteInputSchema,
  themeExecuteOutputSchema,
  themeOperationRegistry,
  themeSearchInputSchema,
  themeSearchOutputSchema,
  updateInputSchema,
} from "./operation-registry.js";
import { themeOperationSchema } from "./schema.js";
import type { ResolvedThemeSettings, ThemeChange } from "./schema.js";
import type { ThemeExecuteInput, ThemeExecuteOutput, ThemeOperationDescription, ThemeSearchInput, ThemeSearchOutput } from "./operation-registry.js";

export const THEME_TOKENS_PLUGIN_ID = "emdash-theme-tokens" as const;
export const THEME_TOKENS_PLUGIN_VERSION = "0.1.0" as const;
export const THEME_SETTINGS_KEY = "settings:theme" as const;

export { themeExecuteInputSchema, themeExecuteOutputSchema, themeOperationRegistry, themeSearchInputSchema, themeSearchOutputSchema } from "./operation-registry.js";
export type { ThemeExecuteInput, ThemeExecuteOutput, ThemeOperationDescription, ThemeSearchInput, ThemeSearchOutput } from "./operation-registry.js";
export const THEME_OPERATION_REGISTRY = themeOperationRegistry;
export type ThemeOperationArea = NonNullable<ThemeSearchInput["area"]>;

function routeMethod(context: RouteContext): void {
  if (context.request.method !== "POST") throw new PluginRouteError("METHOD_NOT_ALLOWED", "Theme token routes require POST", 405);
}
function parseRouteInput<T>(schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { message: string } } }, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw PluginRouteError.badRequest(parsed.error.message);
  return parsed.data;
}
async function readSettings(context: RouteContext): Promise<ResolvedThemeSettings> {
  return resolveThemeSettings(await context.kv.get<unknown>(THEME_SETTINGS_KEY));
}
function flattenSettings(settings: ResolvedThemeSettings): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const flatten = (value: unknown, prefix: string): void => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      if (prefix !== "version") patch[prefix.replace(/^tokens\./, "")] = value;
      return;
    }
    for (const [key, nested] of Object.entries(value)) flatten(nested, prefix ? `${prefix}.${key}` : key);
  };
  flatten(settings, "");
  return patch;
}
function diffSettings(previous: ResolvedThemeSettings, next: ResolvedThemeSettings): ThemeChange[] {
  const changes: ThemeChange[] = [];
  const previousPatch = flattenSettings(previous);
  const nextPatch = flattenSettings(next);
  for (const path of Object.keys(nextPatch)) {
    if (JSON.stringify(previousPatch[path]) !== JSON.stringify(nextPatch[path])) changes.push({ path, previous: previousPatch[path], next: nextPatch[path] });
  }
  return changes;
}
function outputChanges(changes: readonly ThemeChange[]) { return changes.map((change) => ({ ...change, value: change.next })); }

export async function themeTokensSearchRoute(context: RouteContext): Promise<ThemeSearchOutput> {
  routeMethod(context);
  const input = parseRouteInput(themeSearchInputSchema, context.input);
  const terms = input.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const operations = themeOperationRegistry.filter((operation) => {
    if (input.area && operation.area !== input.area && operation.id !== "theme.settings.update") return false;
    const haystack = [operation.id, operation.area, operation.description, ...operation.keywords].join(" ").toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  }).map(({ id, area, description, inputSchema, destructive }) => ({ id, area, description, inputSchema, destructive }));
  return themeSearchOutputSchema.parse({ operations });
}

export async function themeTokensExecuteRoute(context: RouteContext): Promise<ThemeExecuteOutput> {
  routeMethod(context);
  const input = parseRouteInput(themeExecuteInputSchema, context.input);
  const operationResult = themeOperationSchema.safeParse(input.operation);
  if (!operationResult.success) throw PluginRouteError.badRequest(`Unknown theme operation: ${input.operation}`);
  const operation = operationResult.data;
  const settings = await readSettings(context);
  switch (operation) {
    case "theme.settings.get":
      parseRouteInput(emptyInputSchema, input.input);
      return themeExecuteOutputSchema.parse({ operation, settings, changes: [] });
    case "theme.settings.update": {
      const update = parseRouteInput(updateInputSchema, input.input);
      let applied;
      try { applied = applyThemePatch(settings, update.patch); }
      catch (cause) { throw PluginRouteError.badRequest(`Invalid theme settings patch: ${cause instanceof Error ? cause.message : "validation failed"}`); }
      await context.kv.set(THEME_SETTINGS_KEY, applied.settings);
      return themeExecuteOutputSchema.parse({ operation, settings: applied.settings, changes: outputChanges(applied.changes) });
    }
    case "theme.settings.reset": {
      parseRouteInput(emptyInputSchema, input.input);
      const changes = diffSettings(settings, DEFAULT_THEME_SETTINGS);
      await context.kv.set(THEME_SETTINGS_KEY, DEFAULT_THEME_SETTINGS);
      return themeExecuteOutputSchema.parse({ operation, settings: DEFAULT_THEME_SETTINGS, changes: outputChanges(changes) });
    }
    case "theme.fonts.list":
      parseRouteInput(emptyInputSchema, input.input);
      return themeExecuteOutputSchema.parse({ operation, fonts: listThemeFonts(), changes: [] });
    case "theme.motion.get":
      parseRouteInput(emptyInputSchema, input.input);
      return themeExecuteOutputSchema.parse({ operation, motion: settings.motion, changes: [] });
    case "theme.variants.list":
      parseRouteInput(emptyInputSchema, input.input);
      return themeExecuteOutputSchema.parse({ operation, variants: settings.variants, changes: [] });
  }
}

export interface ThemeTokensPluginOptions { enabled?: boolean; }
export type ThemeTokensPluginDescriptorOptions = Omit<ThemeTokensPluginOptions, "enabled">;
export function themeTokensPlugin(options: ThemeTokensPluginDescriptorOptions = {}): PluginDescriptor<ThemeTokensPluginDescriptorOptions> {
  return { id: THEME_TOKENS_PLUGIN_ID, version: THEME_TOKENS_PLUGIN_VERSION, entrypoint: "@emdash-cms/theme-tokens", adminEntry: "@emdash-cms/theme-tokens/admin", options, adminPages: [{ path: "/", label: "Theme Settings", icon: "paintbrush" }] };
}
export function createPlugin(_options: ThemeTokensPluginOptions = {}): ResolvedPlugin {
  return definePlugin({
    id: THEME_TOKENS_PLUGIN_ID,
    version: THEME_TOKENS_PLUGIN_VERSION,
    routes: {
      "tokens/search": { input: themeSearchInputSchema, permission: "settings:read", handler: themeTokensSearchRoute },
      "tokens/execute": { input: themeExecuteInputSchema, permission: "settings:manage", handler: themeTokensExecuteRoute },
    },
    mcp: { tools: {
      search: { description: "Discover validated theme-token operations and bounded capability metadata.", route: "tokens/search", input: themeSearchInputSchema, output: themeSearchOutputSchema },
      execute: { description: "Execute one allowlisted theme-token operation with validation and normalized persistence.", route: "tokens/execute", input: themeExecuteInputSchema, output: themeExecuteOutputSchema, destructive: true },
    } },
    admin: { entry: "@emdash-cms/theme-tokens/admin", pages: [{ path: "/", label: "Theme Settings", icon: "paintbrush" }] },
  });
}
export type ThemeAdminExports = PluginAdminExports;
export default createPlugin;
