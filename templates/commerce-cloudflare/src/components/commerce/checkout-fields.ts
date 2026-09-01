import type { CheckoutResource } from "@emdash-commerce/core/storefront/types";

export interface CheckoutFieldSpec {
  name: string;
  label: string;
  autocomplete: string;
  required: boolean;
  control: "input" | "email" | "tel" | "select";
}

export const CHECKOUT_FIELD_SPECS: Record<string, CheckoutFieldSpec> = {
  name: { name: "name", label: "Name", autocomplete: "name", required: true, control: "input" },
  email: { name: "email", label: "Email address", autocomplete: "email", required: true, control: "email" },
  phone: { name: "phone", label: "Phone number", autocomplete: "tel", required: false, control: "tel" },
  line1: { name: "line1", label: "Address", autocomplete: "address-line1", required: true, control: "input" },
  line2: { name: "line2", label: "Address line 2", autocomplete: "address-line2", required: false, control: "input" },
  city: { name: "city", label: "City", autocomplete: "address-level2", required: true, control: "input" },
  state: { name: "state", label: "State or province", autocomplete: "address-level1", required: false, control: "input" },
  postalCode: { name: "postalCode", label: "Postal code", autocomplete: "postal-code", required: true, control: "input" },
  country: { name: "country", label: "Country", autocomplete: "country", required: true, control: "select" },
};

export function checkoutFieldError(name: string, value: string): string | undefined {
  const field = CHECKOUT_FIELD_SPECS[name];
  const trimmedValue = value.trim();
  if (field?.required && !trimmedValue) return `${field.label} is required.`;
  if (name === "email" && trimmedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

export function fieldsForCheckout(resource: CheckoutResource): CheckoutFieldSpec[] {
  const names = [...resource.fields.customer, ...resource.fields.shippingAddress];
  const seen = new Set<string>();
  return names.flatMap((name) => {
    if (seen.has(name)) return [];
    seen.add(name);
    const field = CHECKOUT_FIELD_SPECS[name];
    return field ? [field] : [];
  });
}
