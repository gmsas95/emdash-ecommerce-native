import { Button, Input } from "@cloudflare/kumo";
import * as React from "react";
import type { StoreCart } from "@emdash-commerce/core/storefront/types";
import { commerceClient, formatMinorAmount } from "../../lib/commerce";
import { emitAnalytics } from "../../lib/analytics";
import { clampQuantity } from "./commerce-state";
import { CommerceProductImage } from "./CommerceProductImage";
import { CommerceStatus, RetryButton } from "./CommerceStatus";
import { CommerceSummary, type CommerceSummaryLine } from "./CommerceSummary";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CartIsland() {
  const [cart, setCart] = React.useState<StoreCart | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
  const [pendingLine, setPendingLine] = React.useState<string | undefined>();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setCart(await commerceClient.cart.get());
    } catch (reason) {
      setError(errorMessage(reason, "We couldn't load your cart."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateQuantity = async (lineId: string, value: string) => {
    const quantity = clampQuantity(Number(value));
    setPendingLine(lineId);
    setError(undefined);
    try {
      const updated = await commerceClient.cart.update({ lineId, quantity });
      setCart(updated);
      setDrafts((current) => {
        const next = { ...current };
        delete next[lineId];
        return next;
      });
      window.dispatchEvent(new Event("commerce-cart-updated"));
    } catch (reason) {
      setError(errorMessage(reason, "Unable to update your cart."));
    } finally {
      setPendingLine(undefined);
    }
  };

  const removeLine = async (line: StoreCart["lines"][number]) => {
    setPendingLine(line.lineId);
    setError(undefined);
    try {
      const updated = await commerceClient.cart.remove(line.lineId);
      setCart(updated);
      emitAnalytics({
        name: "remove_from_cart",
        source: "client",
        currency: line.currency,
        items: [{ id: line.variantId || line.productId, name: line.name, quantity: line.quantity }],
      });
      window.dispatchEvent(new Event("commerce-cart-updated"));
    } catch (reason) {
      setError(errorMessage(reason, "Unable to update your cart."));
    } finally {
      setPendingLine(undefined);
    }
  };

  if (loading) return <CommerceStatus message="Loading your current cart…" />;
  if (error && !cart) {
    return <CommerceStatus message={error} status="error" action={<RetryButton onClick={() => void load()} />} />;
  }
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="commerce-shell-empty empty-state">
        <h2>Your cart is empty</h2>
        <p>Browse the collection to choose a product.</p>
        <a className="button" href="/shop">Browse catalog</a>
      </div>
    );
  }

  const unavailable = cart.availability.filter((entry) => entry.status === "unavailable");
  const availabilityByLine = new Map(cart.availability.map((entry) => [entry.lineId, entry.status]));
  const summaryLines: CommerceSummaryLine[] = cart.lines.map((line) => ({
    ...line,
    name: line.name || line.productId,
    availability: availabilityByLine.get(line.lineId) === "unavailable" ? "unavailable" : "available",
  }));
  return (
    <div className="commerce-layout">
      <div className="commerce-main">
        {error && <CommerceStatus message={error} status="error" />}
        <section className="commerce-card cart-list" aria-label="Cart items">
          {cart.lines.map((line) => {
            const name = line.name || line.productId;
            const isPending = pendingLine === line.lineId;
            return (
              <article className="cart-row" key={line.lineId}>
                <CommerceProductImage src={line.image?.url} alt={line.image?.alt || name} size="thumb" />
                <div className="cart-row__details">
                  <h2>{name}</h2>
                  {line.sku && <p>SKU {line.sku}</p>}
                  <p>{formatMinorAmount(line.unitAmountMinor, line.currency)} each</p>
                </div>
                <Input
                  type="number"
                  size="sm"
                  min={1}
                  max={99}
                  value={drafts[line.lineId] ?? String(line.quantity)}
                  label={`Quantity for ${name}`}
                  disabled={isPending}
                  onChange={(event) => setDrafts((current) => ({ ...current, [line.lineId]: event.target.value }))}
                  onBlur={(event) => void updateQuantity(line.lineId, event.target.value)}
                />
                <strong className="cart-row__total">{formatMinorAmount(line.totalMinor, line.currency)}</strong>
                <Button type="button" variant="outline" disabled={isPending} onClick={() => void removeLine(line)}>Remove</Button>
              </article>
            );
          })}
        </section>
        {unavailable.length > 0 && <CommerceStatus message="One or more items are unavailable. Remove them before checkout." status="error" />}
        <p className="notice">Final totals and availability are confirmed by Commerce at checkout.</p>
      </div>
      <CommerceSummary
        lines={summaryLines}
        subtotalMinor={cart.totals.subtotalMinor}
        totalMinor={cart.totals.totalMinor}
        currency={cart.currency}
        availabilityWarning={unavailable.length > 0 ? "Checkout is disabled until unavailable items are removed." : undefined}
      >
        {unavailable.length > 0 ? <span className="button button--disabled" aria-disabled="true">Continue to checkout</span> : <a className="button" href="/checkout">Continue to checkout</a>}
      </CommerceSummary>
    </div>
  );
}
