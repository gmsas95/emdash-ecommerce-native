# Generic Astra-Inspired Commerce Theme

**Status:** Draft for user review
**Date:** 2026-08-31

## Problem

The current Commerce Cloudflare template is a ZIAS client demo rather than a reusable theme. Its visual language is overly editorial, and client-specific copy, media, product IDs, and fallbacks are coupled to the reusable storefront source. Theme customization would require editing Astro/CSS instead of changing controlled site settings.

## Goal

Refactor `templates/commerce-cloudflare` into a generic, Astra-inspired Commerce boilerplate for client sites such as ZIAS. The theme must provide a professional storefront structure, a typed design-token contract, and safe runtime customization through a native EmDash plugin and MCP.

Clients should be able to change approved visual decisions without Elementor, Breakdance, arbitrary CSS, or direct repository access.

## Non-goals

- Recreating Astra or WordPress Storefront source, assets, or markup.
- Building a general-purpose visual page builder.
- Allowing CMS users or MCP callers to inject Astro, JavaScript, CSS, or arbitrary remote resources.
- Providing a general-purpose code agent inside the production EmDash Worker.
- Replacing the separate future Flue repository/design concierge workflow.

## Design principles

1. **Theme owns structure.** Astro components own markup, behavior, responsive rules, accessibility, and Commerce integration.
2. **EmDash owns client data.** Site identity, content, media, menus, catalog, and validated theme settings come from CMS data.
3. **Tokens own visual decisions.** Components consume CSS custom properties and controlled variants rather than hardcoded brand values.
4. **Settings are bounded.** Every runtime value comes from a versioned schema with allowlists, range checks, normalization, and safe fallbacks.
5. **MCP is discoverable but narrow.** The plugin exposes only `search` and `execute`; execution dispatches a closed operation registry, not arbitrary model-written JavaScript.
6. **Progressive enhancement.** The storefront renders useful HTML without client-side animation or remote font dependencies.

## Architecture

### Reusable theme

`templates/commerce-cloudflare` remains the deployable Astro/Cloudflare template. It will be refactored to:

- use neutral starter identity, copy, content, and demo catalog values;
- remove ZIAS-specific media, product IDs, flags, and fallback behavior;
- preserve EmDash CMS, D1/R2, Commerce, Page Composer, cart, checkout, analytics, and responsive behavior;
- render typed sections and commerce components without a page-builder runtime;
- consume the theme-token resolver from a workspace package;
- keep starter seed data immediately previewable but client-neutral.

ZIAS will be represented by seed/settings/media data when onboarding that client. The reusable theme source will contain no ZIAS names or assets.

### Native theme-token package

Add `packages/theme-tokens` with the native plugin contract:

- `createPlugin()` and plugin descriptor;
- typed default tokens and variants;
- versioned Zod schemas;
- approved font registry;
- Google Fonts metadata and delivery configuration;
- settings storage and migration logic;
- token resolver and safe CSS-variable emitter;
- admin Theme Settings page;
- two MCP tools and their routes.

The package exports the schema/types for theme consumers and the resolver for `Base.astro`. The template includes the plugin as a trusted native plugin in its EmDash configuration.

## Design-token contract

The canonical settings object is versioned and namespaced:

```json
{
  "theme": {
    "version": 1,
    "tokens": {
      "color.brand": "#176b59",
      "color.brandHover": "#0e5143",
      "color.accent": "#f2b84b",
      "color.text": "#202934",
      "color.muted": "#68737f",
      "color.surface": "#ffffff",
      "color.surfaceAlt": "#f7f8fa",
      "color.border": "#e4e8ec",
      "layout.contentWidth": "1180px",
      "layout.narrowWidth": "720px",
      "layout.sectionSpacing": "72px",
      "layout.gridGap": "16px",
      "shape.radiusSmall": "8px",
      "shape.radiusMedium": "12px",
      "shape.radiusLarge": "16px",
      "elevation.card": "0 5px 16px rgba(32,41,52,0.06)",
      "elevation.floating": "0 16px 40px rgba(32,41,52,0.12)"
    },
    "typography": {
      "display": { "provider": "registry", "font": "plus-jakarta", "weight": 800 },
      "heading": { "provider": "registry", "font": "plus-jakarta", "weight": 700 },
      "body": { "provider": "registry", "font": "system-sans", "weight": 400 },
      "ui": { "provider": "registry", "font": "system-sans", "weight": 600 },
      "scale": "comfortable",
      "bodyLineHeight": "1.65",
      "headingTracking": "-0.04em"
    },
    "motion": {
      "enabled": true,
      "intensity": "subtle",
      "hover": "lift",
      "reveal": "fade",
      "durationScale": "standard",
      "easing": "standard"
    },
    "variants": {
      "header": "standard",
      "hero": "split",
      "button": "solid",
      "card": "elevated",
      "footer": "standard"
    }
  }
}
```

