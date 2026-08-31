import { describe, expect, it } from "vitest";
import { addCartLine } from "../../src/domain/cart.js";

describe("addCartLine", () => {
  it("merges repeated product lines without mutating the cart", () => {
    const cart = {
      id: "cart-1",
      currency: "USD",
      lines: [{ lineId: "line-1", productId: "p-1", unitAmountMinor: 1000, quantity: 1, currency: "USD" }],
    };

    const next = addCartLine(cart, { productId: "p-1", unitAmountMinor: 1000, quantity: 2, currency: "USD" });

    expect(next.lines).toHaveLength(1);
    expect(next.lines[0].quantity).toBe(3);
    expect(cart.lines[0].quantity).toBe(1);
  });
  it("keeps line IDs unique when the same product price changes", () => {
    const cart = {
      id: "cart-1",
      currency: "USD",
      lines: [{ lineId: "p-1-default-line", productId: "p-1", unitAmountMinor: 1000, quantity: 1, currency: "USD" }],
    };

    const next = addCartLine(cart, { productId: "p-1", unitAmountMinor: 1250, quantity: 1, currency: "USD" });

    expect(next.lines).toHaveLength(2);
    expect(next.lines[1].lineId).toBe("p-1-default-line-2");
  });

  it("rejects cart lines in a different currency", () => {
    expect(() => addCartLine({ id: "cart-1", currency: "USD", lines: [] }, {
      productId: "p-1",
      unitAmountMinor: 1000,
      quantity: 1,
      currency: "EUR",
    })).toThrow("currency");
  });

  it("rejects invalid existing line invariants", () => {
    expect(() => addCartLine({
      id: "cart-1",
      currency: "USD",
      lines: [{ lineId: "bad", productId: "p-1", unitAmountMinor: 1000, quantity: 1.5, currency: "USD", totalMinor: 1000 }],
    }, {
      productId: "p-2",
      unitAmountMinor: 500,
      quantity: 1,
      currency: "USD",
    })).toThrow("quantity");

    expect(() => addCartLine({
      id: "cart-1",
      currency: "USD",
      lines: [{ lineId: "bad", productId: "p-1", unitAmountMinor: 1000, quantity: 1, currency: "USD", totalMinor: 999 }],
    }, {
      productId: "p-2",
      unitAmountMinor: 500,
      quantity: 1,
      currency: "USD",
    })).toThrow("totalMinor");
  });
});
