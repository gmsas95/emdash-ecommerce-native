# `@emdash-cms/analytics-ga4`

First-party Google Analytics 4 adapter for `@emdash-cms/analytics-core`.

```ts
import { createGA4Adapter } from "@emdash-cms/analytics-ga4";

const adapter = createGA4Adapter({ measurementId: "G-XXXXXXXXXX" });
```

The adapter disables GA4's automatic page view and sends normalized EmDash events only
through the Analytics Core consent gate. It maps current published catalog, cart,
checkout, lead, purchase, and refund data without sending payment credentials, order
access tokens, full addresses, or unnecessary personal data.
