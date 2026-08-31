# `@emdash-cms/analytics-tiktok`

First-party TikTok Pixel adapter for `@emdash-cms/analytics-core`.

```ts
import { createTikTokPixelAdapter } from "@emdash-cms/analytics-tiktok";

const adapter = createTikTokPixelAdapter({ pixelId: "PIXEL_ID" });
```

The adapter loads TikTok's browser script only after the analytics consent gate permits
it. Normalized Commerce events are translated to TikTok event names; provider credentials,
payment data, access tokens, and full customer addresses are never sent.
