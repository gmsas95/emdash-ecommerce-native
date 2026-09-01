# Generic Astra-Inspired Commerce Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the ZIAS-coupled Commerce Cloudflare template into a generic Astra-inspired storefront with a native MCP-enabled theme-token plugin.

**Architecture:** Add `@emdash-cms/theme-tokens` as a pure token/schema/resolver package plus a trusted native EmDash plugin. Store one validated versioned theme object in the plugin settings namespace, expose exactly `search` and `execute` MCP tools, and have the Astro template read the setting through EmDash’s runtime settings API. Replace the current ZIAS editorial shell with a neutral product-first storefront whose components consume emitted CSS custom properties and closed variants.

**Tech Stack:** TypeScript, Zod, Vitest, React admin entrypoints, Astro 7, `@astrojs/cloudflare`, EmDash native plugins, CSS custom properties, D1/R2, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-08-31-generic-commerce-theme-design.md`

## Global Constraints

- Theme owns structure; Astro components own markup, behavior, responsive rules, accessibility, and Commerce integration.
- EmDash owns client data; site identity, content, media, menus, catalog, and validated theme settings come from CMS data.
- Components consume CSS custom properties and controlled variants rather than hardcoded brand values.
- Every runtime value comes from a versioned schema with allowlists, range checks, normalization, and safe fallbacks.
- The plugin exposes only `search` and `execute`; execution dispatches a closed operation registry, not arbitrary model-written JavaScript.
- The storefront renders useful HTML without client-side animation or remote font dependencies.
- Do not recreate Astra or WordPress Storefront source, assets, or markup.
- Do not build a general-purpose visual page builder.
- Do not accept arbitrary CSS, JavaScript, Astro, class names, HTML, or remote URLs from settings; Google Fonts are available only through the validated font registry and provider settings.
- Typography roles are `display`, `heading`, `body`, and `ui`.
- Motion defaults to enabled, subtle, standard duration, and must always honor `prefers-reduced-motion: reduce`.
- MCP search requires `settings:read`; execute requires `settings:manage` and plugin MCP consent.
- The plugin must not expose repository access, deployment credentials, arbitrary network fetch, or generic code execution.
- ZIAS-specific names, assets, product IDs, and fallback flags must not remain in reusable theme source.
- Production Google Fonts delivery defaults to self-hosted approved files; preview may use Google Fonts CSS.

## File map

### New native package

- Create `packages/theme-tokens/package.json`: workspace package metadata, build/typecheck/test scripts, exports for runtime and admin entrypoints.
- Create `packages/theme-tokens/tsconfig.json`: package TypeScript settings matching `packages/page-composer`.
- Create `packages/theme-tokens/src/schema.ts`: Zod schemas and TypeScript types for versioned theme settings, token patches, operation inputs/outputs, font records, and closed variants.
- Create `packages/theme-tokens/src/defaults.ts`: neutral Astra-inspired defaults and default typography/motion values.
- Create `packages/theme-tokens/src/fonts.ts`: pinned system/Google font registry with family IDs, weights, subsets, delivery metadata, and safe fallback stacks.
- Create `packages/theme-tokens/src/resolve.ts`: default merge, migration, partial patch application, normalization, and change-summary generation.
- Create `packages/theme-tokens/src/css.ts`: deterministic CSS custom-property and font-declaration emission.
- Create `packages/theme-tokens/src/index.ts`: public package exports.
- Create `packages/theme-tokens/src/plugin.ts`: native plugin descriptor, settings persistence, routes, MCP declarations, and operation dispatch.
- Create `packages/theme-tokens/src/admin.tsx`: native admin Theme Settings UI using the plugin routes and shared schemas.
- Create `packages/theme-tokens/tests/theme-tokens.test.ts`: pure schema, resolver, font, motion, and CSS contract tests.
- Create `packages/theme-tokens/tests/plugin.test.ts`: native route/operation/MCP contract tests.
- Create `packages/theme-tokens/README.md`: package API, settings contract, MCP operations, and font delivery guidance.

### Template integration

- Modify `templates/commerce-cloudflare/package.json`: add `@emdash-cms/theme-tokens`, add the focused `test` script, and add Vitest only for the template contract tests.
- Modify `templates/commerce-cloudflare/astro.config.mjs`: install `themeTokensPlugin()` beside the existing native plugins.
- Modify `templates/commerce-cloudflare/src/layouts/Base.astro`: read plugin settings, resolve tokens, emit safe CSS, and replace the ZIAS-specific shell with generic structure.
- Create `templates/commerce-cloudflare/src/lib/theme-runtime.ts`: pure glue helper that accepts raw theme settings and returns resolved CSS for `Base.astro`.
- Create `templates/commerce-cloudflare/tests/theme-runtime.test.ts`: template-level token integration and neutral-seed contract tests.
- Modify `pnpm-lock.yaml` and workspace package metadata through `pnpm install`.
- Modify `templates/commerce-cloudflare/src/components/CmsPageContent.astro`: remove ZIAS media fallback and use generic CMS-managed media behavior.
- Rename `templates/commerce-cloudflare/src/components/ZiasStoryBlocks.astro` to `StoryBlocks.astro` and remove client-specific fallback/copy.
- Modify `templates/commerce-cloudflare/src/components/ComposerSections.astro`: consume shared token/variant classes and preserve bounded Page Composer sections.
- Modify `templates/commerce-cloudflare/src/components/ClientCatalog.astro`, `ClientProductDetail.astro`, `ProductCard.astro`, `ProductGallery.astro`, `ClientFeaturedProduct.astro`, and `DemoNotice.astro`: replace ZIAS-specific alt/fallback/copy and use generic component styling.
- Modify `templates/commerce-cloudflare/src/pages/shop/index.astro`, `shop/[slug].astro`, `cart.astro`, `checkout.astro`, `checkout/success.astro`, and shared custom pages: use neutral copy and token classes.
- Remove `templates/commerce-cloudflare/src/lib/zias-media.ts`.
- Replace `templates/commerce-cloudflare/src/data/demo-catalog.mjs` with neutral demo products and local neutral demo media.
- Replace `templates/commerce-cloudflare/seed/seed.json` with neutral starter identity/content/menu/settings and no ZIAS identifiers.
- Modify `templates/commerce-cloudflare/README.md`: explain theme setup, plugin settings, font delivery, motion, and client onboarding.

### Documentation and verification

- Modify `docs/src/content/docs/guides/commerce-distribution.mdx`: describe generic theme installation and client configuration.
- Create `docs/src/content/docs/guides/theme-tokens.mdx`: document token groups, native plugin installation, MCP search/execute, and safe update examples.
- Modify `docs/src/content/docs/guides/theme-composition.mdx`: document semantic typography roles, Google Fonts preview/self-hosting, and bounded Page Composer sections alongside theme-owned structure.

---

### Task 1: Build token schema and resolver package

**Files:**
- Create all pure package files under `packages/theme-tokens/src/` except `plugin.ts` and `admin.tsx`.
- Create `packages/theme-tokens/package.json` and `packages/theme-tokens/tsconfig.json`.
- Create `packages/theme-tokens/tests/theme-tokens.test.ts`.

**Interfaces:**
- Produce `ThemeSettings`, `ResolvedThemeSettings`, `ThemeTokenPatch`, `ThemeFontRecord`, `ThemeOperation`, and related Zod-inferred types.
- Produce `resolveThemeSettings(raw: unknown): ResolvedThemeSettings`.
- Produce `applyThemePatch(current: ResolvedThemeSettings, patch: unknown): { settings: ResolvedThemeSettings; changes: ThemeChange[] }`.
- Produce `emitThemeCss(settings: ResolvedThemeSettings): string`.
- Produce `listThemeFonts(query?: string): ThemeFontRecord[]`.
- Later plugin and template tasks consume only these public exports.

- [ ] **Step 1: Write failing pure contract tests**

Create tests that assert:

```ts
it("returns neutral defaults for missing settings", () => {
  const resolved = resolveThemeSettings(undefined);
  expect(resolved.version).toBe(1);
  expect(resolved.typography.display.font).toBe("plus-jakarta");
  expect(resolved.motion).toMatchObject({ enabled: true, intensity: "subtle" });
});

