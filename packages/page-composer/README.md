# `@emdash-cms/page-composer`

Native EmDash page composition primitives for constrained, reusable theme sections.

## What it provides

- versioned `PageLayout` and `SectionInstance` schemas;
- section registry with per-section settings validation;
- responsive layout and visibility presets;
- public published-layout read and authenticated save routes;
- a native React section-tree editor;
- server-side ordered rendering for theme-supplied section renderers.

The editor supports insertion, reorder, duplicate, remove, JSON-backed validated
settings, and preview integration. It intentionally does not persist arbitrary HTML,
JavaScript, CSS, absolute positioning, or pixel coordinates.

## Usage

```ts
import {
  createSectionRegistry,
  parsePageLayout,
  renderPageLayout,
} from "@emdash-cms/page-composer";
import { renderers } from "./theme/sections.js";

const registry = createSectionRegistry(renderers);
const layout = parsePageLayout(savedLayout, registry);
const sections = await renderPageLayout(layout, registry, { pageId: "home" });
```

Themes own the actual Astro-compatible renderers and read live CMS or Commerce data.
Commerce sections store public product/category references rather than copied price,
stock, checkout, or order state.

## EmDash registration

```ts
import { pageComposerPlugin } from "@emdash-cms/page-composer";

export default defineConfig({
  plugins: [pageComposerPlugin()],
});
```

Block Kit is used for property forms where a theme supplies them. It is not the page
canvas or section-tree runtime.
