import { describe, expect, it } from "vitest";
import type { AddressSnapshot, ProductMediaSnapshot } from "@gmsas95/emdash-commerce-contracts";
import { formatAddress, hasOrderMedia, statusLabel } from "../src/components/commerce/order-state";

describe("formatAddress", () => {
  it("formats complete and partial addresses as display lines", () => {
    expect(formatAddress({
      name: "Buyer",
      company: "Acme",
      line1: "1 Main Street",
      line2: "Suite 2",
      city: "Kuala Lumpur",
      state: "WP",
      postalCode: "50000",
      country: "MY",
      phone: "+60123456789",
    })).toEqual(["Buyer", "Acme", "1 Main Street", "Suite 2", "50000 Kuala Lumpur", "WP", "MY", "+60123456789"]);
    expect(formatAddress({ line1: "1 Main Street", city: "KL", postalCode: "50000", country: "MY" })).toEqual(["1 Main Street", "50000 KL", "MY"]);
    expect(formatAddress(undefined)).toEqual([]);
    expect(formatAddress({ line1: "", city: "", postalCode: "", country: "" } as AddressSnapshot)).toEqual([]);
  });
});

describe("statusLabel", () => {
  it("maps known statuses and preserves unknown values", () => {
    expect(statusLabel("pending_payment")).toBe("Awaiting payment");
    expect(statusLabel("paid")).toBe("Paid");
    expect(statusLabel("fulfilled")).toBe("Fulfilled");
    expect(statusLabel("custom_status")).toBe("custom_status");
  });
});

describe("hasOrderMedia", () => {
  it("only accepts safe historical media URLs", () => {
    expect(hasOrderMedia(undefined)).toBe(false);
    expect(hasOrderMedia({ url: "/media/demo/item.svg" })).toBe(true);
    expect(hasOrderMedia({ url: "https://cdn.example.test/item.jpg" })).toBe(true);
    expect(hasOrderMedia({ url: "javascript:alert(1)" })).toBe(false);
    expect(hasOrderMedia({ url: "//evil.example/item.jpg" } as ProductMediaSnapshot)).toBe(false);
  });
});