it("rejects unknown fonts and unsafe token values", () => {
  expect(() => applyThemePatch(resolveThemeSettings(undefined), {
    "typography.heading.font": "https://evil.example/font.css",
    "color.brand": "url(javascript:alert(1))",
    "layout.contentWidth": "99999px",
  })).toThrow();
});

it("applies a valid partial typography and motion patch", () => {
  const result = applyThemePatch(resolveThemeSettings(undefined), {
    "typography.heading.font": "dm-sans",
    "typography.heading.weight": 700,
    "motion.hover": "lift",
  });
  expect(result.settings.typography.heading.font).toBe("dm-sans");
  expect(result.settings.motion.hover).toBe("lift");
  expect(result.changes).toHaveLength(3);
});

it("emits deterministic CSS custom properties", () => {
  const css = emitThemeCss(resolveThemeSettings(undefined));
  expect(css).toContain("--theme-color-brand:");
  expect(css).toContain("--theme-font-display:");
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
});
```

Add boundary tests for each approved font family (`system-sans`, `system-serif`, `inter`, `plus-jakarta`, `source-sans`, `source-serif`, `dm-sans`), supported weights/subsets, motion enum values, component variants, and version `1` migration.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```bash
pnpm --filter @emdash-cms/theme-tokens test
```

Expected: FAIL because the package and exported resolver do not exist yet. Fix test setup errors until the failure is caused by the missing implementation.

- [ ] **Step 3: Implement schemas, defaults, registry, resolver, and CSS emitter**

Use a structured persisted object with `version: 1`, nested `tokens`, `typography`, `motion`, and `variants`. Accept dotted paths only at the patch boundary and map them to the structured object. Enforce:

- CSS colors as validated hex/rgb/hsl values;
- lengths within explicit layout/radius bounds;
- shadows from an approved preset map rather than arbitrary strings;
- weights present in the selected font record;
- font IDs present in the pinned registry;
- Google delivery mode only as `preview` or `self-hosted`;
- motion and component variants as closed enums;
- local fallback stacks for every font role.

Make CSS emission deterministic, escape all serialized values, and include reduced-motion overrides without requiring JavaScript.

- [ ] **Step 4: Run package tests, typecheck, and build**

Run:

```bash
pnpm --filter @emdash-cms/theme-tokens test
pnpm --filter @emdash-cms/theme-tokens typecheck
pnpm --filter @emdash-cms/theme-tokens build
```

Expected: all focused tests pass and the package emits declarations/runtime files.

- [ ] **Step 5: Commit**

```bash
git add packages/theme-tokens
git commit -m "feat: add theme token resolver"
```

### Task 2: Add native plugin, admin settings, and two-tool MCP surface

**Files:**
- Create `packages/theme-tokens/src/plugin.ts`.
- Create `packages/theme-tokens/src/admin.tsx`.
- Create `packages/theme-tokens/tests/plugin.test.ts`.
- Modify `packages/theme-tokens/src/index.ts`: export the public runtime types, resolver, CSS emitter, font registry, `createPlugin()`, `themeTokensPlugin()`, and admin entrypoint types.

**Interfaces:**
- Plugin ID: `emdash-theme-tokens`.
- Private routes: `tokens/search` and `tokens/execute`.
- MCP manifest keys: `search` and `execute`, surfaced by EmDash as namespaced tools.
- `tokens/search` accepts `{ query: string; area?: "tokens" | "typography" | "motion" | "variants" }`.
- `tokens/execute` accepts `{ operation: string; input: unknown }`.
- Initial operations: `theme.settings.get`, `theme.settings.update`, `theme.settings.reset`, `theme.fonts.list`, `theme.motion.get`, `theme.variants.list`.

- [ ] **Step 1: Write failing plugin contract tests**

Test the actual operation registry and route handlers. Assert:

```ts
it("declares exactly search and execute MCP tools", () => {
  const plugin = createPlugin();
  expect(Object.keys(plugin.mcp?.tools ?? {}).sort()).toEqual(["execute", "search"]);
});

