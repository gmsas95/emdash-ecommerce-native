# Commerce Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Commerce Cloudflare template to a standard, responsive ecommerce storefront with reusable Astro layout components, focused React/Kumo islands, robust checkout controls, and historical order-item image previews.

**Architecture:** Keep Astro as the route/SSR/layout system and keep Commerce Core as the authoritative cart/checkout/order backend. Split the public theme into reusable Astro shell components and focused React islands; use Kumo only for interactive public controls, retain `commerceClient`, and add one backward-compatible optional media snapshot to cart/order lines.

**Tech Stack:** Astro, `@astrojs/react`, React 19, EmDash UI/theme tokens, `@cloudflare/kumo` 2.6.0, Commerce Core, TypeScript, Vitest, browser smoke verification.

**Spec:** `docs/superpowers/specs/2026-08-31-commerce-theme-redesign-design.md`

## Global Constraints

- Astro remains the router and SSR framework.
- React is used only for interactive Commerce islands.
- Kumo provides public form controls and interaction/status primitives inside those islands.
- The existing `commerceClient` remains the API boundary.
- No TanStack packages are added for this pass.
- `@emdash-cms/theme-tokens` remains the source of storefront visual identity and layout tokens.
- Commerce Core remains authoritative for prices, availability, payment methods, and totals.
- Existing carts and orders without media remain valid.
- The public order endpoint continues removing `orderAccessToken`.
- All content pages remain server-rendered and content queries keep their cache hints.
- Do not add an account system, shipping-rate engine, discount builder, payment UI rewrite, or full React migration.

## File Map

### Commerce contracts and core

- Modify `packages/commerce-contracts/src/domain.ts` and `packages/commerce-contracts/src/index.ts` to define/export `ProductMediaSnapshot`, accept optional order-item images, and preserve them through `parseOrderSnapshot`.
- Modify `packages/commerce-contracts/test/contracts.test.ts` to test valid optional media and rejection of malformed media.
- Modify `packages/commerce-core/src/domain/cart.ts` to store optional cart-line image snapshots and preserve the first snapshot when merging lines.
- Modify `packages/commerce-core/src/domain/orders.ts` to store optional line media and copy it into shared `items`.
- Modify `packages/commerce-core/src/storefront/types.ts` to expose optional line images in cart resources.
- Modify `packages/commerce-core/src/plugin.ts` so product primary media is captured when adding cart lines and copied into order lines during checkout.
- Modify `packages/commerce-core/test/domain/cart.test.ts`, `packages/commerce-core/test/domain/orders.test.ts`, and `packages/commerce-core/test/integration/checkout.test.ts` for propagation and legacy behavior.

### Public template dependencies and shell

- Modify `templates/commerce-cloudflare/package.json` to declare `@cloudflare/kumo: "catalog:"` directly.
- Create `templates/commerce-cloudflare/src/components/layout/StorefrontFrame.astro` for document/frame composition extracted from `Base.astro`.
- Create `templates/commerce-cloudflare/src/components/layout/AnnouncementBar.astro`.
- Create `templates/commerce-cloudflare/src/components/layout/SiteHeader.astro`.
- Create `templates/commerce-cloudflare/src/components/layout/SiteFooter.astro`.
- Create `templates/commerce-cloudflare/src/components/layout/Container.astro`.
- Create `templates/commerce-cloudflare/src/components/layout/Breadcrumbs.astro`.
- Create `templates/commerce-cloudflare/src/components/layout/PageHeader.astro`.
- Create `templates/commerce-cloudflare/src/components/commerce/CommerceCard.astro`.
- Create `templates/commerce-cloudflare/src/components/commerce/ProductMedia.astro`.
- Create `templates/commerce-cloudflare/src/components/commerce/Price.astro`.
- Create `templates/commerce-cloudflare/src/components/commerce/OrderSummary.astro`.
- Modify `templates/commerce-cloudflare/src/layouts/Base.astro` to compose the new frames while preserving EmDash metadata/contribution wiring.
- Modify `templates/commerce-cloudflare/src/styles/storefront.css` to import Kumo standalone styles once, then define the theme-token commerce shell/grid/card/form rules and responsive behavior.

### Public template React islands and routes

