import { Badge } from "@cloudflare/kumo";
import type { ReactNode } from "react";
import { formatMinorAmount } from "../../lib/commerce";
import { CommerceProductImage } from "./CommerceProductImage";

export interface CommerceSummaryLine {
  lineId: string;
  name: string;
  quantity: number;
  unitAmountMinor: number;
  totalMinor: number;
  currency: string;
  sku?: string;
  image?: { url: string; alt?: string; mediaId?: string };
  availability?: "available" | "unavailable";
}

interface Props {
  lines: CommerceSummaryLine[];
  subtotalMinor: number;
  totalMinor: number;
  currency: string;
  availabilityWarning?: string;
  children?: ReactNode;
}

export function CommerceSummary({ lines, subtotalMinor, totalMinor, currency, availabilityWarning, children }: Props) {
  return (
    <section className="commerce-summary commerce-card" aria-labelledby="commerce-summary-title">
      <h2 id="commerce-summary-title">Order summary</h2>
      <div className="commerce-summary__lines">
        {lines.map((line) => (
          <article className="commerce-line-item" key={line.lineId}>
            <CommerceProductImage src={line.image?.url} alt={line.image?.alt || line.name} size="thumb" />
            <div className="commerce-line-item__copy">
              <h3>{line.name}</h3>
              <p>Qty {line.quantity} · {formatMinorAmount(line.unitAmountMinor, line.currency)} each</p>
              {line.sku && <p>SKU {line.sku}</p>}
              {line.availability === "unavailable" && <Badge variant="warning">Unavailable</Badge>}
            </div>
            <strong>{formatMinorAmount(line.totalMinor, line.currency)}</strong>
          </article>
        ))}
      </div>
      {availabilityWarning && <div className="commerce-status" data-status="error" role="alert">{availabilityWarning}</div>}
      <dl className="commerce-summary__totals">
        <div><dt>Subtotal</dt><dd>{formatMinorAmount(subtotalMinor, currency)}</dd></div>
        <div className="commerce-summary__total"><dt>Total</dt><dd>{formatMinorAmount(totalMinor, currency)}</dd></div>
      </dl>
      {children}
    </section>
  );
}
