# Commerce Theme Redesign Design

**Date:** 2026-08-31  
**Status:** Approved in chat; written-spec review pending

## Goal

Bring the Commerce Cloudflare template to a conventional, polished ecommerce standard while preserving the existing Astro, EmDash, React, and native Commerce Core architecture.

The redesign covers the shared storefront shell, commerce page spacing and hierarchy, interactive cart/product/checkout/order flows, checkout form controls, and purchased-item image previews.

## Current Evidence

The existing template already uses Astro, `@astrojs/react`, EmDash, Commerce Core, and a shared theme-token stylesheet. The main rough areas are:

- `Base.astro` contains a single editorial shell for every route.
- `cart.astro`, `checkout.astro`, and `ClientProductDetail.astro` imperatively construct most interactive markup with `document.createElement`.
- `orders/[id].astro` renders only status and total text.
- `OrderSnapshotLine` and the shared `OrderItem` contract contain no product media.
- `CheckoutResource` exposes customer/address field names and payment methods, but no shipping-method catalog.
- Kumo is already a workspace dependency shipped with EmDash, but the public template does not currently import it directly.
- TanStack Router, Query, and Form are not required by the current public Commerce flow.

## Design Decisions

### Ownership

The theme owns customer-facing presentation:

- Astro routes and SSR page structure
- shared header/footer and page frames
- responsive ecommerce layout
- theme-token visual styling
- Kumo-backed public controls inside React islands
- customer-facing product, cart, checkout, and order presentation

Commerce Core owns behavior and authoritative data:

- catalog, cart, checkout, and order APIs
- server-calculated availability and totals
- payment method discovery
- checkout idempotency and order access tokens
- persisted cart and order snapshots
- product media snapshot propagation

The change does not introduce a second commerce data model, a new route system, or a public account system.

### Technology boundary

Keep the existing stack:

- Astro remains the router and SSR framework.
- React is used only for interactive Commerce islands.
- Kumo provides public form controls and interaction/status primitives inside those islands.
- The existing `commerceClient` remains the API boundary.
- No TanStack packages are added for this pass.
- Kumo is added as a direct dependency of the public template because directly imported packages must not be transitive implementation details.
- `@emdash-cms/theme-tokens` remains the source of storefront visual identity and layout tokens.

Kumo will not own the global storefront shell. Its standalone styling/token layer can otherwise compete with theme-token customization. Page composition, header/footer, media, grids, and responsive rules remain local Astro/CSS components.

### Visual direction

Use the selected classic commerce direction:

```text
announcement bar
brand / navigation / search / account / cart
breadcrumb
page heading
main commerce content
trust / payment reassurance
footer columns
```

Editorial CMS sections remain supported on content/home pages, but purchase flows use conventional commerce hierarchy and compact page rhythm.

## Shared Layout

Split the current `Base.astro` markup into focused components while retaining `Base.astro` as the compatibility entry point.

Planned Astro components:

- `StorefrontFrame.astro` — document metadata, theme attributes, EmDash head/body contributions, analytics, and frame composition.
- `AnnouncementBar.astro` — utility message and storefront CTA.
- `SiteHeader.astro` — brand, primary navigation, search, cart count, and responsive menu.
- `SiteFooter.astro` — footer brand, footer menu, trust/support copy, and compact commerce variant.
- `Container.astro` — consistent content width and horizontal padding.
- `Breadcrumbs.astro` — accessible breadcrumb navigation for commerce routes.
- `PageHeader.astro` — consistent title, eyebrow, and lede spacing.
- `CommerceCard.astro` — theme-token card surface for summaries and order panels.
- `ProductMedia.astro` — image/fallback frame with consistent aspect ratio and alt handling.
- `Price.astro` — minor-unit amount formatting and currency display.
- `OrderSummary.astro` — reusable summary structure for cart, checkout, and order views.

`Base.astro` will compose the frame and expose a compact transactional variant without duplicating the global header/footer logic.

Global layout requirements:

- one centered max-width container system
- one spacing scale backed by theme tokens
- standard commerce page title sizing, not the oversized editorial hero scale
- desktop two-column product and checkout layouts
- mobile single-column flow with no horizontal overflow
- sticky checkout/order summary only where it does not obstruct mobile content
- visible breadcrumbs on shop, product, cart, checkout, and order routes
- consistent footer information on every route
- no hover-only interaction

## React Islands

Replace imperative DOM builders with focused React islands:

- `CartIsland.tsx` — cart loading, empty/error states, line thumbnails, quantity updates, removal, totals, availability notices, and checkout link.
- `ProductDetailIsland.tsx` — catalog lookup, gallery, variant selection, quantity, add-to-cart action, feedback, and analytics.
- `CheckoutIsland.tsx` — checkout resource loading, Kumo form controls, field validation, payment selection, summary, API submission, and redirect.
- `OrderDetailIsland.tsx` — token-gated order fetch, order status, purchased-item media cards, totals, customer/shipping panels, and legacy-media fallback.

