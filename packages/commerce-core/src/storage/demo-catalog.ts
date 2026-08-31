import {
  validateInventoryInput,
  validateProductInput,
  validateVariantInput,
} from "../domain/products.js";
import type {
  InventoryDocument,
  ProductDocument,
  VariantDocument,
} from "../domain/products.js";
import type { CommerceRepositories, JsonDocument } from "./repositories.js";

export type DemoCatalogProductSeed = Omit<ProductDocument, "createdAt" | "updatedAt"> & {
  id: string;
  variants?: Array<DemoCatalogVariantSeed>;
  inventory?: Array<DemoCatalogInventorySeed>;
};

export type DemoCatalogVariantSeed = Omit<VariantDocument, "productId" | "createdAt" | "updatedAt"> & {
  id: string;
};

export type DemoCatalogInventorySeed = Omit<InventoryDocument, "productId" | "variantId" | "updatedAt"> & {
  id: string;
  variantId?: string;
};

export interface DemoCatalogSeed {
  products: DemoCatalogProductSeed[];
}

export type DemoCatalogSeedResult =
  | {
      seeded: false;
      reason: "existing-catalog";
      productCount: 0;
      variantCount: 0;
      inventoryCount: 0;
    }
  | {
      seeded: true;
      productCount: number;
      variantCount: number;
      inventoryCount: number;
    };

type PreparedSeed = {
  product: { id: string; data: ProductDocument };
  variants: Array<{ id: string; data: VariantDocument }>;
  inventory: Array<{ id: string; data: InventoryDocument }>;
};

function seedId(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function assertUnique(ids: Set<string>, id: string, field: string): void {
  if (ids.has(id)) throw new TypeError(`${field} contains duplicate id ${id}`);
  ids.add(id);
}

function prepareSeed(seed: DemoCatalogSeed): { prepared: PreparedSeed[]; counts: Omit<Extract<DemoCatalogSeedResult, { seeded: true }>, "seeded"> } {
  if (!seed || !Array.isArray(seed.products)) {
    throw new TypeError("demoCatalog.products must be an array");
  }

  const timestamp = new Date().toISOString();
  const productIds = new Set<string>();
  const variantIds = new Set<string>();
  const inventoryIds = new Set<string>();
  const prepared: PreparedSeed[] = [];

  for (const entry of seed.products) {
    const productId = seedId(entry?.id, "product id");
    assertUnique(productIds, productId, "product ids");
    const { id: _id, variants = [], inventory = [], ...productInput } = entry;
    if (!Array.isArray(variants)) throw new TypeError(`variants for ${productId} must be an array`);
    if (!Array.isArray(inventory)) throw new TypeError(`inventory for ${productId} must be an array`);

    const product = validateProductInput({
      ...productInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const preparedVariants = variants.map((entry) => {
      const variantId = seedId(entry?.id, `variant id for ${productId}`);
      assertUnique(variantIds, variantId, "variant ids");
      const { id: _variantId, ...variantInput } = entry;
      return {
        id: variantId,
        data: validateVariantInput({
          ...variantInput,
          createdAt: timestamp,
          updatedAt: timestamp,
        }, productId),
      };
    });
    const preparedInventory = inventory.map((entry) => {
      const inventoryId = seedId(entry?.id, `inventory id for ${productId}`);
      assertUnique(inventoryIds, inventoryId, "inventory ids");
      const { id: _inventoryId, variantId, ...inventoryInput } = entry;
      return {
        id: inventoryId,
        data: validateInventoryInput({
          ...inventoryInput,
          updatedAt: timestamp,
        }, productId, variantId),
      };
    });
    prepared.push({
      product: { id: productId, data: product },
      variants: preparedVariants,
      inventory: preparedInventory,
    });
  }

  return {
    prepared,
    counts: {
      productCount: prepared.length,
      variantCount: prepared.reduce((count, item) => count + item.variants.length, 0),
      inventoryCount: prepared.reduce((count, item) => count + item.inventory.length, 0),
    },
  };
}

export async function seedDemoCatalog(
  repositories: CommerceRepositories,
  seed: DemoCatalogSeed,
): Promise<DemoCatalogSeedResult> {
  if (await repositories.products.count() > 0) {
    return {
      seeded: false,
      reason: "existing-catalog",
      productCount: 0,
      variantCount: 0,
      inventoryCount: 0,
    };
  }

  const { prepared, counts } = prepareSeed(seed);
  for (const item of prepared) {
    await repositories.products.put(item.product.id, item.product.data as unknown as JsonDocument);
  }
  for (const item of prepared) {
    for (const variant of item.variants) {
      await repositories.variants.put(variant.id, variant.data as unknown as JsonDocument);
    }
  }
  for (const item of prepared) {
    for (const inventory of item.inventory) {
      await repositories.inventory.put(inventory.id, inventory.data as unknown as JsonDocument);
    }
  }

  return { seeded: true, ...counts };
}
