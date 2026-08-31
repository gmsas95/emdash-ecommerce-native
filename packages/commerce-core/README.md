# `@emdash-commerce/core`

Native, provider-neutral Commerce plugin for EmDash CMS.

## Owns

- products and variants;
- inventory levels and reservation holds;
- cart sessions and cart lines;
- server-authoritative checkout resources and totals;
- orders, customers, addresses, and order events;
- provider-neutral native admin pages and storefront-safe helpers;
- signed bridge commands and idempotent normalized provider-event handling.

## Does not own

Payment-provider SDKs, shipping or fulfillment APIs, provider credentials, provider
webhook payloads, or provider-specific persistence. Those belong in sandboxed EmDash
marketplace plugins. See [Sandboxed Provider Plugins](../../docs/provider-plugins.md).

## Integration rules

Commerce consumers must use the documented Store API, native plugin routes, and versioned
Commerce Contracts. Do not reconstruct totals or availability in browser storage. Product
sections and storefront themes read live published Commerce data instead of copying prices
or inventory into CMS content.

Payment providers communicate through the signed Commerce bridge:

```text
commerce.payment.create|status|refund  # signed commands
commerce.payment.*                    # normalized provider events
```

Bridge deliveries retain stable delivery IDs and correlation fields so repeated provider
callbacks are safe to apply.

## Development

From the workspace root:

```sh
pnpm --filter @emdash-commerce/core typecheck
pnpm --filter @emdash-commerce/core build
pnpm test
```

The package requires an EmDash runtime (`>=0.33.0`) and React (`>=18`). It is currently
private to the personal distribution workspace; `@gmsas95/emdash-commerce-contracts` is
the separately consumable public contract package.