- Create `templates/commerce-cloudflare/src/components/commerce/CommerceProductImage.tsx` for image/fallback rendering inside React islands.
- Create `templates/commerce-cloudflare/src/components/commerce/CommerceStatus.tsx` for loading, error, empty, and status surfaces.
- Create `templates/commerce-cloudflare/src/components/commerce/CommerceSummary.tsx` for reusable React summary rows/cards.
- Create `templates/commerce-cloudflare/src/components/commerce/CartIsland.tsx`.
- Create `templates/commerce-cloudflare/src/components/commerce/ProductDetailIsland.tsx`.
- Create `templates/commerce-cloudflare/src/components/commerce/CheckoutIsland.tsx`.
- Create `templates/commerce-cloudflare/src/components/commerce/OrderDetailIsland.tsx`.
- Create `templates/commerce-cloudflare/src/components/commerce/checkout-fields.ts` for the typed field registry and bounded country/payment control metadata.
- Modify `templates/commerce-cloudflare/src/pages/shop/[slug].astro`, `templates/commerce-cloudflare/src/pages/cart.astro`, `templates/commerce-cloudflare/src/pages/checkout.astro`, and `templates/commerce-cloudflare/src/pages/orders/[id].astro` to render the new shells/islands with `client:load`.
- Remove obsolete `templates/commerce-cloudflare/src/components/ClientProductDetail.astro` after its callers are migrated.
- Keep existing `ProductCard.astro`, `ProductGallery.astro`, and CMS components only where the new shared components do not replace them; update them to use the new media/price primitives rather than duplicate markup.

### Verification and docs

- `templates/commerce-cloudflare/tests/commerce-state.test.ts` tests the quantity clamp helper.
- `templates/commerce-cloudflare/tests/checkout-fields.test.ts` tests field registry and validation helpers.
- `templates/commerce-cloudflare/tests/order-detail.test.ts` tests address/status/media helpers.
- `templates/commerce-cloudflare/tests/theme-runtime.test.ts` remains a regression suite and is run unchanged.
- Update `templates/commerce-cloudflare/CHANGELOG.md` with the public template redesign and backward-compatible order media note.

---

### Task 1: Add backward-compatible media snapshot contracts

**Files:**
- Modify: `packages/commerce-contracts/src/domain.ts`
- Modify: `packages/commerce-contracts/src/index.ts`
- Test: `packages/commerce-contracts/test/contracts.test.ts`

**Interfaces:**
- Produces `ProductMediaSnapshot` with `mediaId?: string`, `url: string`, and `alt?: string`.
- Extends `OrderItem` with `image?: ProductMediaSnapshot`.
- Keeps `OrderSnapshot` source compatibility for consumers that omit `image`.
- `parseOrderSnapshot` returns the optional image after validating its URL and optional fields.

- [ ] **Step 1: Write the failing contract tests**

Add tests beside the existing order parser tests with these assertions:

```ts
it("preserves an optional product image on order items", () => {
  const order = parseOrderSnapshot({
    orderId: "order-1",
    currency: "USD",
    items: [{
      lineId: "line-1",
      name: "Tea",
      quantity: 1,
      unitPrice: { amountMinor: 1000, currency: "USD" },
      total: { amountMinor: 1000, currency: "USD" },
      image: { mediaId: "media-1", url: "https://cdn.example.test/tea.jpg", alt: "Tea" },
    }],
    subtotal: { amountMinor: 1000, currency: "USD" },
    total: { amountMinor: 1000, currency: "USD" },
  });

  expect(order.items[0]?.image).toEqual({
    mediaId: "media-1",
    url: "https://cdn.example.test/tea.jpg",
    alt: "Tea",
  });
});

it("rejects an order item image without an absolute http URL", () => {
  expect(() => parseOrderSnapshot({
    orderId: "order-1",
    currency: "USD",
    items: [{
      lineId: "line-1",
      name: "Tea",
      quantity: 1,
      unitPrice: { amountMinor: 1000, currency: "USD" },
      total: { amountMinor: 1000, currency: "USD" },
      image: { url: "javascript:alert(1)" },
    }],
    subtotal: { amountMinor: 1000, currency: "USD" },
    total: { amountMinor: 1000, currency: "USD" },
  })).toThrow();
});
```

- [ ] **Step 2: Run the contract tests and verify failure**

Run:

```bash
pnpm --filter @gmsas95/emdash-commerce-contracts test -- test/contracts.test.ts
```

