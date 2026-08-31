import { definePlugin, PluginRouteError } from "emdash";
import type {
  PluginDescriptor,
  PluginStorageConfig,
  ResolvedPlugin,
  RouteContext,
} from "emdash";
import { z } from "zod";

import { DEFAULT_SECTION_DEFINITIONS, createSectionRegistry } from "./registry.js";
import type { SectionRegistry } from "./registry.js";
import { parsePageLayout } from "./layout.js";

const PLUGIN_ID = "emdash-page-composer";
const PLUGIN_VERSION = "0.1.0";

const STORAGE = {
  pageLayouts: {
    indexes: ["updatedAt"],
    uniqueIndexes: ["pageId"],
  },
} as const satisfies PluginStorageConfig;

type PageLayoutRecord = {
  pageId: string;
  layout: unknown;
  updatedAt: string;
};

const pageIdSchema = z.object({
  pageId: z.string().min(1).max(200),
});

const saveLayoutSchema = z.object({
  pageId: z.string().min(1).max(200),
  layout: z.unknown(),
});

export interface PageComposerPluginOptions {
  enabled?: boolean;
  registry?: SectionRegistry;
}

export type PageComposerPluginDescriptorOptions = Omit<PageComposerPluginOptions, "registry">;

function registryFor(options: PageComposerPluginOptions): SectionRegistry {
  return options.registry ?? createSectionRegistry(DEFAULT_SECTION_DEFINITIONS);
}

function routePageId(context: RouteContext): string {
  const parsed = pageIdSchema.safeParse(context.input);
  if (!parsed.success) {
    throw PluginRouteError.badRequest("pageId must be a non-empty string");
  }
  return parsed.data.pageId;
}

export function pageComposerPlugin(
  options: PageComposerPluginDescriptorOptions = {},
): PluginDescriptor<PageComposerPluginDescriptorOptions> {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoint: "@emdash-cms/page-composer",
    adminEntry: "@emdash-cms/page-composer/admin",
    options,
    storage: STORAGE,
    adminPages: [{ path: "/", label: "Page Composer", icon: "layout" }],
  };
}

export function createPlugin(options: PageComposerPluginOptions = {}): ResolvedPlugin {
  const registry = registryFor(options);

  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    storage: STORAGE,
    routes: {
      "layouts/get": {
        // Published layouts contain only validated section settings and are safe
        // for storefront rendering. The save route remains private.
        public: true,
        // EmDash resolves route inputs through its own Zod instance at runtime.
        input: pageIdSchema as never,
        handler: async (context) => {
          const pageId = routePageId(context);
          const pageLayouts = context.storage.pageLayouts;
          if (!pageLayouts) throw new Error("Page Composer storage is unavailable");
          const record = (await pageLayouts.get(pageId)) as PageLayoutRecord | null;
          if (!record) {
            return { pageId, layout: null };
          }
          return { pageId, layout: parsePageLayout(record.layout, registry) };
        },
      },
      "layouts/save": {
        input: saveLayoutSchema as never,
        handler: async (context) => {
          const parsed = saveLayoutSchema.parse(context.input);
          const layout = parsePageLayout(parsed.layout, registry);
          const record: PageLayoutRecord = {
            pageId: parsed.pageId,
            layout,
            updatedAt: new Date().toISOString(),
          };
          const pageLayouts = context.storage.pageLayouts;
          if (!pageLayouts) throw new Error("Page Composer storage is unavailable");
          await pageLayouts.put(parsed.pageId, record);
          return { pageId: parsed.pageId, layout };
        },
      },
    },
    admin: {
      entry: "@emdash-cms/page-composer/admin",
      pages: [{ path: "/", label: "Page Composer", icon: "layout" }],
    },
  });
}

export default createPlugin;
