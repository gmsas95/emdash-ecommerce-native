import * as React from "react";

interface Props {
  src?: string;
  alt: string;
  size?: "thumb" | "card" | "hero";
}

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  thumb: "commerce-product-image--thumb",
  card: "commerce-product-image--card",
  hero: "commerce-product-image--hero",
};

function safeImageUrl(src: string | undefined): string {
  const value = typeof src === "string" ? src.trim() : "";
  const isRelativePath = value.startsWith("/") && !value.startsWith("//");
  const isAbsoluteHttpUrl = /^https?:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(value);
  return isRelativePath || isAbsoluteHttpUrl ? value : "/commerce-placeholder.svg";
}

export function CommerceProductImage({ src, alt, size = "card" }: Props) {
  const imageSrc = safeImageUrl(src);
  const isPlaceholder = imageSrc === "/commerce-placeholder.svg";
  return (
    <div className={`commerce-product-image ${sizeClass[size]}${isPlaceholder ? " commerce-placeholder" : ""}`}>
      <img src={imageSrc} alt={alt.trim() || "Product image"} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/commerce-placeholder.svg"; }} />
    </div>
  );
}