Expected: the new image-preservation assertion fails because the contract type/parser does not expose `image` yet.

- [ ] **Step 3: Implement the optional media contract**

In `packages/commerce-contracts/src/domain.ts`:

```ts
export interface ProductMediaSnapshot {
  mediaId?: string;
  url: string;
  alt?: string;
}

export interface OrderItem {
  lineId: string;
  name: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
  sku?: string;
  image?: ProductMediaSnapshot;
}
```

Add a parser that accepts same-origin paths beginning with `/` except `//`, or absolute `http:`/`https:` URLs. Reject `javascript:`, `data:`, and other schemes. Copy `mediaId` and `alt` only when they are non-empty strings, call `invalidPayload` for malformed objects, and include the parsed image in the object returned by `parseOrderItem` only when input contains one. Re-export `ProductMediaSnapshot` from `src/index.ts`.

- [ ] **Step 4: Run the contract tests and typecheck**

Run:

```bash
pnpm --filter @gmsas95/emdash-commerce-contracts test -- test/contracts.test.ts
pnpm --filter @gmsas95/emdash-commerce-contracts typecheck
```

Expected: both commands pass, including existing parser tests and legacy orders without images.

- [ ] **Step 5: Commit the contract change**

```bash
git add packages/commerce-contracts/src/domain.ts packages/commerce-contracts/src/index.ts packages/commerce-contracts/test/contracts.test.ts
git commit -m "feat: add optional commerce line media snapshots"
```

### Task 2: Propagate media through cart and checkout

**Files:**
- Modify: `packages/commerce-core/src/domain/cart.ts`
- Modify: `packages/commerce-core/src/domain/orders.ts`
- Modify: `packages/commerce-core/src/storefront/types.ts`
- Modify: `packages/commerce-core/src/plugin.ts`
- Test: `packages/commerce-core/test/domain/cart.test.ts`
- Test: `packages/commerce-core/test/domain/orders.test.ts`
- Test: `packages/commerce-core/test/integration/checkout.test.ts`

**Interfaces:**
- `CartLine`, `AddCartLineInput`, `StoreCartLine`, `OrderSnapshotLineInput`, and `OrderSnapshotLine` each accept `image?: ProductMediaSnapshot`.
- `createOrderSnapshot` copies `line.image` to both `order.lines[n].image` and `order.items[n].image`.
- `catalogCartItem` returns the primary product image as an optional snapshot.
- Checkout uses the cart snapshot first and the current published product primary image only as a fallback for legacy carts.

- [ ] **Step 1: Write failing propagation tests**

Add a cart-domain test that passes an image to `addCartLine` and verifies it is retained after insertion and repeated-line merging. Add an order-domain test that passes an image to `createOrderSnapshot` and verifies both line and shared item output. Add an integration checkout fixture with a published product containing `images: [{ mediaId: "media-1", url: "https://cdn.example.test/tea.jpg", alt: "Tea" }]`, then assert the stored order line and `items[0].image` contain that snapshot.

Use this order assertion shape:

```ts
expect(order).toMatchObject({
  lines: [{ image: { mediaId: "media-1", url: "https://cdn.example.test/tea.jpg", alt: "Tea" } }],
  items: [{ image: { mediaId: "media-1", url: "https://cdn.example.test/tea.jpg", alt: "Tea" } }],
});
```

- [ ] **Step 2: Run focused Commerce tests and verify failure**

Run:

```bash
pnpm --filter @emdash-commerce/core test -- test/domain/cart.test.ts test/domain/orders.test.ts test/integration/checkout.test.ts
```

Expected: the new assertions fail because media is not present in cart/order models or the catalog resolver.

- [ ] **Step 3: Implement model propagation**

Import `ProductMediaSnapshot` from `@gmsas95/emdash-commerce-contracts` and add optional `image` fields to the listed types. In `addCartLine`, copy `input.image` when inserting a line and set it only when an existing merged line has no image, preserving the original snapshot for an already-populated line. In `createOrderSnapshot`, clone optional media with the same defensive copy path used for customer/address data and include it in both `lines` and shared `items`.

- [ ] **Step 4: Implement plugin capture and checkout fallback**

