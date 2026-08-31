# EmDash Commerce Cloudflare Template

Reference Cloudflare storefront for the personal EmDash Commerce distribution. It combines EmDash CMS, Commerce Core, the constrained native Page Composer, and consent-aware Facebook Pixel, TikTok Pixel, and GA4 adapters in one deployable Astro template.

## Install and run

From the distribution root:

```bash
pnpm install
pnpm --filter @emdash-cms/template-commerce-cloudflare dev
```

The template uses D1 for CMS and Commerce data and R2 for media. Configure the bindings in `wrangler.jsonc` and set these environment values for a production build:

- `PUBLIC_SITE_URL` — canonical storefront URL;
- `COMMERCE_BRIDGE_SECRET` — random secret shared with the separately installed CHIP provider plugin;
- `PUBLIC_ZIAS_DEMO_MEDIA_FALLBACK` — optional local media fallback switch.

Never commit the bridge secret or provider credentials. Enter provider secrets in the provider plugin's server-side settings.

## Native packages

`astro.config.mjs` registers these trusted native packages:

- `@emdash-commerce/core` — products, variants, inventory, carts, checkout, orders, and signed provider bridges;
- `@emdash-cms/page-composer` — validated responsive section layouts and the trusted editor;
- `@emdash-cms/analytics-core` — consent, normalized events, queueing, deduplication, and failure isolation;
- `@emdash-cms/analytics-facebook`, `@emdash-cms/analytics-tiktok`, and `@emdash-cms/analytics-ga4` — independently enabled browser adapters.

Provider adapters receive only canonical analytics events. They do not receive payment credentials, access tokens, full addresses, or raw provider payloads.

## Provider plugins

CHIP remains a separate sandboxed provider plugin. It communicates with Commerce Core through the signed bridge configured in `astro.config.mjs`; Commerce Core remains authoritative for payment state and order transitions. Shipping, fulfillment, tax, marketing, and additional payment providers follow the same marketplace boundary.

## Theme composition

Pages with a saved layout in the native Page Composer render validated sections server-side. Layouts store section settings and live Commerce references, never copied prices or inventory. Pages without a saved layout retain the Portable Text fallback.

The editor supports section insertion, reordering, duplication, removal, validated settings, and constrained responsive presets. It does not persist arbitrary HTML, JavaScript, CSS, absolute positions, or pixel coordinates.

## Analytics semantics

The template emits `page_view`, `view_item`, and `add_to_cart` from storefront actions. `purchase` and `refund` require `source: "server"` and must come from server-confirmed Commerce state; a payment return URL never emits either event. Required consent is honored before provider scripts load or events dispatch.
