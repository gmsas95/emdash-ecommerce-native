import type { AddressSnapshot, ProductMediaSnapshot } from "@gmsas95/emdash-commerce-contracts";

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  partially_fulfilled: "Partially fulfilled",
  fulfilled: "Fulfilled",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  refunded: "Refunded",
  pending: "Pending",
};

export function formatAddress(address: AddressSnapshot | undefined): string[] {
  if (!address) return [];
  const cityLine = [address.postalCode, address.city].filter((value) => value.trim() !== "").join(" ");
  return [address.name, address.company, address.line1, address.line2, cityLine, address.state, address.country, address.phone]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "");
}

export function statusLabel(status: string | undefined): string {
  if (!status) return "Created";
  return ORDER_STATUS_LABELS[status] || status;
}

export function hasOrderMedia(image: ProductMediaSnapshot | undefined): boolean {
  if (!image || typeof image.url !== "string") return false;
  const url = image.url.trim();
  const isRelativePath = url.startsWith("/") && !url.startsWith("//");
  const isAbsoluteHttpUrl = /^https?:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(url);
  return (isRelativePath || isAbsoluteHttpUrl) && url !== "/";
}