The exact persisted representation may use structured fields rather than dotted keys, but the public contract remains equivalent and versioned.

### Token categories

#### Colors

Brand, brand hover, accent, text, muted text, surface, alternate surface, borders, success, and danger.

#### Typography

Four semantic roles:

- `display`: hero and marketing headlines;
- `heading`: page and section headings;
- `body`: paragraphs and long-form CMS content;
- `ui`: navigation, labels, buttons, prices, forms, and metadata.

Each role supports an approved font family, weight, and style metadata. Global settings control scale, body leading, heading tracking, and text measure.

#### Layout

Content width, narrow text width, section spacing, grid gap, and component spacing.

#### Shape and elevation

Small/medium/large radii plus card and floating shadow presets.

#### Motion

Motion is enabled by default at subtle intensity. Supported settings are `none`, `subtle`, or `expressive` intensity; `none`, `lift`, or `soft-scale` hover behavior; `none`, `fade`, or `fade-up` reveal behavior; bounded duration scales; and an approved easing registry.

Motion uses CSS transforms, opacity, and safe color transitions. It must not shift layout or block first render. `prefers-reduced-motion: reduce` always disables nonessential movement regardless of the configured setting.

#### Component variants

Header, hero, button, card, and footer variants are closed enums. Variant changes switch known component styles; they do not alter markup or accept arbitrary class names.

## Typography and Google Fonts

The font registry includes system stacks and approved Google Fonts. MCP and admin settings select family IDs, never raw CSS URLs or arbitrary remote addresses.

The initial registry includes `system-sans`, `system-serif`, `inter`, `plus-jakarta`, `source-sans`, `source-serif`, and `dm-sans`.

A registry record contains:

- stable family ID;
- display name;
- provider;
- available weights;
- italic/variable support;
- supported subsets;
- license metadata;
- delivery capability.

Google Fonts settings may select a family, weights, subsets, and delivery mode:

- **Preview:** load the allowlisted family from Google Fonts CSS for rapid iteration.
- **Production:** self-host selected approved files through R2 or deployment assets by default.

Both modes use local fallback stacks and `font-display: swap`. The resolver limits weight/subset requests and rejects unsupported combinations. Production self-hosting avoids third-party visitor requests and makes rendering independent of Google availability.

The registry update process is controlled and pinned. A future registry update may add more Google families without changing the theme API.

## Native plugin storage and routes

The plugin stores one versioned global settings object in the standard native-plugin settings namespace:

```text
plugin:emdash-theme-tokens:settings:theme
```

Native plugin handlers read and write it through the plugin key-value API (`settings:theme`). The template resolver reads the same setting through EmDash's plugin-settings API, merges it with defaults, validates it, and emits the resolved token set. This keeps storefront SSR independent of a network request to its own site.

The plugin has only two private HTTP routes used by its admin page and MCP bridge:

```text
POST tokens/search
POST tokens/execute
```

The admin Theme Settings page and MCP tools use the same operation registry and validation path. The storefront does not call either route; it reads the namespaced setting through the runtime settings API and applies the pure resolver.

## MCP contract

The plugin exposes exactly two MCP tools through the EmDash plugin manifest:

```text
emdash-theme-tokens__search
emdash-theme-tokens__execute
```

EmDash namespaces plugin tool names to avoid collisions. Internally, the manifest keys are `search` and `execute`.

### Search

```text
permission: settings:read
input:  { query: string, area?: "tokens" | "typography" | "motion" | "variants" }
output: matching operation descriptions, allowed values, and input schemas
```

