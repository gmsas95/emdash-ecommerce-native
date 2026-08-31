import { getEmDashCollection, getEmDashEntry } from "emdash";
import {
  createSectionRegistry,
  DEFAULT_SECTION_DEFINITIONS,
  parsePageLayout,
  type PageLayout,
} from "@emdash-cms/page-composer";

import type { CacheHint, CollectionFilter } from "emdash";
export interface CmsMediaField {
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface CmsPageEntry {
  id: string;
  data: {
    id?: string;
    title?: string;
    content?: unknown[];
    featured_image?: CmsMediaField | null;
  };
  edit?: {
    title?: Record<string, unknown>;
    content?: Record<string, unknown>;
    featured_image?: Record<string, unknown>;
  };
}

export interface CmsCollectionEntry {
  id: string;
  data: unknown;
}
export async function loadCmsPage(slug: string): Promise<{ page: CmsPageEntry | null; cacheHint: CacheHint }> {
  const result = await getEmDashEntry("pages", slug);
  return { page: result.entry as CmsPageEntry | null, cacheHint: result.cacheHint };
}


export async function loadCmsCollection<T extends CmsCollectionEntry = CmsCollectionEntry>(
  collection: string,
  filter?: CollectionFilter,
): Promise<{ entries: T[]; cacheHint: CacheHint }> {
  const result = await getEmDashCollection<string, T>(collection, filter);
  return { entries: result.entries as unknown as T[], cacheHint: result.cacheHint };
}

interface PageLayoutResponse {
  layout?: unknown;
}

type PublicPluginRouteHandler = (
  pluginId: string,
  method: string,
  path: string,
  request: Request,
) => Promise<{ success: boolean; data?: unknown }>;

const pageSectionRegistry = createSectionRegistry(DEFAULT_SECTION_DEFINITIONS);

export async function loadPageLayout(
  pageId: string,
  requestUrl: URL,
  handlePublicPluginApiRoute?: PublicPluginRouteHandler,
): Promise<PageLayout | null> {
  if (!handlePublicPluginApiRoute) return null;
  const endpoint = new URL("/_emdash/api/plugins/emdash-page-composer/layouts/get", requestUrl);
  endpoint.searchParams.set("pageId", pageId);
  try {
    const result = await handlePublicPluginApiRoute(
      "emdash-page-composer",
      "GET",
      "/layouts/get",
      new Request(endpoint, { method: "GET" }),
    );
    if (!result.success || !result.data || typeof result.data !== "object") return null;
    const payload = result.data as PageLayoutResponse;
    if (payload.layout == null) return null;
    return parsePageLayout(payload.layout, pageSectionRegistry);
  } catch {
    return null;
  }
}
