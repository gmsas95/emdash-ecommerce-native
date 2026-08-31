# `@emdash-cms/analytics-core`

Consent-aware, provider-neutral analytics runtime for EmDash sites and Commerce themes.

## Event contract

```ts
const event = {
  id: "stable-event-id",
  name: "purchase",
  occurredAt: new Date().toISOString(),
  source: "server",
  currency: "MYR",
  value: 18.9,
  items: [{ id: "product-id", quantity: 1, value: 18.9, currency: "MYR" }],
};
```

Supported events are `page_view`, `view_item`, `search`, `add_to_cart`,
`remove_from_cart`, `begin_checkout`, `purchase`, `refund`, and `lead`. Purchase and
refund events must have `source: "server"`; a browser return URL is not payment proof.
Sensitive property names, provider credentials, access tokens, full addresses, and raw
provider callback payloads are rejected.

## Runtime

```ts
import { createAnalyticsDispatcher } from "@emdash-cms/analytics-core/runtime";
import { createGA4Adapter } from "@emdash-cms/analytics-ga4";

const analytics = createAnalyticsDispatcher({
  adapters: [createGA4Adapter({ measurementId: "G-XXXXXXXXXX" })],
  consentRequired: true,
  readConsent: () => window.localStorage.getItem("analytics-consent") === "granted",
});

await analytics.start();
await analytics.track({
  id: crypto.randomUUID(),
  name: "page_view",
  occurredAt: new Date().toISOString(),
  source: "client",
  page: { path: window.location.pathname },
});
```

The dispatcher queues events until consent and adapter loading complete, deduplicates by
stable event ID, and isolates adapter failures. Provider scripts are loaded only after
consent. The native EmDash plugin stores browser IDs and consent/debug settings in
server-side plugin settings and uses the trusted `page:fragments` hook for configuration.