Update `catalogCartItem` to read the product document’s first image and return it as `{ mediaId, url, alt }` only when the URL is a safe same-origin path or absolute `http:`/`https:` URL. Pass that value into `addCartLine`. In checkout’s line mapping, use `line.image` when present; otherwise read the current product primary image as a compatibility fallback. Do not accept image data from browser request bodies and do not use client-provided prices.

- [ ] **Step 5: Run focused tests and typechecks**

Run:

```bash
pnpm --filter @emdash-commerce/core test -- test/domain/cart.test.ts test/domain/orders.test.ts test/integration/checkout.test.ts
pnpm --filter @gmsas95/emdash-commerce-contracts --filter @emdash-commerce/core typecheck
```

Expected: all focused tests and both typechecks pass; carts/orders without images remain valid.

- [ ] **Step 6: Commit the Commerce propagation change**

```bash
git add packages/commerce-core/src/domain/cart.ts packages/commerce-core/src/domain/orders.ts packages/commerce-core/src/storefront/types.ts packages/commerce-core/src/plugin.ts packages/commerce-core/test/domain/cart.test.ts packages/commerce-core/test/domain/orders.test.ts packages/commerce-core/test/integration/checkout.test.ts
git commit -m "feat: preserve product media in commerce snapshots"
```

### Task 3: Add Kumo dependency and shared Astro commerce shell

**Files:**
- Modify: `templates/commerce-cloudflare/package.json`
- Create: `templates/commerce-cloudflare/src/components/layout/StorefrontFrame.astro`
- Create: `templates/commerce-cloudflare/src/components/layout/AnnouncementBar.astro`
- Create: `templates/commerce-cloudflare/src/components/layout/SiteHeader.astro`
- Create: `templates/commerce-cloudflare/src/components/layout/SiteFooter.astro`
- Create: `templates/commerce-cloudflare/src/components/layout/Container.astro`
- Create: `templates/commerce-cloudflare/src/components/layout/Breadcrumbs.astro`
- Create: `templates/commerce-cloudflare/src/components/layout/PageHeader.astro`
- Create: `templates/commerce-cloudflare/src/components/commerce/CommerceCard.astro`
- Create: `templates/commerce-cloudflare/src/components/commerce/ProductMedia.astro`
- Create: `templates/commerce-cloudflare/src/components/commerce/Price.astro`
- Create: `templates/commerce-cloudflare/src/components/commerce/OrderSummary.astro`
- Modify: `templates/commerce-cloudflare/src/layouts/Base.astro`
- Modify: `templates/commerce-cloudflare/src/styles/storefront.css`

**Interfaces:**
- `Base.astro` keeps its existing `Props` shape and adds an optional `variant?: "storefront" | "commerce"` defaulting to `"storefront"`.
- `Container.astro` accepts `as?: keyof HTMLElementTagNameMap` and `class?: string`.
- `Breadcrumbs.astro` accepts `items: Array<{ label: string; href?: string }>` and emits an accessible `nav`/`ol` structure.
- `PageHeader.astro` accepts `title`, optional `eyebrow`, optional `lede`, and optional slot content.
- `ProductMedia.astro` accepts `src`, `alt`, optional `width`, `height`, and optional `class`; invalid/missing URLs render `/commerce-placeholder.svg`.
- `Price.astro` accepts `amountMinor` and `currency` and uses the existing formatting utility.

- [ ] **Step 1: Add the direct Kumo dependency**

Add this dependency to the template package without changing the existing React/Astro versions:

```json
"@cloudflare/kumo": "catalog:"
```

Run `pnpm install --lockfile-only` from the workspace root and confirm the lockfile changes only reflect the direct template dependency.

- [ ] **Step 2: Extract the existing Base shell into focused components**

Move the current EmDash head/body, theme-token attributes, menu loading, site identity, analytics hooks, cart-count updater, and page slot composition into `StorefrontFrame.astro`. Keep `Base.astro` as a thin compatibility wrapper that loads site data and delegates to `StorefrontFrame`. Preserve `EmDashHead`, `EmDashBodyStart`, `EmDashBodyEnd`, `createPublicPageContext`, `getMenu`, `getSiteSettings`, `getPluginSetting`, and `resolveThemeSettings` behavior exactly.