it("search returns only matching capability metadata", async () => {
  const result = await invokeSearch({ query: "heading font", area: "typography" });
  expect(result.operations.map((item) => item.id)).toContain("theme.settings.update");
  expect(JSON.stringify(result)).not.toContain("COMMERCE_BRIDGE_SECRET");
});

it("execute rejects unknown operations and unsafe patches", async () => {
  await expect(invokeExecute({ operation: "theme.shell.rawCss", input: {} })).rejects.toThrow();
  await expect(invokeExecute({
    operation: "theme.settings.update",
    input: { patch: { "typography.heading.font": "https://evil.example/x.css" } },
  })).rejects.toThrow();
});

it("execute returns normalized changes for a valid update", async () => {
  const result = await invokeExecute({
    operation: "theme.settings.update",
    input: { patch: { "typography.heading.font": "dm-sans", "motion.enabled": false } },
  });
  expect(result.changes).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: "typography.heading.font", value: "dm-sans" }),
    expect.objectContaining({ path: "motion.enabled", value: false }),
  ]));
});
```

Cover settings persistence through `ctx.kv` under `settings:theme`, default fallback when missing, reset behavior, MCP tool permissions, `destructive` metadata, and output schema validation.

- [ ] **Step 2: Run plugin tests and verify the expected failure**

Run:

```bash
pnpm --filter @emdash-cms/theme-tokens test -- plugin.test.ts
```

Expected: FAIL because native plugin routes and operation dispatch are not implemented.

- [ ] **Step 3: Implement the native plugin and MCP operation registry**

Follow `packages/page-composer/src/plugin.ts` and `packages/plugins/mcp-smoke/src/sandbox-entry.ts` patterns. Declare `settings:read` for search and `settings:manage` for execute. Use `definePlugin`, Zod route inputs, and `mcp.tools` entries. Read/write the single JSON settings object through `ctx.kv.get("settings:theme")` and `ctx.kv.set("settings:theme", value)`. Return operation descriptions from a static registry and dispatch only known operations.

Do not import Code Mode or expose generated JavaScript execution. The execute handler must parse the selected operation input with the operation’s schema, apply `applyThemePatch`, persist the normalized result, and return the exact change summary.

Implement the admin page with grouped controls for color, typography, Google Fonts delivery, motion, layout, shape, elevation, and variants. It must call the same routes/operation registry as MCP and show validation errors and the normalized saved state.

- [ ] **Step 4: Run focused tests and typechecks**

Run:

```bash
pnpm --filter @emdash-cms/theme-tokens test
pnpm --filter @emdash-cms/theme-tokens typecheck
pnpm --filter @emdash-cms/theme-tokens build
```

Expected: all plugin and pure package tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/theme-tokens
git commit -m "feat: expose theme settings through native MCP tools"
```

