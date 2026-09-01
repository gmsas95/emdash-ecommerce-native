import type { CustomerSnapshot, ProductMediaSnapshot } from "@gmsas95/emdash-commerce-contracts";
import type { OrderSnapshot } from "../domain/orders.js";

export interface CatalogResult<T = unknown> {
  items: T[];
  cursor?: string;
  hasMore?: boolean;
}

export interface StoreTotals {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
}

export interface StoreCartLine {
  lineId: string;
  productId: string;
  variantId?: string;
  sku?: string;
  name?: string;
  unitAmountMinor: number;
  quantity: number;
  currency: string;
  totalMinor: number;
  image?: ProductMediaSnapshot;
}

export type CartResultLine = StoreCartLine;

export interface StoreAvailability {
  lineId: string;
  status: "available" | "unavailable" | "unknown";
  requestedQuantity: number;
  availableQuantity?: number;
  reason?: string;
}

export interface StoreApiNotice {
  code: string;
  message: string;
  details?: unknown;
}

export interface StoreCart {
  id: string;
  token?: string;
  currency: string;
  lines: StoreCartLine[];
  totals: StoreTotals;
  availability: StoreAvailability[];
  errors: StoreApiNotice[];
  extensions: Record<string, unknown>;
  session?: { expiresAt: string };
}

export type CartResult = StoreCart;

export interface CartCreateInput {
  cartId?: string;
  currency?: string;
}

export interface CartItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CartItemUpdateInput {
  lineId: string;
  quantity: number;
}

export interface CartLineInput {
  cartId?: string;
  line: CartItemInput;
}

export interface PaymentMethod {
  id: string;
  label: string;
  mode: "redirect" | "embedded" | "offline";
  enabled: boolean;
}

export interface CheckoutResource {
  cart: StoreCart;
  totals: StoreTotals;
  paymentMethods: PaymentMethod[];
  fields: {
    customer: string[];
    shippingAddress: string[];
  };
  availability: StoreAvailability[];
  errors: StoreApiNotice[];
  extensions: Record<string, unknown>;
}

export interface CheckoutUpdateInput {
  customer?: CustomerSnapshot;
  shippingAddress?: Record<string, unknown>;
  paymentProvider?: string;
}

export interface CheckoutStartInput {
  cartId?: string;
  paymentProvider: string;
  idempotencyKey: string;
  customer?: CustomerSnapshot;
  shippingAddress?: Record<string, unknown>;
  expectedTotalMinor?: number;
}

export interface CheckoutResult {
  orderId: string;
  orderAccessToken: string;
  checkoutUrl: string;
  paymentReference?: string;
  totalMinor: number;
  currency: string;
}

export interface CommerceClientOptions {
  cartToken?: string;
  onCartToken?: (token: string | undefined) => void;
}

export interface CommerceClient {
  getCartToken(): string | undefined;
  setCartToken(token: string | undefined): void;
  catalog: {
    list(): Promise<CatalogResult>;
  };
  cart: {
    get(): Promise<StoreCart>;
    create(input?: CartCreateInput): Promise<StoreCart>;
    add(input: CartItemInput): Promise<StoreCart>;
    addLine(input: CartLineInput): Promise<StoreCart>;
    update(input: CartItemUpdateInput): Promise<StoreCart>;
    remove(lineId: string): Promise<StoreCart>;
  };
  checkout: {
    get(): Promise<CheckoutResource>;
    update(input: CheckoutUpdateInput): Promise<CheckoutResource>;
    start(input: CheckoutStartInput): Promise<CheckoutResult>;
  };
  orders: {
    get(orderId: string, orderAccessToken: string): Promise<OrderSnapshot>;
  };
}
