export const demoCatalog = {
  products: [
    {
      id: "starter-demo-daily-set",
      name: "Daily Essentials Set",
      slug: "daily-essentials-set",
      description: "DEMO VALUE — A practical starter set for everyday routines.",
      status: "published",
      currency: "USD",
      images: [
        {
          mediaId: "starter-demo-daily-set-media",
          url: "/media/demo/product-daily-set.svg",
          alt: "A neatly arranged daily essentials set",
        },
      ],
      hasVariants: true,
      variants: [
        {
          id: "starter-demo-daily-set-single",
          name: "Single set",
          sku: "STARTER-DAILY-1",
          status: "published",
          priceMinor: 2800,
          currency: "USD",
          options: { size: "Single set" },
        },
        {
          id: "starter-demo-daily-set-bundle",
          name: "Bundle",
          sku: "STARTER-DAILY-BUNDLE",
          status: "published",
          priceMinor: 4800,
          currency: "USD",
          options: { size: "Bundle" },
        },
      ],
      inventory: [
        {
          id: "starter-demo-daily-set-single-stock",
          variantId: "starter-demo-daily-set-single",
          sku: "STARTER-DAILY-1",
          status: "active",
          available: 24,
          reserved: 0,
        },
        {
          id: "starter-demo-daily-set-bundle-stock",
          variantId: "starter-demo-daily-set-bundle",
          sku: "STARTER-DAILY-BUNDLE",
          status: "active",
          available: 12,
          reserved: 0,
        },
      ],
    },
    {
      id: "starter-demo-soft-notebook",
      name: "Softcover Notebook",
      slug: "softcover-notebook",
      description: "DEMO VALUE — A quiet place for notes, lists, and bright ideas.",
      status: "published",
      sku: "STARTER-NOTEBOOK-1",
      priceMinor: 1600,
      currency: "USD",
      images: [
        {
          mediaId: "starter-demo-soft-notebook-media",
          url: "/media/demo/product-notebook.svg",
          alt: "A softcover notebook open to a blank page",
        },
      ],
      hasVariants: false,
      inventory: [
        {
          id: "starter-demo-soft-notebook-stock",
          sku: "STARTER-NOTEBOOK-1",
          status: "active",
          available: 18,
          reserved: 0,
        },
      ],
    },
    {
      id: "starter-demo-calm-candle",
      name: "Calm Evening Candle",
      slug: "calm-evening-candle",
      description: "DEMO VALUE — A warm accent for slower evenings at home.",
      status: "published",
      sku: "STARTER-CANDLE-1",
      priceMinor: 2200,
      currency: "USD",
      images: [
        {
          mediaId: "starter-demo-calm-candle-media",
          url: "/media/demo/product-candle.svg",
          alt: "A simple candle in a ceramic vessel",
        },
      ],
      hasVariants: false,
      inventory: [
        {
          id: "starter-demo-calm-candle-stock",
          sku: "STARTER-CANDLE-1",
          status: "active",
          available: 30,
          reserved: 0,
        },
      ],
    },
    {
      id: "starter-demo-cotton-tote",
      name: "Everyday Cotton Tote",
      slug: "everyday-cotton-tote",
      description: "DEMO VALUE — A durable carryall for the things you take with you.",
      status: "published",
      sku: "STARTER-TOTE-1",
      priceMinor: 1900,
      currency: "USD",
      images: [
        {
          mediaId: "starter-demo-cotton-tote-media",
          url: "/media/demo/product-tote.svg",
          alt: "A natural cotton tote bag",
        },
      ],
      hasVariants: false,
      inventory: [
        {
          id: "starter-demo-cotton-tote-stock",
          sku: "STARTER-TOTE-1",
          status: "active",
          available: 20,
          reserved: 0,
        },
      ],
    },
  ],
};
