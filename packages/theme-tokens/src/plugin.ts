import { definePlugin, PluginRouteError } from "emdash";
import type { PluginDescriptor, PluginAdminExports, ResolvedPlugin, RouteContext } from "emdash";
import { z } from "zod";

import { DEFAULT_THEME_SETTINGS } from "./defaults.js";
import { listThemeFonts } from "./fonts.js";
import { applyThemePatch, resolveThemeSettings } from "./resolve.js";
import {
  motionSchema,
  resolvedThemeSettingsSchema,
  themeChangeSchema,
  themeOperationSchema,
  themeTokenPatchSchema,
  variantsSchema,
} from "./schema.js";
import type { ResolvedThemeSettings, ThemeChange, ThemeOperation } from "./schema.js";

export const THEME_TOKENS_PLUGIN_ID = "emdash-theme-tokens" as const;
export const THEME_TOKENS_PLUGIN_VERSION = "0.1.0" as const;
export const THEME_SETTINGS_KEY = "settings:theme" as const;

export const themeSearchInputSchema = z.object({
  query: z.string().max(200),
  area: z.enum(["tokens", "typography", "motion", "variants"]).optional(),
}).strict();

export const themeExecuteInputSchema = z.object({
  operation: z.string().min(1),
  input: z.unknown(),
}).strict();

const emptyInputSchema = z.object({}).strict();
const updateInputSchema = z.object({ patch: themeTokenPatchSchema }).strict();

export type ThemeSearchInput = z.infer<typeof themeSearchInputSchema>;
export type ThemeExecuteInput = z.infer<typeof themeExecuteInputSchema>;
export type ThemeOperationArea = NonNullable<ThemeSearchInput["area"]>;

export interface ThemeOperationDescription {
  id: ThemeOperation;
  area: ThemeOperationArea;
  description: string;
  inputSchema: Record<string, unknown>;
  destructive: boolean;
  keywords: readonly string[];
}

const OPERATION_DESCRIPTIONS: readonly ThemeOperationDescription[] = [
  {
    id: "theme.settings.get",
    area: "tokens",
    description: "Read the normalized versioned theme settings.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    destructive: false,
    keywords: ["settings", "theme", "tokens", "read", "get"],
  },
  {
    id: "theme.settings.update",
    area: "tokens",
    description: "Apply validated color, typography, layout, shape, elevation, motion, or variant changes.",
    inputSchema: { type: "object", properties: { patch: { type: "object", description: "Allowlisted dotted theme paths and values." } }, required: ["patch"], additionalProperties: false },
    destructive: true,
    keywords: ["settings", "theme", "tokens", "color", "typography", "heading", "font", "layout", "shape", "elevation", "motion", "variant", "update", "change"],
  },
  {
    id: "theme.settings.reset",
    area: "tokens",
    description: "Restore all theme settings to the approved defaults.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    destructive: true,
    keywords: ["settings", "theme", "reset", "defaults"],
  },
  {
    id: "theme.fonts.list",
    area: "typography",
    description: "List approved system and Google font families, weights, subsets, and delivery modes.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    destructive: false,
    keywords: ["fonts", "font", "typography", "google", "family", "weights"],
  },
  {
    id: "theme.motion.get",
    area: "motion",
    description: "Read the normalized motion settings and reduced-motion-safe controls.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    destructive: false,
    keywords: ["motion", "animation", "hover", "reveal", "duration", "easing"],
  },
  {
    id: "theme.variants.list",
    area: "variants",
    description: "List the approved component variant values for header, hero, button, card, and footer.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    destructive: false,
    keywords: ["variants", "variant", "header", "hero", "button", "card", "footer"],
  },
];

export const THEME_OPERATION_REGISTRY = OPERATION_DESCRIPTIONS;
export const themeOperationRegistry = THEME_OPERATION_REGISTRY;

const searchOperationSchema = z.object({
  id: themeOperationSchema,
  area: z.enum(["tokens", "typography", "motion", "variants"]),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  destructive: z.boolean(),
}).strict();

const themeOutputChangeSchema = themeChangeSchema.extend({ value: z.unknown() });
export const themeSearchOutputSchema = z.object({ operations: z.array(searchOperationSchema) }).strict();
export const themeExecuteOutputSchema = z.object({
  operation: themeOperationSchema,
  settings: resolvedThemeSettingsSchema.optional(),
  changes: z.array(themeOutputChangeSchema),
  fonts: z.array(z.unknown()).optional(),
  motion: motionSchema.optional(),
  variants: variantsSchema.optional(),
}).strict();

export type ThemeSearchOutput = z.infer<typeof themeSearchOutputSchema>;
export type ThemeExecuteOutput = z.infer<typeof themeExecuteOutputSchema>;

function routeMethod(context: RouteContext): void {
  if (context.request.method !== "POST") {
    throw new PluginRouteError("METHOD_NOT_ALLOWED", "Theme token routes require POST", 405);
  }
}

function parseRouteInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw PluginRouteError.badRequest(parsed.error.message);
  return parsed.data;
}

