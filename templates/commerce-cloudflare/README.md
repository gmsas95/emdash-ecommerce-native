# EmDash Commerce Cloudflare Template

A neutral, product-first Astro storefront for EmDash Commerce on Cloudflare. The starter combines EmDash CMS, Commerce Core, the constrained native Page Composer, consent-aware analytics adapters, the native theme-token plugin, and the CHIP payment provider bridge.

The template is intentionally client-neutral: site identity, editorial content, media, navigation, catalog data, and validated visual settings are CMS/seed data rather than reusable theme source.

## Install and run

From the distribution root:

```bash
pnpm install
pnpm --filter @emdash-cms/template-commerce-cloudflare dev
```

The template declares `@emdash-cms/theme-tokens` as a workspace dependency and registers its trusted native plugin in `astro.config.mjs`. It also declares the Commerce, Page Composer, analytics, Cloudflare, and provider packages used by the starter.

## First boot and seed data

`package.json` points EmDash at `seed/seed.json`. On the first boot against an empty D1 database, when setup has not been completed, EmDash applies that seed and creates the neutral starter collections, menus, sections, settings, and sample catalog content. Existing databases are not overwritten by later builds. Replace or evolve CMS data through the admin interface and the documented seed/schema workflow rather than editing storefront components for client content.

The starter uses these Cloudflare bindings from `wrangler.jsonc`:

- `DB` — D1 database for EmDash CMS and Commerce data;
- `MEDIA` — R2 bucket for CMS media;
- `SESSION` — KV namespace for sessions.

Create or select the corresponding resources for each environment before deploying. Binding IDs and names in the example configuration are starter values; use the resources assigned to your site.

## Production environment

The Astro configuration requires these process environment values for a production build:

- `PUBLIC_SITE_URL` — canonical storefront URL, used to construct signed provider bridge endpoints;
- `COMMERCE_BRIDGE_SECRET` — random server-side secret shared by Commerce Core and the registered CHIP provider bridge.

Development supplies a local URL when `PUBLIC_SITE_URL` is absent and does not require the production guard. Do not commit the bridge secret or provider credentials. Enter provider credentials in the provider plugin's server-side settings and provide the production values through your deployment environment.

Build and deploy with the package scripts after Cloudflare bindings and environment values are configured:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare build
pnpm --filter @emdash-cms/template-commerce-cloudflare deploy
```

## Native packages and plugin registration

`astro.config.mjs` registers these trusted native packages:

- `@emdash-commerce/core` — products, variants, inventory, carts, checkout, orders, and signed provider bridges;
- `@emdash-cms/page-composer` — validated responsive section layouts and the trusted editor;
- `@emdash-cms/analytics-core` — consent, normalized events, queueing, deduplication, and failure isolation;
- `@emdash-cms/analytics-facebook`, `@emdash-cms/analytics-tiktok`, and `@emdash-cms/analytics-ga4` — independently enabled browser adapters;
- `@emdash-cms/theme-tokens` — versioned visual settings, safe CSS custom properties, Theme Settings admin, and the two-tool theme MCP surface;
- `@chip-in-asia/plugin-chip-for-emdash` — the provider plugin used by the starter's signed payment bridge.

The theme plugin registration is:

```ts
import { themeTokensPlugin } from "@emdash-cms/theme-tokens";

themeTokensPlugin();
```

The theme runtime reads `getPluginSetting("emdash-theme-tokens", "theme")`, resolves missing or invalid values to the package defaults, and emits the CSS used by storefront components. It does not make a network request to render the storefront.

## Theme composition and customization

The Astro theme owns markup, behavior, responsive rules, accessibility, commerce interactions, and the approved component variants. EmDash owns site identity, content, media, menus, catalog, and the validated theme settings. Page Composer can insert and arrange registered sections; it does not accept arbitrary HTML, CSS, JavaScript, pixel coordinates, or copied Commerce state.

Configure colors, typography, layout, shape, elevation, motion, and header/hero/button/card/footer variants in the **Theme Settings** admin page. The same bounded settings are available through the plugin's `emdash-theme-tokens__search` and `emdash-theme-tokens__execute` MCP tools. Unknown fonts, remote URLs, arbitrary CSS, and unsupported values are rejected. See the [theme-token guide](/guides/theme-tokens/) and [theme composition guide](/guides/theme-composition/).

## Provider boundary

CHIP remains a separate provider boundary even though this reference template registers its plugin. Commerce Core owns canonical products, inventory, carts, checkout, orders, payment state, and totals. The provider plugin owns its SDK, credentials, API calls, webhook verification, retries, and provider records. Communication uses the signed bridge configured in `astro.config.mjs`; provider credentials and bridge secrets never enter storefront content or analytics events.

## Analytics semantics

The template emits `page_view`, `view_item`, and `add_to_cart` from storefront actions. `purchase` and `refund` require `source: "server"` and must come from server-confirmed Commerce state; a payment return URL never emits either event. Required consent is honored before provider scripts load or events dispatch.
