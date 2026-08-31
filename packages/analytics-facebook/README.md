# `@emdash-cms/analytics-facebook`

First-party Facebook Pixel adapter for `@emdash-cms/analytics-core`.

```ts
import { createFacebookPixelAdapter } from "@emdash-cms/analytics-facebook";

const adapter = createFacebookPixelAdapter({ pixelId: "1234567890" });
```

The adapter loads the Facebook script only when Analytics Core grants consent. It maps
normalized page, catalog, cart, checkout, lead, purchase, and refund events without
sending payment credentials, access tokens, full addresses, or unnecessary personal data.
