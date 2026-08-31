# `@gmsas95/emdash-commerce-contracts`

Public, provider-neutral TypeScript contracts shared by Commerce Core and external EmDash
provider plugins.

## Contract families

- integer minor-unit `Money` values with explicit ISO currency;
- product, variant, inventory, cart, checkout, order, and customer snapshots;
- versioned signed bridge requests and responses;
- normalized `commerce.payment.*` events;
- stable delivery, correlation, idempotency, and access-token fields.

## Boundary

This package describes canonical Commerce state and transport envelopes. It must not
contain CHIP, Stripe, shipping-provider, fulfillment-provider, tax-provider, or other
external API payload types. Provider plugins translate their payloads into these
contracts before sending events to Commerce Core.

## Example

```ts
import type { CommerceEvent, Money } from "@gmsas95/emdash-commerce-contracts";

type PaidPayload = {
  orderId: string;
  paymentId: string;
  amount: Money;
};

const event: CommerceEvent<PaidPayload> = {
  eventId: "provider-event-id",
  event: "commerce.payment.paid",
  version: 1,
  occurredAt: new Date().toISOString(),
  correlationId: "checkout-request-id",
  deliveryId: "provider-delivery-id",
  payload: {
    orderId: "order-id",
    paymentId: "provider-payment-id",
    amount: { amountMinor: 1890, currency: "MYR" },
  },
};
```

Provider implementations must use the actual exported payload type for their installed
version. The example shows the normalized event envelope, not a provider payload.

## Development

```sh
pnpm --filter @gmsas95/emdash-commerce-contracts typecheck
pnpm --filter @gmsas95/emdash-commerce-contracts build
```

Bridge schemas are versioned. Changes that alter required fields or event semantics must
include compatibility notes and contract tests.
