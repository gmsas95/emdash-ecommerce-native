# EmDash Commerce Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal EmDash distribution with Commerce Core, constrained native page composition, and consent-aware Facebook Pixel, TikTok Pixel, and GA4 tracking while leaving external payment and fulfillment integrations sandboxed.

**Architecture:** Preserve upstream EmDash as the distribution base and add focused workspace packages. Commerce Core owns canonical commercial state, `page-composer` owns validated versioned section layouts and trusted admin composition, and `analytics-core` owns normalized events, consent, queueing, and deduplication. Browser provider calls are isolated in independent first-party analytics adapters; payment/shipping/fulfillment providers remain sandboxed plugins connected through signed Commerce bridge contracts.

**Tech Stack:** TypeScript 6, pnpm 11 workspace, EmDash native plugin APIs, Astro server rendering, React/Kumo admin UI, Zod, Vitest, Cloudflare-compatible Web APIs.

**Spec:** `docs/superpowers/specs/2026-08-31-emdash-commerce-distribution-design.md` in the Commerce Core source checkout.

## Global Constraints

- Preserve upstream EmDash history and keep an `upstream` remote.
- Keep Commerce Core provider-neutral; provider SDKs, credentials, callbacks, and provider records stay outside it.
- Validate page layouts and reject unknown section types or unsupported settings at the storage/API boundary.
- Do not persist arbitrary HTML, JavaScript, CSS, or pixel-positioned layout data.
- `analytics-core` must not depend on Commerce Core; Commerce is one event producer.
- Do not load or dispatch analytics before required consent; analytics failures never block public pages or checkout.
- Emit `purchase` only from server-confirmed paid Commerce state, never from a browser return query parameter.
- Exclude payment credentials, access tokens, full addresses, and unnecessary personal data from analytics payloads.
- Use existing EmDash extension points and package conventions; do not patch core when a native plugin API is sufficient.
- Skip formatters, linters, and project-wide suites during individual tasks; run final verification once.

---

### Task 1: Create the distribution workspace contract

**Files:**
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Create: `packages/commerce-contracts/package.json`
- Create: `packages/commerce-core/package.json`
- Create: `docs/content/docs/guides/commerce-distribution.mdx`
- Test: `packages/commerce-contracts/tests/package-boundary.test.ts`

**Interfaces:**
- Produces workspace packages named `@gmsas95/emdash-commerce-contracts` and `@emdash-commerce/core`.
- Keeps `analytics-core`, `page-composer`, and provider adapters as separate package names for later tasks.

- [ ] **Step 1: Add Commerce packages to the workspace manifest**

  Add the package directories under the existing `packages/*` workspace glob and add root scripts that run Commerce package checks without replacing EmDash's existing scripts:

  ```json
  {
    "commerce:typecheck": "pnpm --filter @gmsas95/emdash-commerce-contracts --filter @emdash-commerce/core typecheck",
    "commerce:test": "pnpm --filter @emdash-commerce/core test"
  }
  ```

- [ ] **Step 2: Add package manifests with EmDash-compatible peer ranges**

  `@gmsas95/emdash-commerce-contracts` exposes only its built contract entrypoint. `@emdash-commerce/core` exports its native plugin, admin entrypoint, storefront helpers, and domain helpers, and declares `emdash` and `react` as peers.

- [ ] **Step 3: Add a boundary test**

  ```ts
  it("keeps the provider-neutral package free of provider dependencies", async () => {
    const manifest = await import("../package.json", { with: { type: "json" } });
    expect(manifest.default.dependencies ?? {}).not.toHaveProperty("chip-sdk");
    expect(manifest.default.dependencies ?? {}).not.toHaveProperty("stripe");
  });
  ```

- [ ] **Step 4: Document the distribution installation contract**

  Document one workspace install, native package registration, and the separate marketplace installation path for provider plugins. Link to the existing Commerce boundary documentation.