Search returns only relevant capability metadata rather than exposing the complete registry on every model turn.

### Execute

```text
permission: settings:manage
input:  { operation: string, input: unknown }
output: normalized operation result and applied change summary
```

The closed operation registry initially includes:

```text
theme.settings.get
theme.settings.update
theme.settings.reset
theme.fonts.list
theme.motion.get
theme.variants.list
```

The execute handler performs operation selection, per-operation schema validation, allowlist checks, normalization, persistence, and audit-friendly change summaries. Unknown operations fail closed.

The plugin adopts the Cloudflare Code Mode two-tool discovery shape, but does not embed arbitrary model-written JavaScript in the production theme plugin. A future code/design concierge remains a separate sandboxed repository workflow.

MCP callers can therefore issue requests such as:

```text
Use DM Sans for headings with weights 600 and 700.
Set the brand color to forest green.
Disable motion across the site.
Use the compact header and elevated product cards.
```

## Storefront structure

The default theme follows a familiar Astra-inspired commerce layout:

1. Utility bar with optional preview/site message.
2. Main header with logo, navigation, search, and cart.
3. Hero with short value proposition, CTA, and CMS-managed media.
4. Featured product grid with product-first cards.
5. Bounded content sections for benefits, story, trust, and client content.
6. Newsletter/contact CTA.
7. Compact footer with identity and navigation.

Commerce pages share the same design system:

- Shop: compact intro and predictable catalog grid.
- Product: gallery, purchase panel, variant/quantity controls, and product metadata.
- Cart: readable line items, quantities, subtotal, and checkout CTA.
- Checkout: focused form layout and order summary.

The mobile layout uses a two-row header, no horizontal navigation overflow, one-column content where required, and touch-sized controls.

## Security and privacy

- No arbitrary CSS, JavaScript, Astro, class names, HTML, or remote URLs are accepted from settings; Google Fonts are available only through the validated font registry and provider settings.
- Colors, dimensions, weights, font IDs, variants, motion values, and delivery settings are allowlisted and bounded.
- MCP search requires `settings:read`; execute requires `settings:manage` and plugin MCP consent.
- Execute writes are audited by EmDash’s plugin MCP audit path.
- Google Fonts remote loading is preview-only by default; production self-hosting avoids third-party requests.
- Theme settings contain no provider secrets.
- The theme-token plugin does not expose repository access, deployment credentials, arbitrary network fetch, or generic code execution.

## Migration from current ZIAS demo

1. Remove ZIAS-specific identity/media modules and environment flags from the reusable theme.
2. Replace ZIAS copy, story blocks, product IDs, and fallback media with neutral starter data.
3. Move brand-specific configuration into the generic seed/settings contract.
4. Replace hardcoded visual values with token variables.
5. Add the theme-token native plugin to the template configuration.
6. Keep Commerce/Page Composer/analytics behavior unchanged except for shared styling integration.
7. Document a ZIAS onboarding example separately from the reusable boilerplate.

## Verification plan

### Package contract tests

- default token resolution;
- partial override merging;
- invalid colors, dimensions, weights, fonts, variants, and motion values rejected;
- Google family/weight/subset allowlisting;
- production delivery fallback behavior;
- version migration;
- CSS variable emission;
- MCP search output filtering;
- MCP execute operation dispatch and permissions;
- normalized change summaries.

### Template checks

- neutral seed renders without ZIAS source references;
- changing theme settings changes rendered CSS variables and component output;
- typography roles are applied consistently to shell, content, catalog, cart, and checkout;
- motion defaults work and reduced-motion override works;
- desktop, tablet, and mobile layouts remain usable;
- Commerce cart and checkout behavior remains intact;
- Google Fonts preview/self-host configurations produce valid font declarations.

### Browser smoke

- homepage shell and hero;
- product grid and product detail;
- cart add/remove/update;
- checkout recovery and empty states;
- mobile header and product layout;
- admin Theme Settings page;
- MCP token update followed by storefront verification.

## Documentation

Add or update:

- generic Commerce theme README;
- theme-token plugin README/API reference;
- client onboarding and seed guide;
- typography and Google Fonts delivery guidance;
- motion accessibility guidance;
- MCP capability and permission documentation;
- separate ZIAS fixture/onboarding notes where required.
