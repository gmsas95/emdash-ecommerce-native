import { parsePageLayout } from "../layout.js";
import type { PageLayout, SectionInstance } from "../layout.js";
import type { SectionRegistry } from "../registry.js";

export type PageRenderContext = {
  pageId?: string;
  requestUrl?: string;
  siteUrl?: string;
  [key: string]: unknown;
};

export type RenderedPageSection<Output = unknown> = {
  section: SectionInstance;
  output: Output;
};

/**
 * Validate the layout before selecting renderers, then render the ordered
 * section stack. Themes supply renderer output suitable for their Astro tree.
 */
export async function renderPageLayout<Output = unknown>(
  input: unknown,
  registry: SectionRegistry,
  context: PageRenderContext = {},
): Promise<RenderedPageSection<Output>[]> {
  const layout: PageLayout = parsePageLayout(input, registry);
  const rendered: RenderedPageSection<Output>[] = [];

  for (const section of layout.sections) {
    const definition = registry.get(section.type);
    const output = await definition.render({ section, context });
    rendered.push({ section, output: output as Output });
  }

  return rendered;
}
