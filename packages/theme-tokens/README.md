# `@emdash-cms/theme-tokens`

Validated, bounded theme tokens for EmDash storefronts. The package is the shared contract between a theme's server-rendered CSS, the native Theme Settings admin page, and the theme-token plugin's MCP operations.

It provides:

- versioned Zod schemas and inferred settings types;
- neutral defaults and safe resolution of missing settings;
- a pinned system/Google font registry;
- partial dotted-path patches with normalization and change summaries;
- deterministic CSS custom-property and font declaration emission;
- a native `emdash-theme-tokens` plugin with settings routes and exactly two MCP tools; and
- a React admin entrypoint for grouped Theme Settings controls.

This package does not accept or execute arbitrary CSS, JavaScript, Astro, HTML, class names, remote URLs, or unregistered fonts.

## Install and register

The Commerce Cloudflare starter includes this workspace package. Register the trusted native plugin in an EmDash Astro integration:

```ts
import { themeTokensPlugin } from "@emdash-cms/theme-tokens";

themeTokensPlugin();
```

`themeTokensPlugin()` returns the plugin descriptor with ID `emdash-theme-tokens`, entrypoint `@emdash-cms/theme-tokens`, admin entrypoint `@emdash-cms/theme-tokens/admin`, and a **Theme Settings** admin page. Hosts that resolve native plugins directly can use `createPlugin()`.

## Runtime API

The root export (`@emdash-cms/theme-tokens`) exports these runtime functions and values:

```ts
import {
  DEFAULT_THEME_SETTINGS,
  FONT_REGISTRY,
  THEME_SETTINGS_KEY,
  applyThemePatch,
  emitThemeCss,
  listThemeFonts,
  resolveThemeSettings,
} from "@emdash-cms/theme-tokens";

const defaults = resolveThemeSettings(undefined);
const result = applyThemePatch(defaults, {
  "color.brand": "#176b59",
  "typography.heading.font": "dm-sans",
  "typography.heading.weight": 700,
});
const css = emitThemeCss(result.settings);

THEME_SETTINGS_KEY; // "settings:theme"
listThemeFonts("serif");
```

- `resolveThemeSettings(raw)` merges a raw value with defaults, migrates the supported version, validates allowlists and bounds, and returns `ResolvedThemeSettings`.
- `applyThemePatch(current, patch)` accepts approved dotted paths at the patch boundary and returns `{ settings, changes }`. Invalid colors, lengths, shadows, font IDs, weights, subsets, variants, motion values, or delivery modes throw.
- `emitThemeCss(settings)` emits deterministic CSS variables, approved `@font-face` declarations or preview imports, and reduced-motion overrides.
- `FONT_REGISTRY`, `getThemeFont(fontId)`, and `listThemeFonts(query?)` expose defensive font metadata copies. `compatibleGoogleFontWeights(fontId, currentWeights)` returns compatible registered weights.
- `DEFAULT_THEME` and `DEFAULT_THEME_SETTINGS` are the neutral version-1 defaults.

The schema/value exports include `THEME_VERSION`, `FONT_IDS`, `FONT_PROVIDERS`, `FONT_SUBSETS`, `GOOGLE_DELIVERY_MODES`, `cssColorSchema`, `cssLengthSchema`, `shadowSchema`, `tokenSchema`, `themeSettingsSchema`, `resolvedThemeSettingsSchema`, `themeTokenPatchSchema`, `typographyRoleSchema`, `typographySchema`, `motionSchema`, `variantsSchema`, `themeOperationSchema`, and `themeChangeSchema`. Public TypeScript types include `FontId`, `ThemeSettings`, `ResolvedThemeSettings`, `ThemeTokenPatch`, `ThemeFontRecord`, `ThemeChange`, and `ThemeOperation`.

## Settings contract

The persisted object is versioned and contains `tokens`, `typography`, `motion`, and `variants`:

```ts
type ThemeSettings = {
  version: 1;
  tokens: {
    color: Record<"brand" | "brandHover" | "accent" | "text" | "muted" | "surface" | "surfaceAlt" | "border" | "success" | "danger", string>;
    layout: Record<"contentWidth" | "narrowWidth" | "sectionSpacing" | "gridGap" | "componentSpacing", string>;
    shape: Record<"radiusSmall" | "radiusMedium" | "radiusLarge", string>;
    elevation: { card: string; floating: string };
  };
  typography: {
    display: TypographyRole;
    heading: TypographyRole;
    body: TypographyRole;
    ui: TypographyRole;
    scale: "compact" | "comfortable" | "spacious";
    bodyLineHeight: string;
    headingTracking: string;
    google: {
      family: FontId;
      weights: number[];
      subsets: ("latin" | "latin-ext")[];
      delivery: "preview" | "self-hosted";
    };
  };
  motion: {
    enabled: boolean;
    intensity: "none" | "subtle" | "expressive";
    hover: "none" | "lift" | "soft-scale";
    reveal: "none" | "fade" | "fade-up";
    durationScale: "instant" | "fast" | "standard" | "slow";
    easing: "standard" | "snappy" | "smooth";
  };
  variants: {
    header: "standard" | "compact";
    hero: "split" | "centered" | "minimal";
    button: "solid" | "outline" | "soft";
    card: "elevated" | "flat" | "bordered";
    footer: "standard" | "minimal";
  };
};

type TypographyRole = {
  provider: "registry";
  font: FontId;
  weight: number;
  style: "normal" | "italic";
};
Plugin storage uses the public `THEME_SETTINGS_KEY` value `settings:theme` within the `emdash-theme-tokens` namespace. A storefront reads the `theme` setting with EmDash's plugin-settings API, then calls `resolveThemeSettings` and `emitThemeCss`; it does not call the private plugin routes during render.

The `tokens.elevation.card` and `tokens.elevation.floating` values each accept exactly `none`, `0 5px 16px rgba(32,41,52,0.06)`, or `0 16px 40px rgba(32,41,52,0.12)`. Other shadow strings are rejected.

## Fonts and delivery

The initial registry IDs are `system-sans`, `system-serif`, `inter`, `plus-jakarta`, `source-sans`, `source-serif`, and `dm-sans`. Registry records carry provider, available weights, italic/variable support, subsets, license metadata, fallback stacks, and delivery modes.

For a Google registry family, `typography.google.delivery: "preview"` emits an allowlisted Google Fonts CSS import. `"self-hosted"` emits local `/fonts/{font-id}-{weight}.woff2` declarations with `font-display: swap`; a deployment must provide the approved files at those paths. System families use local stacks. Both modes retain local fallbacks. Raw URLs, arbitrary family names, and unsupported weights/subsets are rejected.

## Native plugin and admin exports

The root export exposes the plugin surface:

```ts
import {
  THEME_OPERATION_REGISTRY,
  THEME_SETTINGS_KEY,
  THEME_TOKENS_PLUGIN_ID,
  THEME_TOKENS_PLUGIN_VERSION,
  createPlugin,
  themeTokensExecuteRoute,
  themeTokensPlugin,
  themeTokensSearchRoute,
} from "@emdash-cms/theme-tokens";

const descriptor = themeTokensPlugin();
const plugin = createPlugin();
```

It also exports `themeSearchInputSchema`, `themeSearchOutputSchema`, `themeExecuteInputSchema`, `themeExecuteOutputSchema`, `themeOperationRegistry` (and its `THEME_OPERATION_REGISTRY` alias), operation-related types, and the two route handlers. The private routes are `POST tokens/search` and `POST tokens/execute`; they are not storefront endpoints.

The package export `@emdash-cms/theme-tokens/admin` provides:

```ts
import { pages, ThemeSettingsPage } from "@emdash-cms/theme-tokens/admin";
```

`pages` is the native `PluginAdminExports["pages"]` map and contains the `/` Theme Settings page. `ThemeSettingsPage` uses the same execute operation registry and validation path as the plugin and MCP surface.

## MCP contract

The plugin declares exactly two manifest tools. EmDash namespaces them as:

```text
emdash-theme-tokens__search
emdash-theme-tokens__execute
```

The internal manifest keys are `search` and `execute`.

### Search

`emdash-theme-tokens__search` requires `settings:read` and accepts:

```ts
{
  query: string;
  area?: "tokens" | "typography" | "motion" | "variants";
}
```

It returns matching operation descriptions with bounded input metadata. It does not mutate settings.

### Execute

`emdash-theme-tokens__execute` requires `settings:manage` and plugin MCP consent. It accepts:

```ts
{
  operation: string;
  input: unknown;
}
```

The closed operation registry contains only:

```text
theme.settings.get
theme.settings.update
theme.settings.reset
theme.fonts.list
theme.motion.get
theme.variants.list
```

For example, a client can discover and apply a bounded heading-font change:

```text
theme search: "heading font and subtle product motion"
theme execute: theme.settings.update
```

The operation input for that update is an object such as:

```json
{
  "patch": {
    "typography.heading.font": "dm-sans",
    "typography.heading.weight": 700,
    "motion.intensity": "subtle"
  }
}
```

Execute validates the selected operation and its input, applies the resolver, persists normalized settings for updates/resets, and returns a change summary. It is not arbitrary code execution: it cannot run model-written JavaScript, accept CSS or HTML, access repositories or deployment credentials, fetch arbitrary URLs, or dispatch an operation outside the closed registry.