- [ ] **Step 5: Run the package-boundary test**

  Run `pnpm --filter @gmsas95/emdash-commerce-contracts test -- package-boundary.test.ts`.
  Expected: PASS; no provider SDK dependency is present.

---

### Task 2: Migrate Commerce contracts and core

**Files:**
- Create: `packages/commerce-contracts/src/**` from the Commerce Core source checkout
- Create: `packages/commerce-contracts/tests/**` from the Commerce Core source checkout
- Create: `packages/commerce-core/src/**` from the Commerce Core source checkout
- Create: `packages/commerce-core/test/**` from the Commerce Core source checkout
- Modify: `packages/commerce-contracts/package.json`
- Modify: `packages/commerce-core/package.json`
- Modify: `packages/commerce-core/tsconfig.json`
- Create: `packages/commerce-contracts/README.md`
- Create: `packages/commerce-core/README.md`

**Interfaces:**
- Consumes the existing Commerce contract and plugin APIs without changing public names.
- Produces the same `CommerceEvent<T>`, bridge signing, storage declaration, Store API, and `commercePlugin` exports.

- [ ] **Step 1: Copy source and tests without generated output**

  Copy only `src`, `test`, `package.json`, and package configuration from the Commerce source checkout. Do not copy `dist`, `node_modules`, or deployment credentials.

- [ ] **Step 2: Normalize workspace dependencies**

  Replace the Commerce-local `zod` range with the EmDash catalog entry and preserve the workspace contract dependency. Keep the Commerce package's `emdash >=0.33.0` peer until the distribution runtime proves a tighter range.

- [ ] **Step 3: Resolve EmDash type and module differences**

  Keep the existing `definePlugin`/`PluginDescriptor` integration shape. Any import adjustment must preserve the current route names, collection declarations, signed bridge envelope, and authenticated admin behavior.

- [ ] **Step 4: Run Commerce package tests only**

  Run `pnpm --filter @emdash-commerce/core test` and `pnpm --filter @gmsas95/emdash-commerce-contracts typecheck`.
  Expected: the migrated tests pass without provider credentials or network access.

---

### Task 3: Implement validated native page composition

**Files:**
- Create: `packages/page-composer/package.json`
- Create: `packages/page-composer/src/layout.ts`
- Create: `packages/page-composer/src/registry.ts`
- Create: `packages/page-composer/src/validation.ts`
- Create: `packages/page-composer/src/plugin.ts`
- Create: `packages/page-composer/src/admin.tsx`
- Create: `packages/page-composer/src/astro/index.ts`
- Create: `packages/page-composer/tests/layout.test.ts`
- Create: `packages/page-composer/tests/registry.test.ts`
- Create: `packages/page-composer/README.md`

**Interfaces:**
- `PageLayout = { version: 1; sections: SectionInstance[] }`.
- `SectionInstance = { id: string; type: string; settings: Record<string, unknown>; layout?: ResponsiveLayout; visibility?: ResponsiveVisibility }`.
- `SectionDefinition = { type: string; label: string; category: SectionCategory; settingsSchema: z.ZodType; render: AstroComponent; supportedPresets: readonly string[] }`.
- `createPageComposerPlugin(options)` registers authenticated layout routes and the trusted native editor.
- `renderPageLayout(layout, registry, context)` validates and renders registered sections in order.

- [ ] **Step 1: Write failing layout validation tests**

  Cover version mismatch, duplicate/empty IDs, unknown section types, malformed settings, unsupported layout presets, and valid desktop/tablet/mobile visibility.

  ```ts
  it("rejects an unknown section type", () => {
    expect(() => parsePageLayout({ version: 1, sections: [{ id: "hero-1", type: "missing", settings: {} }] }, registry)).toThrow("Unknown section type");
  });
  ```

- [ ] **Step 2: Implement schema and registry validation**

  Use Zod at the API/storage boundary. Keep arbitrary HTML, JavaScript, CSS, and pixel coordinates outside the accepted schema.