`SiteHeader.astro` must render the existing primary menu, LiveSearch, cart count, and mobile menu with a standard commerce arrangement: brand left, navigation center, utility actions right on desktop; brand, cart, and menu trigger on mobile with search in the expanded row. `SiteFooter.astro` must render footer menu/support information for both normal and compact commerce variants.

- [ ] **Step 3: Add shared Astro commerce primitives**

Implement `Container`, `Breadcrumbs`, `PageHeader`, `CommerceCard`, `ProductMedia`, `Price`, and `OrderSummary` with semantic elements and slots. `OrderSummary` must accept line records with `name`, `quantity`, `unitAmountMinor`, `totalMinor`, `currency`, and optional `image`, plus totals and CTA slot. It must render a placeholder when `image` is absent.

- [ ] **Step 4: Rework theme-token layout CSS**

At the top of `storefront.css`, import Kumo standalone styles once. Follow that import with theme-token overrides and shared selectors for `.commerce-container`, `.commerce-page-header`, `.commerce-card`, `.commerce-layout`, `.commerce-summary`, `.commerce-form-section`, `.commerce-line-item`, `.commerce-status`, and `.commerce-placeholder`. Use the existing `--theme-layout-*`, `--theme-color-*`, `--theme-shape-*`, `--theme-elevation-*`, and typography variables. Add desktop and mobile rules for 1200px/980px/700px breakpoints; ensure the mobile rules collapse grids to one column and set `overflow-wrap: anywhere` for order references/emails.

- [ ] **Step 5: Run template typecheck/build and inspect shell output**

Run:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Expected: both commands pass and all existing routes still render through `Base.astro` with the new shared shell.

- [ ] **Step 6: Commit the shared shell**

```bash
git add templates/commerce-cloudflare/package.json pnpm-lock.yaml templates/commerce-cloudflare/src/components/layout templates/commerce-cloudflare/src/components/commerce/CommerceCard.astro templates/commerce-cloudflare/src/components/commerce/ProductMedia.astro templates/commerce-cloudflare/src/components/commerce/Price.astro templates/commerce-cloudflare/src/components/commerce/OrderSummary.astro templates/commerce-cloudflare/src/layouts/Base.astro templates/commerce-cloudflare/src/styles/storefront.css
git commit -m "feat: add standard commerce storefront shell"
```

### Task 4: Replace product and cart imperative UI with React islands

**Files:**
- Create: `templates/commerce-cloudflare/src/components/commerce/CommerceProductImage.tsx`
- Create: `templates/commerce-cloudflare/src/components/commerce/CommerceStatus.tsx`
- Create: `templates/commerce-cloudflare/src/components/commerce/CommerceSummary.tsx`
- Create: `templates/commerce-cloudflare/src/components/commerce/commerce-state.ts`
- Create: `templates/commerce-cloudflare/src/components/commerce/CartIsland.tsx`
- Create: `templates/commerce-cloudflare/src/components/commerce/ProductDetailIsland.tsx`
- Modify: `templates/commerce-cloudflare/src/pages/shop/[slug].astro`
- Modify: `templates/commerce-cloudflare/src/pages/cart.astro`
- Modify: `templates/commerce-cloudflare/src/components/ProductCard.astro`
- Delete: `templates/commerce-cloudflare/src/components/ClientProductDetail.astro`
- Test: `templates/commerce-cloudflare/tests/commerce-state.test.ts`

**Interfaces:**
- `CommerceProductImage` accepts `{ src?: string; alt: string; size?: "thumb" | "card" | "hero" }` and renders a fixed-ratio image/fallback.
- `CartIsland` accepts no required props and calls `commerceClient.cart.get/update/remove`.
- `ProductDetailIsland` accepts `{ slug: string }` and calls `commerceClient.catalog.list` and `commerceClient.cart.add`.
- Both islands dispatch `new Event("commerce-cart-updated")` after successful mutations and preserve existing analytics event names/payloads.

- [ ] **Step 1: Add pure island state tests for quantity bounds**

Create `commerce-state.ts` and `tests/commerce-state.test.ts`. The template has no React testing-library harness, so keep this deterministic helper separate from rendered JSX:

```ts
export function clampQuantity(value: number): number {
  return Math.max(1, Math.min(99, Number.isFinite(value) ? Math.trunc(value) : 1));
}
```

Test `0`, `1`, `99`, `100`, `NaN`, and fractional values. The React islands import this helper; no new testing framework is added.