Each island receives only route-level props such as slug or order ID. It continues to use the existing `commerceClient`, local order access-token storage, analytics events, and `commerce-cart-updated` event.

Kumo controls used for public interactive fields and status surfaces:

- `Input`
- `Select`
- `Label`
- `Button`
- `Badge`
- `LayerCard` for grouped summary/status surfaces

Astro remains responsible for static links and layout wrappers. Native controls remain acceptable inside local wrappers where Kumo does not provide a suitable component.

## Checkout

`checkout.astro` becomes a conventional two-column commerce page:

- left/main column: contact information, shipping address, payment method
- right column: sticky order summary with line images, quantities, totals, and availability
- mobile: summary moves into the normal flow or an accessible disclosure before submission

The form renders fields exposed by `CheckoutResource.fields` and maps them to a typed field registry containing:

- label
- autocomplete token
- required status
- control type
- error mapping

Bounded values use selects:

- country
- payment provider
- future delivery method when Commerce exposes one

Freeform values use inputs:

- name
- email
- phone
- address lines
- city
- state/region when not backed by a bounded option set
- postal code

Do not invent shipping methods or client-side totals. The current Commerce contract exposes no shipping-method list and Commerce Core remains authoritative for totals.

Preserve the current submission sequence:

1. load checkout resource
2. render enabled payment methods
3. validate required fields and local input format
4. `commerceClient.checkout.update(...)`
5. `commerceClient.checkout.start(...)` with the existing idempotency key and expected total
6. persist order ID/access token
7. redirect to the provider checkout URL

Errors must be rendered inline and at form level. Submit controls disable during requests. Empty carts and unavailable lines cannot proceed.

## Cart and Product Presentation

### Cart

Cart lines become visual product rows containing:

- product thumbnail or fallback
- product/variant name
- SKU where available
- unit price
- quantity control
- line total
- remove action

The summary card contains subtotal/current total, availability notice, and checkout CTA. Quantity remains bounded to 1–99 and server updates remain authoritative.

### Product detail

Product detail uses a standard gallery/purchase split:

- image gallery with consistent main-image ratio and thumbnails
- product title, description, price, variant select, quantity control, and add-to-cart CTA
- feedback status for add-to-cart success/failure
- responsive single-column mobile layout

## Order Preview and Media Contract

Add optional line media snapshots to the shared contracts and Commerce Core domain types:

```ts
interface ProductMediaSnapshot {
  mediaId?: string;
  url: string;
  alt?: string;
}
```
Media URLs may be same-origin paths beginning with `/` (excluding `//`) or absolute `http:`/`https:` URLs. Reject `javascript:`, `data:`, and other schemes before rendering.

`CartLine`, `StoreCartLine`, `OrderSnapshotLineInput`, `OrderSnapshotLine`, and the shared `OrderItem` receive an optional `image?: ProductMediaSnapshot` property.

Media flow:

1. `catalogCartItem(...)` resolves the published product and selected variant.
2. It selects the product’s primary image and puts the snapshot on the newly-added cart line.
3. Cart/storefront resources expose that optional image to the theme.
4. Checkout order-line construction copies the image into the order snapshot.
5. The public order endpoint returns the image as part of the safe order response while continuing to remove `orderAccessToken`.

Existing carts and orders without media remain valid. The theme renders a stable placeholder and never fetches current catalog media to reconstruct historical orders.

The order page renders:

- order reference and created date
- status/payment status badges
- purchased item thumbnail, name, SKU/variant, quantity, unit price, and line total
- subtotal, shipping, tax/discount, and total rows
- customer and shipping address cards
- explicit fallback for missing/legacy media

## Error and Accessibility Requirements

All interactive islands expose explicit states:

- loading
- empty
- unavailable
- validation error
- API error with safe retry where applicable
- request in progress
- success/completed
- missing media fallback

Accessibility requirements:

- every Kumo field has an associated label
- inline errors are associated with their fields and a form-level alert/status region announces submission failures
- keyboard users can operate navigation, selects, quantity controls, and retry actions
- focus-visible styling remains visible against theme surfaces
- images use meaningful alt text; decorative placeholders use empty alt text
- mobile navigation remains keyboard and screen-reader usable
- order access remains token-gated through the existing browser-local access token

## Verification

Required checks:

- Commerce Core unit tests for cart image capture, order image propagation, and backward-compatible snapshots
- contracts and Commerce Core typecheck
- template `astro check`/typecheck and production build
- browser smoke on desktop and mobile for home, shop, product, cart, checkout, checkout result, and order routes
- dropdown interaction for country/payment controls
- required-field and invalid-email checkout validation
- cart thumbnail/quantity/remove behavior
- order thumbnail rendering and missing-media fallback
- mobile no-horizontal-overflow check
- reduced-motion behavior remains respected

No project-wide UI framework migration, TanStack adoption, or unrelated commerce feature work is included.
