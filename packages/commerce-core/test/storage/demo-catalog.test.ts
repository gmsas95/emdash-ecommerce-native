import { describe, expect, it } from "vitest";
import { seedDemoCatalog } from "../../src/storage/demo-catalog.js";
import { createMemoryRepositories } from "../../src/storage/repositories.js";

const seed = {
  products: [
    {
      id: "product-one",
      name: "Demo ready-to-cook pack",
      slug: "demo-ready-to-cook-pack",
      description: "Preview product.",
      status: "published" as const,
      currency: "MYR",
      images: [],
      hasVariants: true,
      variants: [
        {
          id: "variant-one",
          name: "Single pack",
          sku: "DEMO-ONE-SINGLE",
          status: "published" as const,
          priceMinor: 1890,
          currency: "MYR",
          options: { size: "Single pack" },
        },
      ],
      inventory: [
        {
          id: "inventory-one",
          variantId: "variant-one",
          sku: "DEMO-ONE-SINGLE",
          status: "active" as const,
          available: 12,
          reserved: 0,
        },
      ],
    },
  ],
};

describe("Commerce demo catalog seeding", () => {
  it("writes products, variants, and inventory with relationships", async () => {
    const repositories = createMemoryRepositories();

    await expect(seedDemoCatalog(repositories, seed)).resolves.toMatchObject({
      seeded: true,
      productCount: 1,
      variantCount: 1,
      inventoryCount: 1,
    });

    await expect(repositories.products.get("product-one")).resolves.toMatchObject({
      name: "Demo ready-to-cook pack",
      hasVariants: true,
      updatedAt: expect.any(String),
    });
    await expect(repositories.variants.get("variant-one")).resolves.toMatchObject({
      productId: "product-one",
      priceMinor: 1890,
    });
    await expect(repositories.inventory.get("inventory-one")).resolves.toMatchObject({
      productId: "product-one",
      variantId: "variant-one",
      available: 12,
    });
  });

  it("skips an existing catalog without overwriting it", async () => {
    const repositories = createMemoryRepositories();
    await repositories.products.put("existing", {
      name: "Operator product",
      slug: "operator-product",
      description: "Existing record.",
      status: "published",
      currency: "MYR",
      images: [],
      hasVariants: false,
      priceMinor: 2500,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await expect(seedDemoCatalog(repositories, seed)).resolves.toMatchObject({
      seeded: false,
      reason: "existing-catalog",
    });
    await expect(repositories.products.get("existing")).resolves.toMatchObject({ name: "Operator product" });
    await expect(repositories.products.get("product-one")).resolves.toBeUndefined();
  });

  it("validates all records before writing any seed data", async () => {
    const repositories = createMemoryRepositories();
    const invalidSeed = {
      products: [
        seed.products[0],
        { ...seed.products[0], id: "product-one" },
      ],
    };

    await expect(seedDemoCatalog(repositories, invalidSeed)).rejects.toThrow(/duplicate id/);
    await expect(repositories.products.count()).resolves.toBe(0);
    await expect(repositories.variants.count()).resolves.toBe(0);
    await expect(repositories.inventory.count()).resolves.toBe(0);
  });
});
