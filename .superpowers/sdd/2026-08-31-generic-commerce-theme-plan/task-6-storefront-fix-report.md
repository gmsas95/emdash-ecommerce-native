# Task 6 storefront final review report

## Scope

- Replaced starter `$media` seed references with supported external `MediaValue` objects pointing at bundled `/media/demo/*.svg` assets. The values are provider-neutral for rendering (`provider: "external"`) and do not trigger seed downloads or hotlinking.
- Added a focused seed contract test that rejects `$media`, verifies all six bundled image values, and runs each value through core media normalization while asserting the local `src` is preserved.
- Applied the UI font family, weight, and style tokens to cart line price/total and featured-product price/CTA selectors.
- Applied `--theme-layout-componentSpacing` only to component-level spacing (demo notice placement, form stack, cart layout/rows/summary, and featured-card split). Existing micro-spacing constants remain unchanged to avoid distorting controls and card internals.
- Updated the commerce template build script to build `@emdash-cms/theme-tokens` before its contracts/core dependencies, so a clean checkout does not rely on ignored theme-token output.

## Verification evidence

- `pnpm --filter @emdash-cms/template-commerce-cloudflare test -- theme-runtime.test.ts`
  - Vitest: 1 file passed, 4 tests passed.
- `pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck`
  - Astro, commerce contracts, and core typechecks completed with 0 errors, 0 warnings, and 0 hints.
- `PUBLIC_SITE_URL=http://localhost:4321 COMMERCE_BRIDGE_SECRET=test-secret pnpm --filter @emdash-cms/template-commerce-cloudflare build`
  - Theme tokens, commerce contracts, core, and Astro server build all completed successfully.
  - Existing Vite chunk-size and ineffective dynamic-import warnings remain; no build error occurred.
- Browser smoke at `http://127.0.0.1:4321/` and `/shop`
  - Homepage and product listing rendered with bundled image assets.
  - Product detail route loaded, add-to-cart incremented the cart count to 1, and `/cart` rendered its retry fallback because no commerce bridge service was available in the local smoke environment.

## Committed source hashes

Commits: `a9d8ed06`, `f276298b`

```text
3d450aa90efbd15b0e75cc22abc9f2922c237d7ce67642bc699eb7d825c1e679  templates/commerce-cloudflare/package.json
bc3e32a3e629bd78c0262a53604608270065332340feb63f16810f5782d53407  templates/commerce-cloudflare/seed/seed.json
98c0e1500755372d68a00c0915b3866ad1b4a71f3d2a3ca621ac311c58fdf8dd  templates/commerce-cloudflare/src/components/ClientFeaturedProduct.astro
351e4e615542c845b7cc07bfdc4c047f4d7ca849433c12974e11e4a8e4bda0eb  templates/commerce-cloudflare/src/pages/cart.astro
46b7a8f7fc3954e3174d75a936a79c5a3dbc766592221fa1d38acd3b5756adf7  templates/commerce-cloudflare/src/styles/storefront.css
adba4119405d9e16ca775b462ed826a511a046d42f440ef2427c1f1bcf0d2339  templates/commerce-cloudflare/tests/theme-runtime.test.ts
```