- [ ] **Step 2: Implement Kumo-backed product and cart islands**

Import Kumo controls from `@cloudflare/kumo` and render structured JSX instead of `document.createElement`. `ProductDetailIsland` must show gallery thumbnails, variant `Select`, quantity `Input`, price updates, add-to-cart `Button`, and status/error surfaces. `CartIsland` must show image/name/SKU/price/quantity/remove/line-total rows, summary, availability warning, empty state, retry state, and checkout CTA. Keep all API calls in the existing `commerceClient` module.

- [ ] **Step 3: Migrate route shells to client islands**

In `[slug].astro`, render `Base` with breadcrumb/page-header content and `<ProductDetailIsland client:load slug={slug} />`. In `cart.astro`, render `Base` with breadcrumb/page-header and `<CartIsland client:load />`. Render the existing compact `DemoNotice` directly below each page header. Remove the obsolete `.astro` client builder after verifying no imports remain.

- [ ] **Step 4: Update static product cards to shared media/price behavior**

Use the shared image/price conventions in `ProductCard.astro`, preserve the existing catalog link/slug behavior, and keep image alt text from Commerce data. Do not change catalog pricing or variant selection semantics.

- [ ] **Step 5: Run focused checks**

Run:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare test -- tests/theme-runtime.test.ts
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Expected: the product and cart routes build with React islands and no remaining `document.createElement` code in the migrated flows.

- [ ] **Step 6: Commit product/cart islands**

```bash
git add templates/commerce-cloudflare/src/components/commerce templates/commerce-cloudflare/src/pages/shop/[slug].astro templates/commerce-cloudflare/src/pages/cart.astro templates/commerce-cloudflare/src/components/ProductCard.astro templates/commerce-cloudflare/tests/commerce-state.test.ts
git commit -m "feat: replace product and cart DOM builders"
```

### Task 5: Rebuild checkout form and summary

**Files:**
- Create: `templates/commerce-cloudflare/src/components/commerce/checkout-fields.ts`
- Create: `templates/commerce-cloudflare/src/components/commerce/CheckoutIsland.tsx`
- Modify: `templates/commerce-cloudflare/src/pages/checkout.astro`
- Modify: `templates/commerce-cloudflare/src/styles/storefront.css`
- Test: `templates/commerce-cloudflare/tests/checkout-fields.test.ts`

**Interfaces:**
- `CheckoutFieldSpec` has `name`, `label`, `autocomplete`, `required`, and `control: "input" | "email" | "tel" | "select"`.
- `CHECKOUT_FIELD_SPECS` maps `name`, `email`, `phone`, `line1`, `line2`, `city`, `state`, `postalCode`, and `country` to their labels/autocomplete/control metadata.
- `CheckoutIsland` accepts no required props and uses `CheckoutResource`, `CheckoutUpdateInput`, `CheckoutStartInput`, and `CheckoutResult` from the existing Commerce types.
- `CheckoutIsland` preserves the current localStorage keys `commerce-order-id` and `commerce-order-access-token`.

- [ ] **Step 1: Add checkout field registry and validation helper tests**

Create pure helpers with these signatures:

```ts
export interface CheckoutFieldSpec {
  name: string;
  label: string;
  autocomplete: string;
  required: boolean;
  control: "input" | "email" | "tel" | "select";
}

export function checkoutFieldError(name: string, value: string): string | undefined;
export function fieldsForCheckout(resource: CheckoutResource): CheckoutFieldSpec[];
```

Test that `fieldsForCheckout` omits fields not listed by the server, marks `name`, `email`, `line1`, `city`, `postalCode`, and `country` required, uses `email` for email, `tel` for phone, and uses `select` for country. Test blank required values and invalid email return field errors while valid values return `undefined`.

- [ ] **Step 2: Implement the checkout island**

Use Kumo `Input`, `Select`, `Label`, `Button`, `Badge`, and card primitives. Load the checkout resource on mount, render enabled payment methods as a select, render country from the template’s complete ISO-3166 alpha-2 option list with `MY` as the initial value, and render freeform address fields as inputs. Keep state typed by field name and derive the customer/shipping payload from the submitted values.

Render the order summary from `resource.cart.lines`, including optional line images and availability warnings. Render an empty-cart state before the form and prevent submit if no enabled payment method or unavailable line exists.