async function readSettings(context: RouteContext): Promise<ResolvedThemeSettings> {
  const persisted = await context.kv.get<unknown>(THEME_SETTINGS_KEY);
  return resolveThemeSettings(persisted);
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
    if (JSON.stringify(previousPatch[path]) !== JSON.stringify(nextPatch[path])) {
      changes.push({ path, previous: previousPatch[path], next: nextPatch[path] });
    }
  }
  return changes;
}
function outputChanges(changes: readonly ThemeChange[]): Array<ThemeChange & { value: unknown }> {
  return changes.map((change) => ({ ...change, value: change.next }));
}

export async function themeTokensSearchRoute(context: RouteContext): Promise<ThemeSearchOutput> {
  routeMethod(context);
  const input = parseRouteInput(themeSearchInputSchema, context.input);
  const terms = input.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const operations = OPERATION_DESCRIPTIONS.filter((operation) => {
    if (input.area && operation.area !== input.area && operation.id !== "theme.settings.update") return false;
    const haystack = [operation.id, operation.area, operation.description, ...operation.keywords].join(" ").toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  }).map(({ id, area, description, inputSchema, destructive }) => ({ id, area, description, inputSchema, destructive }));
  return themeSearchOutputSchema.parse({ operations });
}
export async function themeTokensExecuteRoute(context: RouteContext): Promise<ThemeExecuteOutput> {
  routeMethod(context);
  const input = parseRouteInput(themeExecuteInputSchema, context.input);
  const operation = themeOperationSchema.safeParse(input.operation);
  if (!operation.success) throw PluginRouteError.badRequest(`Unknown theme operation: ${input.operation}`);
  const operationId = operation.data;
  let settings = await readSettings(context);

  switch (operationId) {
    case "theme.settings.get":
      parseRouteInput(emptyInputSchema, input.input);
      return { operation: operationId, settings, changes: [] };
    case "theme.settings.update": {
      const update = parseRouteInput(updateInputSchema, input.input);
      const applied = applyThemePatch(settings, update.patch);
      settings = applied.settings;
      await context.kv.set(THEME_SETTINGS_KEY, settings);
      return themeExecuteOutputSchema.parse({ operation: operationId, settings, changes: outputChanges(applied.changes) });
    }
    case "theme.settings.reset": {
      parseRouteInput(emptyInputSchema, input.input);
      const changes = diffSettings(settings, DEFAULT_THEME_SETTINGS);
      settings = DEFAULT_THEME_SETTINGS;
      await context.kv.set(THEME_SETTINGS_KEY, settings);
      return themeExecuteOutputSchema.parse({ operation: operationId, settings, changes: outputChanges(changes) });
    }
    case "theme.fonts.list":
      parseRouteInput(emptyInputSchema, input.input);
      return { operation: operationId, fonts: listThemeFonts(), changes: [] };
    case "theme.motion.get":
      parseRouteInput(emptyInputSchema, input.input);
      return { operation: operationId, motion: settings.motion, changes: [] };
    case "theme.variants.list":
      parseRouteInput(emptyInputSchema, input.input);
      return { operation: operationId, variants: settings.variants, changes: [] };
    default:
      throw PluginRouteError.badRequest(`Unknown theme operation: ${input.operation}`);
  }
}

export interface ThemeTokensPluginOptions {
  enabled?: boolean;
}
export type ThemeTokensPluginDescriptorOptions = Omit<ThemeTokensPluginOptions, "enabled">;

export function themeTokensPlugin(options: ThemeTokensPluginDescriptorOptions = {}): PluginDescriptor<ThemeTokensPluginDescriptorOptions> {
  return {
    id: THEME_TOKENS_PLUGIN_ID,
    version: THEME_TOKENS_PLUGIN_VERSION,
    entrypoint: "@emdash-cms/theme-tokens",
    adminEntry: "@emdash-cms/theme-tokens/admin",
    options,
    adminPages: [{ path: "/", label: "Theme Settings", icon: "paintbrush" }],
  };
}

export function createPlugin(_options: ThemeTokensPluginOptions = {}): ResolvedPlugin {
  return definePlugin({
    id: THEME_TOKENS_PLUGIN_ID,
    version: THEME_TOKENS_PLUGIN_VERSION,
    routes: {
      "tokens/search": {
        input: themeSearchInputSchema,
        permission: "settings:read",
        handler: themeTokensSearchRoute,
      },
      "tokens/execute": {
        input: themeExecuteInputSchema,
        permission: "settings:manage",
        handler: themeTokensExecuteRoute,
      },
    },
    mcp: {
      tools: {
        search: {
          description: "Discover validated theme-token operations and their bounded capability metadata.",
          route: "tokens/search",
          input: themeSearchInputSchema,
          output: themeSearchOutputSchema,
        },
        execute: {
          description: "Execute one allowlisted theme-token operation with schema validation and normalized persistence.",
          route: "tokens/execute",
          input: themeExecuteInputSchema,
          output: themeExecuteOutputSchema,
          destructive: true,
        },
      },
    },
    admin: {
      entry: "@emdash-cms/theme-tokens/admin",
      pages: [{ path: "/", label: "Theme Settings", icon: "paintbrush" }],
    },
  });
}

export type ThemeAdminExports = PluginAdminExports;
export default createPlugin;