- [ ] **Step 3: Implement native plugin routes and admin editor**

  Provide authenticated read/write layout routes, section insertion, reorder, duplicate, remove, settings editing, responsive visibility, and preview. Use Block Kit for property fields only; the section tree and preview remain trusted React UI.

- [ ] **Step 4: Implement Astro rendering**

  Render registered sections server-side with page context. Commerce sections consume published Commerce APIs and never persist copied price or inventory values.

- [ ] **Step 5: Add initial registered section definitions**

  Include hero, image/text, feature columns, FAQ, product grid, featured product, category grid, reviews, announcement strip, and newsletter/contact CTA. Each definition must expose a renderer and a validated settings schema.

- [ ] **Step 6: Run focused composer tests**

  Run `pnpm --filter @emdash-cms/page-composer test`.
  Expected: validation rejects unsafe or malformed layouts and accepts the supported composition contract.

---

### Task 4: Implement analytics core and first-party adapters

**Files:**
- Create: `packages/analytics-core/package.json`
- Create: `packages/analytics-core/src/types.ts`
- Create: `packages/analytics-core/src/consent.ts`
- Create: `packages/analytics-core/src/dispatcher.ts`
- Create: `packages/analytics-core/src/plugin.ts`
- Create: `packages/analytics-core/tests/dispatcher.test.ts`
- Create: `packages/analytics-facebook/package.json`
- Create: `packages/analytics-facebook/src/index.ts`
- Create: `packages/analytics-tiktok/package.json`
- Create: `packages/analytics-tiktok/src/index.ts`
- Create: `packages/analytics-ga4/package.json`
- Create: `packages/analytics-ga4/src/index.ts`
- Create: `packages/analytics-core/README.md`

**Interfaces:**
- `AnalyticsEvent` contains `id`, `name`, `occurredAt`, optional `currency`, `value`, `items`, `page`, and scalar `properties`.
- `AnalyticsAdapter` contains `id`, `load(): Promise<void>`, `track(event): void`, and optional `flush(): void`.
- `AnalyticsDispatcher.track(event)` gates, queues, deduplicates, and dispatches events to enabled adapters.
- `createAnalyticsPlugin(options)` registers settings and trusted page-fragment script loading.

- [ ] **Step 1: Write failing dispatcher tests**

  Cover consent denial, consent grant after queueing, adapter readiness, stable-ID deduplication, adapter failure isolation, and `purchase` acceptance only when emitted by the server-confirmed Commerce producer.

  ```ts
  it("dispatches one purchase for a repeated event ID", async () => {
    const adapter = fakeAdapter();
    const dispatcher = createDispatcher({ adapters: [adapter], consent: () => true });
    await dispatcher.track(purchaseEvent);
    await dispatcher.track(purchaseEvent);
    expect(adapter.track).toHaveBeenCalledTimes(1);
  });
  ```

- [ ] **Step 2: Implement normalized event types and dispatcher**

  Keep analytics-core independent from Commerce Core. Enforce scalar property values and reject sensitive fields at the boundary.

- [ ] **Step 3: Implement consent-aware script fragments**

  Register `page:fragments` only as a trusted native hook with the documented capability. Load provider scripts only after the consent source allows them; use `errorPolicy: "continue"` for noncritical failures.

- [ ] **Step 4: Implement Facebook, TikTok, and GA4 adapters**

  Map the canonical events to provider APIs. Adapters must be independently enabled and must never expose provider credentials or accept raw payment data.

- [ ] **Step 5: Run focused analytics tests**

  Run `pnpm --filter @emdash-cms/analytics-core test`.
  Expected: consent, queuing, deduplication, and failure isolation pass deterministically without browser network access.

---

### Task 5: Integrate the commerce starter and native settings

