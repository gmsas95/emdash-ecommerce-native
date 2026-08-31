export const demoCatalog = {
  products: [
    {
      id: "zias-demo-ready-to-cook",
      name: "Ready-to-Cook Meal — Demo Pack",
      slug: "ready-to-cook-meal-demo-pack",
      description: "DEMO VALUE — A ready-to-cook meal preview item for the client walkthrough.",
      status: "published",
      currency: "MYR",
      images: [
        {
          mediaId: "zias-reference-product-ready-to-cook",
          url: "/media/reference/product-ready-to-cook.jpg",
          alt: "ZIAS ready-to-cook meal product family image",
        },
      ],
      hasVariants: true,
      variants: [
        {
          id: "zias-demo-ready-to-cook-single",
          name: "Single pack",
          sku: "ZIAS-DEMO-RTC-1",
          status: "published",
          priceMinor: 1890,
          currency: "MYR",
          options: { pack: "Single pack" },
        },
        {
          id: "zias-demo-ready-to-cook-family",
          name: "Family bundle",
          sku: "ZIAS-DEMO-RTC-FAMILY",
          status: "published",
          priceMinor: 3290,
          currency: "MYR",
          options: { pack: "Family bundle" },
        },
      ],
      inventory: [
        {
          id: "zias-demo-ready-to-cook-single-stock",
          variantId: "zias-demo-ready-to-cook-single",
          sku: "ZIAS-DEMO-RTC-1",
          status: "active",
          available: 24,
          reserved: 0,
        },
        {
          id: "zias-demo-ready-to-cook-family-stock",
          variantId: "zias-demo-ready-to-cook-family",
          sku: "ZIAS-DEMO-RTC-FAMILY",
          status: "active",
          available: 12,
          reserved: 0,
        },
      ],
    },
    {
      id: "zias-demo-ready-to-eat",
      name: "Ready-to-Eat Meal — Demo Pack",
      slug: "ready-to-eat-meal-demo-pack",
      description: "DEMO VALUE — A ready-to-eat meal preview item for the client walkthrough.",
      status: "published",
      sku: "ZIAS-DEMO-RTE-1",
      priceMinor: 1290,
      currency: "MYR",
      images: [
        {
          mediaId: "zias-reference-product-ready-to-eat",
          url: "/media/reference/product-ready-to-eat.jpg",
          alt: "ZIAS ready-to-eat meal product family image",
        },
      ],
      hasVariants: false,
      inventory: [
        {
          id: "zias-demo-ready-to-eat-stock",
          sku: "ZIAS-DEMO-RTE-1",
          status: "active",
          available: 18,
          reserved: 0,
        },
      ],
    },
    {
      id: "zias-demo-ground-spices",
      name: "Ground Spices — Demo Pack",
      slug: "ground-spices-demo-pack",
      description: "DEMO VALUE — A ground-spices preview item representing the ZIAS product family.",
      status: "published",
      sku: "ZIAS-DEMO-SPICE-1",
      priceMinor: 990,
      currency: "MYR",
      images: [
        {
          mediaId: "zias-reference-product-ground-spices",
          url: "/media/reference/product-ready-to-eat.jpg",
          alt: "ZIAS ground spices product family image",
        },
      ],
      hasVariants: false,
      inventory: [
        {
          id: "zias-demo-ground-spices-stock",
          sku: "ZIAS-DEMO-SPICE-1",
          status: "active",
          available: 30,
          reserved: 0,
        },
      ],
    },
    {
      id: "zias-demo-paste-marinade",
      name: "Cooking Paste & Marinade — Demo Pack",
      slug: "cooking-paste-marinade-demo-pack",
      description: "DEMO VALUE — A cooking paste and marinade preview item for the client walkthrough.",
      status: "published",
      sku: "ZIAS-DEMO-PASTE-1",
      priceMinor: 1490,
      currency: "MYR",
      images: [
        {
          mediaId: "zias-reference-product-paste-marinade",
          url: "/media/reference/product-paste-marinade.jpg",
          alt: "ZIAS cooking paste and marinade product family image",
        },
      ],
      hasVariants: false,
      inventory: [
        {
          id: "zias-demo-paste-marinade-stock",
          sku: "ZIAS-DEMO-PASTE-1",
          status: "active",
          available: 20,
          reserved: 0,
        },
      ],
    },
  ],
};
