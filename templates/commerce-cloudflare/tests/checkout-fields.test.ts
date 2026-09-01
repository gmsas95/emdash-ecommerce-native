import { describe, expect, it } from "vitest";
import type { CheckoutResource } from "@emdash-commerce/core/storefront/types";
import { checkoutFieldError, fieldsForCheckout } from "../src/components/commerce/checkout-fields";

const resource = (customer: string[], shippingAddress: string[]) => ({
  fields: { customer, shippingAddress },
} as CheckoutResource);

describe("fieldsForCheckout", () => {
  it("only exposes fields listed by Commerce with semantic controls", () => {
    const fields = fieldsForCheckout(resource(["name", "email", "phone", "unknown"], ["line1", "city", "postalCode", "country", "state"]));
    expect(fields.map((field) => field.name)).toEqual(["name", "email", "phone", "line1", "city", "postalCode", "country", "state"]);
    expect(fields.find((field) => field.name === "email")).toMatchObject({ control: "email", required: true });
    expect(fields.find((field) => field.name === "phone")).toMatchObject({ control: "tel", required: false });
    expect(fields.find((field) => field.name === "country")).toMatchObject({ control: "select", required: true });
    for (const name of ["name", "email", "line1", "city", "postalCode", "country"]) {
      expect(fields.find((field) => field.name === name)?.required).toBe(true);
    }
  });
});

describe("checkoutFieldError", () => {
  it("rejects blank required values and invalid email addresses", () => {
    expect(checkoutFieldError("name", " ")).toBe("Name is required.");
    expect(checkoutFieldError("email", "invalid")).toBe("Enter a valid email address.");
    expect(checkoutFieldError("email", "buyer@example.com")).toBeUndefined();
    expect(checkoutFieldError("phone", "")).toBeUndefined();
  });
});