**Files:**
- Modify: `templates/starter-cloudflare/astro.config.mjs`
- Create or modify: `templates/commerce-cloudflare/astro.config.mjs`
- Modify: `templates/commerce-cloudflare/src/layouts/**`
- Modify: `templates/commerce-cloudflare/src/pages/**`
- Modify: `templates/commerce-cloudflare/src/live.config.ts`
- Modify: `templates/commerce-cloudflare/README.md`
- Modify: `packages/commerce-core/src/plugin.ts`
- Modify: `packages/analytics-core/src/plugin.ts`
- Modify: `packages/page-composer/src/plugin.ts`

**Interfaces:**
- The starter registers Commerce Core, page composer, analytics core, and selected adapters as native plugins.
- CHIP remains a separately installed provider plugin and communicates through the signed bridge.

- [ ] **Step 1: Register native plugins in the commerce template**

  Keep provider configuration server-side. Add explicit settings for analytics IDs, consent mode/source, environment, debug mode, and data-sharing controls.

- [ ] **Step 2: Add semantic event producers**

  Emit `page_view`, `view_item`, `search`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`, `refund`, and `lead` from server-authoritative or normalized theme/Commerce actions. Do not emit purchase from a success query parameter.

- [ ] **Step 3: Add a composed home/catalog example**

  Seed a versioned section layout that references live CMS and Commerce data. Preserve existing ZIAS demo content and label all demo state accurately.

- [ ] **Step 4: Run the template typecheck**

  Run `pnpm run --filter @gmsas95/emdash-commerce-starter typecheck`.
  Expected: the template resolves all native plugin entries and retains its existing route/API types.

---

### Task 6: Complete documentation and release migration notes

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `packages/core/README.md`
- Modify: `docs/content/docs/plugins/overview.mdx`
- Modify: `docs/content/docs/plugins/installing.mdx`
- Create: `docs/content/docs/guides/commerce-distribution.mdx`
- Create: `docs/content/docs/guides/theme-composition.mdx`
- Create: `docs/content/docs/guides/analytics-tracking.mdx`
- Create: `docs/content/docs/guides/provider-plugins.mdx`
- Modify: `templates/commerce-cloudflare/README.md`

**Interfaces:**
- Documentation names the same package boundaries, event names, settings, installation flow, and security invariants as the source.

- [ ] **Step 1: Document the distribution and package map**

  Explain the upstream fork model, native package install, compatibility/versioning, and the provider boundary.

- [ ] **Step 2: Document theme authoring**

  Show `PageLayout`, section registry requirements, supported editor operations, Block Kit's role, live Commerce references, and prohibited arbitrary code.

- [ ] **Step 3: Document analytics configuration**

  Show consent flow, canonical events, adapter settings, server-confirmed purchase semantics, deduplication, and data minimization.

- [ ] **Step 4: Document marketplace provider installation**

  Show capability review, server-side secret entry, bridge configuration, connection testing, and CHIP as the reference provider boundary.

- [ ] **Step 5: Validate links and examples**

  Run a link check scoped to changed Markdown/MDX files and a TypeScript check for code snippets. Fix every changed-file failure before final verification.

---

### Task 7: Run final verification

**Files:**
- Test: all changed package and template test suites

- [ ] **Step 1: Run package typechecks**

  Run `pnpm run typecheck` and `pnpm run --filter {./packages/**} typecheck`.

- [ ] **Step 2: Run focused and project test suites**

  Run Commerce, page-composer, and analytics package tests, then `pnpm test`.

- [ ] **Step 3: Build the distribution packages**

  Run `pnpm run build`.
  Expected: native package exports and template imports resolve without generated-file or private-import errors.

- [ ] **Step 4: Exercise the storefront smoke path**

  Launch the commerce template, load a published product, add it to cart, enter checkout, and confirm that a paid-order fixture produces one `purchase` event while an unconfirmed return does not.

- [ ] **Step 5: Review the final diff**

  Confirm no credentials, generated `dist`, `node_modules`, provider SDK payloads, arbitrary layout execution, or unrelated upstream changes entered the distribution.