### Task 3: Integrate theme settings into the Cloudflare template

**Files:**
- Modify `templates/commerce-cloudflare/package.json`.
- Modify `templates/commerce-cloudflare/astro.config.mjs`.
- Modify `templates/commerce-cloudflare/src/layouts/Base.astro`.
- Modify `pnpm-lock.yaml` and workspace metadata through `pnpm install`.

**Interfaces:**
- `Base.astro` reads `getPluginSetting("emdash-theme-tokens", "theme")`, passes raw data to `resolveThemeSettings`, and emits `emitThemeCss` output.
- `astro.config.mjs` installs `themeTokensPlugin()` as a trusted native plugin.
- The existing Commerce/Page Composer/analytics/CHIP plugin behavior remains intact.

- [ ] **Step 1: Write the failing template integration test**

Create `templates/commerce-cloudflare/tests/theme-runtime.test.ts` and `templates/commerce-cloudflare/src/lib/theme-runtime.ts`. The helper must expose:

```ts
export function renderThemeCss(raw: unknown): string;
```

The test must assert that missing settings emit `--theme-*` variables and that a valid raw `theme` override changes the emitted brand variable. It must fail before integration because the helper and package import do not exist.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare test -- theme-runtime.test.ts
```

Expected: FAIL because `renderThemeCss` and the theme-token dependency are not implemented.


- [ ] **Step 3: Install plugin and wire runtime resolution**

Add the workspace dependency and import `themeTokensPlugin`. Add the plugin to the existing EmDash plugin list without changing Commerce bridge configuration. In `Base.astro`, read the plugin setting with the existing EmDash runtime settings API, resolve it with the pure package function, and inject a scoped `<style>` block generated by `emitThemeCss`.

Use default settings when no record exists. Do not self-fetch an HTTP route. Add semantic classes/data attributes for variants and motion state that CSS can consume.

- [ ] **Step 4: Verify template integration**

Run:

```bash
pnpm install
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Expected: typecheck and production build pass with token CSS included.

