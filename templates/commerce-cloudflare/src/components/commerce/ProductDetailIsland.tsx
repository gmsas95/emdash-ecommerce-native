import { Button, Input, Select } from "@cloudflare/kumo";
import * as React from "react";
import type { CatalogItem, CatalogVariant } from "../../lib/commerce";
import { commerceClient, formatMinorAmount } from "../../lib/commerce";
import { emitAnalytics } from "../../lib/analytics";
import { clampQuantity } from "./commerce-state";
import { CommerceProductImage } from "./CommerceProductImage";
import { CommerceStatus, RetryButton } from "./CommerceStatus";

interface Props {
  slug: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ProductDetailIsland({ slug }: Props) {
  const [item, setItem] = React.useState<CatalogItem | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
  const [selectedVariantId, setSelectedVariantId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [adding, setAdding] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; status: "success" | "error" }>();
  const [activeImage, setActiveImage] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await commerceClient.catalog.list();
      const match = result.items.find((candidate) => candidate.data?.slug === slug);
      if (!match) {
        setError("Product not found. Return to the catalog to choose another item.");
        setItem(undefined);
        return;
      }
      setItem(match);
      setSelectedVariantId(match.data.variants?.[0]?.id || "");
      setActiveImage(0);
    } catch (reason) {
      setError(errorMessage(reason, "We couldn't load this product. Retry to request the current Commerce catalog."));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!item) return;
    const variant = item.data.variants.find((candidate) => candidate.id === selectedVariantId) || item.data.variants[0];
    emitAnalytics({
      name: "view_item",
      source: "client",
      currency: variant?.currency || item.data.currency,
      items: [{ id: variant?.id || item.id, name: item.data.name, quantity: 1 }],
    });
  }, [item]);

  if (loading) return <CommerceStatus message="Loading product details…" />;
  if (error && !item) {
    return <CommerceStatus message={error} status="error" action={error.includes("not found") ? undefined : <RetryButton onClick={() => void load()} />} />;
  }
  if (!item) return <CommerceStatus message="Product details are unavailable." status="error" />;

  const product = item.data;
  const selectedVariant: CatalogVariant | undefined = product.hasVariants
    ? product.variants.find((variant) => variant.id === selectedVariantId) || product.variants[0]
    : undefined;
  const amountMinor = selectedVariant?.priceMinor ?? product.priceMinor ?? 0;
  const currency = selectedVariant?.currency || product.currency;
  const currentImage = product.images[activeImage] || product.images[0];
  const imageAlt = currentImage?.alt || product.name || "Product image";
  const quantityValue = clampQuantity(Number(quantity));

  const addToCart = async () => {
    setAdding(true);
    setFeedback(undefined);
    try {
      await commerceClient.cart.add({ productId: item.id, ...(selectedVariant ? { variantId: selectedVariant.id } : {}), quantity: quantityValue });
      window.dispatchEvent(new Event("commerce-cart-updated"));
      emitAnalytics({
        name: "add_to_cart",
        source: "client",
        currency,
        items: [{ id: selectedVariant?.id || item.id, name: product.name, quantity: quantityValue }],
      });
      setFeedback({ message: "Added to cart. Open Cart when you are ready.", status: "success" });
    } catch (reason) {
      setFeedback({ message: errorMessage(reason, "Unable to add this product to your cart."), status: "error" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="product-detail-grid">
      <div className="product-gallery">
        <CommerceProductImage src={currentImage?.url} alt={imageAlt} size="hero" />
        {product.images.length > 1 && (
          <div className="product-thumbnails" aria-label="Product images">
            {product.images.map((image, index) => (
              <button
                type="button"
                className={index === activeImage ? "is-active" : undefined}
                aria-label={`View image ${index + 1}`}
                aria-pressed={index === activeImage}
                onClick={() => setActiveImage(index)}
                key={`${image.mediaId}-${index}`}
              >
                <CommerceProductImage src={image.url} alt={image.alt || product.name} size="thumb" />
              </button>
            ))}
          </div>
        )}
      </div>
      <section className="product-detail-copy" aria-labelledby="product-title">
        <p className="product-meta">Product details · managed in Commerce</p>
        <h2 id="product-title">{product.name || "Untitled product"}</h2>
        {product.description && <p className="lede">{product.description}</p>}
        <p className="product-price">{formatMinorAmount(amountMinor, currency)}</p>
        {product.hasVariants && product.variants.length > 0 && (
          <Select
            label="Choose an option"
            value={selectedVariant?.id || ""}
            items={product.variants.map((variant) => ({ label: `${variant.name} — ${formatMinorAmount(variant.priceMinor, variant.currency)}`, value: variant.id }))}
            onValueChange={(value) => setSelectedVariantId(typeof value === "string" ? value : "")}
          />
        )}
        <Input
          type="number"
          label="Quantity"
          min={1}
          max={99}
          inputMode="numeric"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          onBlur={() => setQuantity(String(quantityValue))}
        />
        <div className="commerce-actions">
          <Button type="button" size="lg" disabled={adding} onClick={() => void addToCart()}>{adding ? "Adding…" : "Add to cart"}</Button>
          <a className="button button--outline" href="/cart">View cart</a>
        </div>
        {feedback && <CommerceStatus message={feedback.message} status={feedback.status} />}
      </section>
    </div>
  );
}