On submit:

```ts
await commerceClient.checkout.update({
  paymentProvider,
  customer: { name, email, ...(phone ? { phone } : {}) },
  shippingAddress,
});
const result = await commerceClient.checkout.start({
  paymentProvider,
  idempotencyKey,
  customer: { name, email, ...(phone ? { phone } : {}) },
  shippingAddress,
  expectedTotalMinor: resource.totals.totalMinor,
});
localStorage.setItem("commerce-order-id", result.orderId);
localStorage.setItem("commerce-order-access-token", result.orderAccessToken);
window.location.assign(result.checkoutUrl);
```

Use the existing `emitAnalytics` payload and do not accept a client total as authoritative.

- [ ] **Step 3: Migrate checkout route to the commerce shell**

Replace the raw form and inline script in `checkout.astro` with breadcrumbs, a compact commerce page header, and `<CheckoutIsland client:load />`. Keep CMS checkout copy above the island only when `loadCmsPage("checkout")` returns content and preserve `Astro.cache.set(cacheHint)`.

- [ ] **Step 4: Add responsive checkout layout rules**

Use `.checkout-layout` with a main form column and summary column. Make the summary sticky only above the mobile breakpoint. At mobile widths, place the summary before the submit action, retain readable labels/errors, and keep controls full width.

- [ ] **Step 5: Run focused template checks**

Run:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare test -- tests/theme-runtime.test.ts
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Expected: checkout builds, exposes payment/country dropdowns, and preserves the existing checkout API sequence and storage keys.

- [ ] **Step 6: Commit checkout flow**

```bash
git add templates/commerce-cloudflare/src/components/commerce/checkout-fields.ts templates/commerce-cloudflare/src/components/commerce/CheckoutIsland.tsx templates/commerce-cloudflare/src/pages/checkout.astro templates/commerce-cloudflare/src/styles/storefront.css templates/commerce-cloudflare/tests/checkout-fields.test.ts
git commit -m "feat: rebuild commerce checkout form"
```

### Task 6: Build customer order preview with historical images

**Files:**
- Create: `templates/commerce-cloudflare/src/components/commerce/OrderDetailIsland.tsx`
- Modify: `templates/commerce-cloudflare/src/pages/orders/[id].astro`
- Test: `templates/commerce-cloudflare/tests/order-detail.test.ts`
- Modify: `templates/commerce-cloudflare/src/styles/storefront.css`

**Interfaces:**
- `OrderDetailIsland` accepts `{ orderId: string }`.
- It calls `commerceClient.orders.get(orderId, orderAccessToken)` and renders the returned `OrderSnapshot` without exposing the access token in the DOM.
- `formatAddress` accepts `AddressSnapshot | undefined` and returns display lines.
- `statusLabel` maps known order/payment statuses to human-readable labels and falls back to the raw status string.
- `hasOrderMedia` accepts `ProductMediaSnapshot | undefined` and returns a boolean indicating whether the URL is safe to render.

- [ ] **Step 1: Add deterministic pure helper tests**

Test `formatAddress` with complete and partial addresses, `statusLabel` with `pending_payment`, `paid`, `fulfilled`, and an unknown status, and the media fallback predicate with an absent `image`.

- [ ] **Step 2: Implement token-gated order island**

On mount, read `commerce-order-access-token` from localStorage. Without a token, render the existing instruction. With a token, fetch the order and render loading/error/retry states. Render order reference/date/status badges, item cards with `CommerceProductImage`, quantity/SKU/variant metadata, unit/line prices, totals, customer details, and shipping address. Render a placeholder when `line.image` is missing and never query current catalog media.

- [ ] **Step 3: Migrate order route to the commerce shell**

Replace the status-only DOM script in `orders/[id].astro` with breadcrumbs, page header, and `<OrderDetailIsland client:load orderId={orderId} />`. Keep the route parameter server-rendered in the island prop and render the existing compact `DemoNotice` directly below the page header.

- [ ] **Step 4: Add order responsive layout rules**

Use a two-column order layout on desktop: item list/summary and status/customer/shipping cards. Collapse to one column on mobile. Make item images fixed-size thumbnails and let long IDs/emails wrap without expanding the viewport.

- [ ] **Step 5: Run focused checks**

Run:

```bash
pnpm --filter @emdash-cms/template-commerce-cloudflare test -- tests/theme-runtime.test.ts
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Expected: order detail builds with image previews, token gating, legacy fallback, totals, and status/address cards.

- [ ] **Step 6: Commit order preview**

```bash
git add templates/commerce-cloudflare/src/components/commerce/OrderDetailIsland.tsx templates/commerce-cloudflare/src/pages/orders/[id].astro templates/commerce-cloudflare/src/styles/storefront.css templates/commerce-cloudflare/tests/order-detail.test.ts
git commit -m "feat: add customer order item previews"
```

### Task 7: Update changelog and run complete verification

**Files:**
- Modify: `templates/commerce-cloudflare/CHANGELOG.md`
- Verify: `packages/commerce-contracts/test/contracts.test.ts`
- Verify: `packages/commerce-core/test/domain/cart.test.ts`
- Verify: `packages/commerce-core/test/domain/orders.test.ts`
- Verify: `packages/commerce-core/test/integration/checkout.test.ts`
- Verify: `templates/commerce-cloudflare/tests/theme-runtime.test.ts`

**Interfaces:**
- No new API beyond the optional media snapshot described in Tasks 1–2.
- Changelog entry names the responsive commerce shell, Kumo-backed controls, checkout improvements, and order-image fallback.

- [ ] **Step 1: Add the changelog entry**

Add an unreleased entry describing the customer-visible storefront layout, checkout controls, cart/checkout thumbnails, order previews, and backward-compatible legacy fallback. Do not claim TanStack adoption or a full React migration.

- [ ] **Step 2: Run focused package verification**

Run:

```bash
pnpm --filter @gmsas95/emdash-commerce-contracts test
pnpm --filter @emdash-commerce/core test -- test/domain/cart.test.ts test/domain/orders.test.ts test/integration/checkout.test.ts
pnpm --filter @gmsas95/emdash-commerce-contracts --filter @emdash-commerce/core typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare test
pnpm --filter @emdash-cms/template-commerce-cloudflare typecheck
pnpm --filter @emdash-cms/template-commerce-cloudflare build
```

Expected: all commands pass without changing unrelated package behavior.

- [ ] **Step 3: Launch the actual template and smoke-test routes**

Run the template’s actual development server with the existing D1/R2 development configuration. Exercise `/`, `/shop`, a product route, `/cart`, `/checkout`, `/checkout/result`, and `/orders/<id>`. Confirm that the browser renders the shared header/footer and page hierarchy, cart/product interactions work, checkout country/payment selects render, and order media renders from the stored snapshot.

- [ ] **Step 4: Verify responsive and accessibility behavior in Chromium**

At desktop and 390px mobile widths, inspect screenshots and verify:

- no horizontal overflow
- standard header/footer spacing
- product gallery/purchase split collapses correctly
- cart/checkout summaries stack correctly
- country/payment selects are keyboard reachable
- required-field/invalid-email errors are visible and announced
- order thumbnails and placeholder fallback render
- reduced-motion mode disables transitions/animations

- [ ] **Step 5: Commit changelog and final verification state**

```bash
git add templates/commerce-cloudflare/CHANGELOG.md
git commit -m "docs: record commerce theme redesign"
```

## Execution Notes

- Run each task in order because the public islands depend on the shared media contract and shell primitives.
- Keep commits scoped to the task listed; do not include `.superpowers/brainstorm/` artifacts or deployment-only temporary configuration.
- Do not run formatters or broad lint suites mid-task; run project formatting/checks once after functional verification if the repository requires them.
- If Kumo standalone CSS creates a global reset conflict, fix the import order and theme-token overrides in `storefront.css`; do not replace Kumo with a second public UI library.

## Coverage Review

- Shared layout, header/footer, spacing, breadcrumbs, page variants: Task 3 and Task 7.
- Kumo public controls and React island boundary: Tasks 3–6.
- Checkout dropdowns, validation, API sequence, loading/error states: Task 5 and Task 7.
- Cart/product interaction and image previews: Task 4 and Task 2.
- Historical order pictures and legacy fallback: Tasks 1, 2, and 6.
- Accessibility, responsive layout, reduced motion, and browser proof: Tasks 3–7.
- No TanStack additions and no unrelated features: Global Constraints and Execution Notes.