- [ ] **Step 5: Commit**

```bash
git add templates/commerce-cloudflare/package.json templates/commerce-cloudflare/astro.config.mjs templates/commerce-cloudflare/src/layouts/Base.astro pnpm-lock.yaml
git commit -m "feat: wire theme tokens into commerce template"
```

### Task 4: Refactor the template into a generic Astra-inspired storefront

**Files:**
- Modify `templates/commerce-cloudflare/src/styles/storefront.css`.
- Modify `templates/commerce-cloudflare/src/layouts/Base.astro`.
- Modify `templates/commerce-cloudflare/src/pages/index.astro`.
- Rename and modify `templates/commerce-cloudflare/src/components/ZiasStoryBlocks.astro` to `StoryBlocks.astro`.
- Modify `CmsPageContent.astro`, `ComposerSections.astro`, `ClientCatalog.astro`, `ClientProductDetail.astro`, `ProductCard.astro`, `ProductGallery.astro`, `ClientFeaturedProduct.astro`, and `DemoNotice.astro`.
- Modify the commerce-facing page files listed in the file map.
- Remove `templates/commerce-cloudflare/src/lib/zias-media.ts`.
- Replace `src/data/demo-catalog.mjs` and add neutral local demo media under `public/media/demo/`.
- Replace `seed/seed.json` with neutral content.

**Interfaces:**
- Existing Commerce client and Page Composer APIs remain unchanged.
- Existing data attributes used by cart/catalog scripts remain unchanged.
- CSS variables from Task 1 are the only source for theme colors, typography, spacing, radii, shadows, and motion values.
- ZIAS-specific implementation details are removed, while client identity/content remain CMS-driven.

- [ ] **Step 1: Write the failing generic-seed contract test**

Extend `templates/commerce-cloudflare/tests/theme-runtime.test.ts` with:

```ts
it("ships neutral starter content", async () => {
  const seed = (await import("../seed/seed.json")).default;
  expect(seed.meta.name).toBe("EmDash Commerce Starter");
  expect(JSON.stringify(seed)).not.toContain("ZIAS");
});
```

This must fail before the refactor because the current seed is named for ZIAS and contains ZIAS content.

