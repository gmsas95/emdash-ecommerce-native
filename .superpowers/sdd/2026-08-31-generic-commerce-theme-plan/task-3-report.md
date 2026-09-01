# Task 3 Report: Commerce Template Theme Integration

## Scope

Integrated the `@emdash-cms/theme-tokens` resolver and CSS emitter into the Cloudflare commerce template without changing storefront markup/styles, catalog data, or seed content.

## Implementation

- Added `@emdash-cms/theme-tokens` as a workspace dependency and registered `themeTokensPlugin()` as a trusted native EmDash plugin.
- Added the template Vitest script/configuration and focused `renderThemeCss` helper test.
- Added `src/lib/theme-runtime.ts` exporting `renderThemeCss(raw: unknown): string`; it resolves persisted settings through `resolveThemeSettings` and emits CSS with `emitThemeCss`.
- Updated `Base.astro` to read `getPluginSetting("emdash-theme-tokens", "theme")`, resolve and emit one generated theme CSS block, and expose resolved variant/motion state as body data attributes.
- Updated `pnpm-lock.yaml` with only the pre-existing theme package importer plus the required template dependency/devDependency importer entries.

## TDD evidence

### RED

The required focused command was run before the template test script/dependency integration:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare test -- theme-runtime.test.ts
```

At that point the package had no `test` script and the command did not execute Vitest. After the test script and dependency were added but before lockfile installation, the same command failed with:

```text
ERR_PNPM_VERIFY_DEPS_BEFORE_RUN
The lockfile ... does not satisfy project of id templates/commerce-cloudflare
Run "pnpm install"
```

### GREEN

Focused template test:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare test -- theme-runtime.test.ts
```

Result: 1 test file passed, 3 tests passed.

Template typecheck:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
```

Result: Astro diagnostics reported 0 errors, 0 warnings, and 0 hints; contracts/core typechecks passed.

Template production build:

```bash
PUBLIC_SITE_URL=http://localhost:4321 COMMERCE_BRIDGE_SECRET=test-secret pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Result: production Cloudflare server build completed successfully. Existing Vite chunk-size/ineffective dynamic import warnings remain.

Theme package checks:

```bash
pnpm --filter @emdash-cms/theme-tokens test
pnpm --filter @emdash-cms/theme-tokens typecheck
pnpm --filter @emdash-cms/theme-tokens build
```

Result: 37 package tests passed; typecheck and build passed.

## Commit

Implementation commit: `a0fd8bda` (`feat: wire theme tokens into commerce template`).
