import {
  createCommerceClient,
  type CommerceFetcher,
} from "@emdash-commerce/core/storefront/client";
import type {
  CatalogResult,
  CommerceClient,
} from "@emdash-commerce/core/storefront/types";

export const COMMERCE_BASE = "/_emdash/api/plugins/emdash-commerce";
const CART_TOKEN_KEY = "emdash-commerce-cart-token";

export interface CatalogVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  status: "draft" | "published" | "archived";
  priceMinor: number;
  currency: string;
  options: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogProduct {
  name: string;
  slug: string;
  description: string;
  status: "draft" | "published" | "archived";
  sku?: string;
  priceMinor?: number;
  compareAtMinor?: number;
  currency: string;
  images: Array<{ mediaId: string; url: string; alt: string }>;
  hasVariants: boolean;
  createdAt: string;
  updatedAt: string;
  variants: CatalogVariant[];
}

export interface CatalogItem {
  id: string;
  data: CatalogProduct;
}

export type StorefrontCatalog = CatalogResult<CatalogItem>;
export type StorefrontCommerceClient = Omit<CommerceClient, "catalog"> & {
  catalog: {
    list(): Promise<StorefrontCatalog>;
  };
};

function readCartToken(): string | undefined {
  try {
    const token = window.localStorage.getItem(CART_TOKEN_KEY);
    return token === null || token === "" ? undefined : token;
  } catch {
    return undefined;
  }
}

function writeCartToken(token: string | undefined): void {
  try {
    if (token === undefined) window.localStorage.removeItem(CART_TOKEN_KEY);
    else window.localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    // Cookie transport or in-memory client state remains available when storage is blocked.
  }
}

export function createBrowserCommerceClient(): StorefrontCommerceClient {
  return createCommerceClient(fetch, COMMERCE_BASE, {
    cartToken: typeof window === "undefined" ? undefined : readCartToken(),
    onCartToken: writeCartToken,
  }) as StorefrontCommerceClient;
}

export const commerceClient = createBrowserCommerceClient();

export function createServerCommerceFetcher(origin: URL): CommerceFetcher {
  return (input, init) => fetch(new URL(input, origin), init);
}

export function getCatalog(fetcher: CommerceFetcher = fetch): Promise<StorefrontCatalog> {
  return createCommerceClient(fetcher, COMMERCE_BASE).catalog.list() as Promise<StorefrontCatalog>;
}

export function formatMinorAmount(amountMinor: number, currency: string): string {
  const amount = Number.isSafeInteger(amountMinor) && amountMinor >= 0 ? amountMinor : 0;
  const code = /^[A-Z]{3}$/.test(currency) ? currency : "USD";
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100);
}

export function imageUrl(url: string | undefined): string {
  return url && url.trim() !== "" ? url : "/commerce-placeholder.svg";
}
