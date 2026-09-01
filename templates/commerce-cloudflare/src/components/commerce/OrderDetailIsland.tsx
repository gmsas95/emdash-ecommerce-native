import { Badge, Button } from "@cloudflare/kumo";
import type { OrderSnapshot } from "@emdash-commerce/core/domain/orders";
import * as React from "react";
import { commerceClient, formatMinorAmount } from "../../lib/commerce";
import { CommerceProductImage } from "./CommerceProductImage";
import { CommerceStatus, RetryButton } from "./CommerceStatus";
import { formatAddress, hasOrderMedia, statusLabel } from "./order-state";


interface Props {
  orderId: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Order not found.";
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(date);
}

function statusVariant(status: string | undefined): "success" | "warning" | "error" | "secondary" {
  if (status === "paid" || status === "fulfilled" || status === "completed") return "success";
  if (status === "failed" || status === "cancelled" || status === "refunded") return "error";
  if (status === "pending_payment" || status === "processing" || status === "partially_fulfilled") return "warning";
  return "secondary";
}

export function OrderDetailIsland({ orderId }: Props) {
  const [order, setOrder] = React.useState<OrderSnapshot | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [missingToken, setMissingToken] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setMissingToken(false);
    let token: string | null = null;
    try {
      token = window.localStorage.getItem("commerce-order-access-token");
    } catch {
      token = null;
    }
    if (!token) {
      setMissingToken(true);
      setLoading(false);
      return;
    }
    try {
      setOrder(await commerceClient.orders.get(orderId, token));
    } catch (reason) {
      setError(errorMessage(reason));
      setOrder(undefined);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <CommerceStatus message="Loading your order…" />;
  if (missingToken) {
    return <CommerceStatus message="Open this page from the same browser used at checkout, or contact support with your order ID." />;
  }
  if (error && !order) return <CommerceStatus message={error} status="error" action={<RetryButton onClick={() => void load()} />} />;
  if (!order) return <CommerceStatus message="Order details are unavailable." status="error" />;

  const currentStatus = order.status;
  const lines = order.lines || [];
  const customer = order.customer;
  const addressLines = formatAddress(order.shippingAddress);
  return (
    <div className="order-layout">
      <main className="order-main">
        <section className="commerce-card order-items-card" aria-labelledby="order-items-title">
          <div className="order-card-header">
            <h2 id="order-items-title">Items in your order</h2>
            <Badge variant={statusVariant(currentStatus)}>{statusLabel(currentStatus)}</Badge>
          </div>
          <div className="order-items">
            {lines.map((line) => (
              <article className="order-item" key={line.lineId}>
                <CommerceProductImage src={hasOrderMedia(line.image) ? line.image?.url : undefined} alt={line.image?.alt || line.name} size="thumb" />
                <div className="order-item__copy">
                  <h3>{line.name}</h3>
                  <p>Qty {line.quantity} · {formatMinorAmount(line.unitAmountMinor, line.currency)} each</p>
                  {line.sku && <p>SKU {line.sku}</p>}
                  {line.variantId && <p>Option {line.variantId}</p>}
                </div>
                <strong>{formatMinorAmount(line.totalMinor, line.currency)}</strong>
              </article>
            ))}
          </div>
          <dl className="commerce-summary__totals order-totals">
            <div><dt>Subtotal</dt><dd>{formatMinorAmount(order.subtotalMinor, order.currency)}</dd></div>
            <div className="commerce-summary__total"><dt>Total</dt><dd>{formatMinorAmount(order.totalMinor, order.currency)}</dd></div>
          </dl>
        </section>
        <section className="commerce-card order-support-card">
          <h2>Need help?</h2>
          <p>Keep your order reference when contacting support about delivery or payment.</p>
          <Button type="button" variant="outline" onClick={() => window.print()}>Print order</Button>
        </section>
      </main>
      <aside className="order-sidebar">
        <section className="commerce-card commerce-form-section order-status-card">
          <h2>Order details</h2>
          <dl className="commerce-order-meta">
            <div><dt>Order reference</dt><dd>{order.orderNumber ? `#${order.orderNumber}` : order.orderId}</dd></div>
            <div><dt>Placed</dt><dd>{dateLabel(order.createdAt)}</dd></div>
            <div><dt>Payment</dt><dd>{statusLabel(order.paymentStatus)}</dd></div>
          </dl>
        </section>
        {customer && (
          <section className="commerce-card commerce-form-section">
            <h2>Contact</h2>
            {customer.name && <p>{customer.name}</p>}
            {customer.email && <p><a href={`mailto:${customer.email}`}>{customer.email}</a></p>}
            {customer.phone && <p>{customer.phone}</p>}
          </section>
        )}
        {addressLines.length > 0 && (
          <section className="commerce-card commerce-form-section">
            <h2>Shipping address</h2>
            <address>{addressLines.map((line) => <span key={line}>{line}</span>)}</address>
          </section>
        )}
      </aside>
    </div>
  );
}
