import type { Cart, CartLine } from "../domain/cart.js";
import { calculateTotals } from "../domain/totals.js";
import type {
  PaymentMethod,
  StoreAvailability,
  StoreCart,
  StoreCartLine,
  StoreTotals,
} from "./types.js";

export interface StoreCartOptions {
  token?: string;
  expiresAt?: string;
  availability?: StoreAvailability[];
}

export function toStoreTotals(cart: Cart): StoreTotals {
  return calculateTotals({
    currency: cart.currency,
    lines: cart.lines,
    discountMinor: 0,
    taxMinor: 0,
    shippingMinor: 0,
  });
}

export function toStoreAvailability(cart: Cart): StoreAvailability[] {
  return cart.lines.map((line) => ({
    lineId: line.lineId,
    status: "unknown",
    requestedQuantity: line.quantity,
  }));
}

export function toStoreCart(cart: Cart, options: StoreCartOptions = {}): StoreCart {
  const id = cart.id ?? "";
  const totals = toStoreTotals(cart);
  return {
    id,
    ...(options.token === undefined ? {} : { token: options.token }),
    currency: cart.currency,
    lines: cart.lines.map((line) => ({ ...line, totalMinor: line.totalMinor ?? line.unitAmountMinor * line.quantity })),
    totals,
    availability: options.availability ?? toStoreAvailability(cart),
    errors: [],
    extensions: {},
    ...(options.expiresAt === undefined ? {} : { session: { expiresAt: options.expiresAt } }),
  };
}

export function toPaymentMethods(
  methods: Array<PaymentMethod | { id: string; label: string; mode?: PaymentMethod["mode"]; enabled?: boolean }>,
): PaymentMethod[] {
  return methods.map((method) => ({
    id: method.id,
    label: method.label,
    mode: method.mode ?? "redirect",
    enabled: method.enabled ?? true,
  }));
}