- [ ] **Step 2: Run the focused test and verify the expected failure**

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare test -- theme-runtime.test.ts
```

Expected: FAIL on the neutral starter-content assertion.

- [ ] **Step 3: Replace the shell and component styling**

Implement:

- utility bar plus conventional header with logo, nav, search, and cart;
- two-row mobile header without horizontal overflow;
- restrained split hero with one primary CTA;
- contained product-first grid with responsive 4/2/1 columns;
- consistent product card, detail, cart, and checkout surfaces;
- bounded story/content sections using neutral CMS data;
- compact footer and empty/error states;
- token-driven typography roles and Google font declarations;
- CSS-only subtle hover/reveal motion with reduced-motion override;
- closed variant selectors for header, hero, button, card, and footer.

Remove all `ZIAS_MEDIA` imports, `PUBLIC_ZIAS_DEMO_MEDIA_FALLBACK`, ZIAS alt text, ZIAS product IDs, and ZIAS story labels from reusable source. Use neutral local demo illustrations so the generic preview remains visually complete without client data.

Do not add filters, reviews, testimonials, payment providers, or other capabilities absent from the current contract.

- [ ] **Step 4: Verify browser behavior and template build**

Start the actual template server and use the browser harness to verify:

```text
homepage title and neutral identity;
header/nav/search/cart;
hero and featured product grid;
shop/product/cart/checkout routes;
mobile layout without horizontal overflow;
card hover/reveal motion;
reduced-motion rendering;
cart add/remove/update behavior.
```

Run:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Expected: browser smoke and production build pass.

- [ ] **Step 5: Commit**

```bash
git add templates/commerce-cloudflare
git commit -m "feat: refactor commerce template into generic storefront"
```

### Task 5: Add onboarding, typography, motion, and MCP documentation

**Files:**
- Modify `templates/commerce-cloudflare/README.md`.
- Modify `docs/src/content/docs/guides/commerce-distribution.mdx`.
- Create `docs/src/content/docs/guides/theme-tokens.mdx`.
- Modify `docs/src/content/docs/guides/theme-composition.mdx`.
- Modify `packages/theme-tokens/README.md`.

**Interfaces:**
- Documentation examples must use the exact package name `@emdash-cms/theme-tokens`, plugin ID `emdash-theme-tokens`, and MCP tool names exposed by the implementation.
- Examples must use neutral client configuration, not ZIAS-specific data.

- [ ] **Step 1: Write the documentation**

Document the exact package/plugin installation, neutral client onboarding, token groups, typography roles, Google Fonts preview versus production self-hosting, motion accessibility, the two-tool MCP search/execute flow, `settings:read`/`settings:manage` permissions, and the boundary between theme structure, EmDash content, Page Composer, and the future repository/code concierge workflow.

Use these exact examples:

```ts
import { themeTokensPlugin } from "@emdash-cms/theme-tokens";

themeTokensPlugin();
```

```text
theme search: "heading font and subtle product motion"
theme execute: theme.settings.update
```

State that arbitrary CSS, code, remote URLs, and unregistered fonts are rejected.

- [ ] **Step 2: Run focused docs checks**

Run:

```bash
pnpm --filter docs exec astro check
```

Expected: the changed theme-token and theme-composition pages produce no new diagnostics. Record unrelated pre-existing docs/toolchain diagnostics separately.


- [ ] **Step 3: Commit**

```bash
git add templates/commerce-cloudflare/README.md packages/theme-tokens/README.md docs/src/content/docs/guides
git commit -m "docs: document configurable commerce theme"
```

### Task 6: Run complete changed-contract verification and review

**Files:**
- Modify only tests or source files required by verified failures from Tasks 1–5.

**Interfaces:**
- All public exports, plugin routes, MCP tools, theme settings, and template behavior match the spec.

- [ ] **Step 1: Run changed-contract package tests and typechecks**

```bash
pnpm commerce:test
pnpm commerce:typecheck
pnpm --filter @emdash-cms/theme-tokens test
pnpm --filter @emdash-cms/theme-tokens typecheck
pnpm --filter @emdash-cms/theme-tokens build
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

- [ ] **Step 2: Run the actual browser smoke flow**

Launch the template server, exercise homepage/shop/product/cart/checkout at desktop and mobile widths, open the admin Theme Settings page, apply a valid typography/motion/color update through the native plugin route or MCP request, reload the storefront, and verify the rendered CSS variables/components changed. Verify invalid font/CSS updates fail and reduced-motion suppresses nonessential animation.

- [ ] **Step 3: Run repository hygiene checks**

```bash
git diff --check
git status --short
```

No generated output, ZIAS client assets, secrets, or ignored scratch files may be added to the commit.


- [ ] **Step 4: Prepare final code review package**

Use the subagent-driven-development review workflow to generate the whole-branch diff package, dispatch the final reviewer, address load-bearing findings through a single fix/re-review loop, and report any baseline failures separately from changed-contract verification.
