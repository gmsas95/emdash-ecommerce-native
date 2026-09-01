import { Badge, Button, Input, Label, Select } from "@cloudflare/kumo";
import * as React from "react";
import type { CheckoutResource, CheckoutResult } from "@emdash-commerce/core/storefront/types";
import { commerceClient } from "../../lib/commerce";
import { emitAnalytics } from "../../lib/analytics";
import { checkoutFieldError, fieldsForCheckout, type CheckoutFieldSpec } from "./checkout-fields";
import { CommerceStatus, RetryButton } from "./CommerceStatus";
import { CommerceSummary, type CommerceSummaryLine } from "./CommerceSummary";

const COUNTRY_CODES = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_OPTIONS = COUNTRY_CODES.map((code) => ({ code, label: countryNames.of(code) || code }));

const CUSTOMER_FIELDS: Record<string, true> = { name: true, email: true, phone: true };
const ADDRESS_FIELDS: Record<string, true> = { name: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function initialValues(fields: CheckoutFieldSpec[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, field.name === "country" ? "MY" : ""]));
}

export function CheckoutIsland() {
  const [resource, setResource] = React.useState<CheckoutResource | undefined>();
  const [fields, setFields] = React.useState<CheckoutFieldSpec[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [paymentProvider, setPaymentProvider] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<string | undefined>();
  const idempotencyKey = React.useRef(crypto.randomUUID());

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const nextResource = await commerceClient.checkout.get();
      const nextFields = fieldsForCheckout(nextResource);
      const enabledMethod = nextResource.paymentMethods.find((method) => method.enabled);
      setResource(nextResource);
      setFields(nextFields);
      setValues(initialValues(nextFields));
      setPaymentProvider(enabledMethod?.id || "");
    } catch (reason) {
      setError(errorMessage(reason, "Unable to load checkout."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <CommerceStatus message="Preparing secure checkout…" />;
  if (error && !resource) return <CommerceStatus message={error} status="error" action={<RetryButton onClick={() => void load()} />} />;
  if (!resource) return <CommerceStatus message="Checkout is unavailable." status="error" />;

  const enabledMethods = resource.paymentMethods.filter((method) => method.enabled);
  const unavailable = resource.availability.some((entry) => entry.status === "unavailable") || resource.cart.availability.some((entry) => entry.status === "unavailable");
  const isEmpty = resource.cart.lines.length === 0;
  const summaryLines: CommerceSummaryLine[] = resource.cart.lines.map((line) => ({
    ...line,
    name: line.name || line.productId,
    availability: unavailable && resource.availability.some((entry) => entry.lineId === line.lineId && entry.status === "unavailable") ? "unavailable" : "available",
  }));
  const canSubmit = !isEmpty && !unavailable && enabledMethods.length > 0 && !submitting;

  const setValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const renderField = (field: CheckoutFieldSpec) => {
    const value = values[field.name] || "";
    const common = {
      name: field.name,
      value,
      required: field.required,
      autoComplete: field.autocomplete,
      error: fieldErrors[field.name],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValue(field.name, event.target.value),
    };
    if (field.control === "select") {
      return (
        <div className="commerce-form-field" key={field.name}>
          <Label htmlFor={`checkout-${field.name}`}>{field.label}</Label>
          <Select
            id={`checkout-${field.name}`}
            aria-label={field.label}
            value={value || "MY"}
            items={COUNTRY_OPTIONS.map(({ code, label }) => ({ label: `${label} (${code})`, value: code }))}
            onValueChange={(next) => setValue(field.name, typeof next === "string" ? next : "")}
          />
          {fieldErrors[field.name] && <p className="commerce-form-error">{fieldErrors[field.name]}</p>}
        </div>
      );
    }
    return (
      <div className="commerce-form-field" key={field.name}>
        <Input
          {...common}
          id={`checkout-${field.name}`}
          type={field.control === "email" ? "email" : field.control === "tel" ? "tel" : "text"}
          label={field.label}
          description={!field.required ? "Optional" : undefined}
        />
      </div>
    );
  };

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(undefined);
    setError(undefined);
    const nextErrors = Object.fromEntries(
      fields.flatMap((field) => {
        const message = checkoutFieldError(field.name, values[field.name] || "");
        return message ? [[field.name, message]] : [];
      }),
    );
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Check the highlighted fields before continuing.");
      return;
    }
    if (!canSubmit) {
      setError(isEmpty ? "Your cart is empty. Return to the catalog before checking out." : unavailable ? "Remove unavailable items before continuing." : "Choose an available payment method before continuing.");
      return;
    }
    const name = (values.name || "").trim();
    const email = (values.email || "").trim();
    const phone = (values.phone || "").trim();
    const customer = { name, email, ...(phone ? { phone } : {}) };
    const shippingAddress = Object.fromEntries(
      Object.keys(ADDRESS_FIELDS).flatMap((name) => {
        const value = (values[name] || "").trim();
        return value ? [[name, value]] : [];
      }),
    );
    setSubmitting(true);
    setStatus("Preparing your secure payment…");
    try {
      await commerceClient.checkout.update({ paymentProvider, customer, shippingAddress });
      const result: CheckoutResult = await commerceClient.checkout.start({
        paymentProvider,
        idempotencyKey: idempotencyKey.current,
        customer,
        shippingAddress,
        expectedTotalMinor: resource.totals.totalMinor,
      });
      emitAnalytics({
        name: "begin_checkout",
        source: "client",
        currency: resource.totals.currency,
        items: resource.cart.lines.map((line) => ({ id: line.variantId || line.productId, name: line.name, quantity: line.quantity })),
      });
      window.localStorage.setItem("commerce-order-id", result.orderId);
      window.localStorage.setItem("commerce-order-access-token", result.orderAccessToken);
      window.location.assign(result.checkoutUrl);
    } catch (reason) {
      setStatus(undefined);
      setError(errorMessage(reason, "Unable to start checkout. Return to the cart and try again."));
      setSubmitting(false);
    }
  };

  if (isEmpty) {
    return (
      <div className="commerce-shell-empty empty-state">
        <h2>Your cart is empty</h2>
        <p>Return to the catalog before checking out.</p>
        <a className="button" href="/shop">Browse catalog</a>
      </div>
    );
  }

  return (
    <form className="checkout-layout commerce-layout checkout-form" onSubmit={submit} noValidate>
      <section className="commerce-card commerce-form-section checkout-contact">
          <div className="commerce-form-section__header">
            <h2>Contact and delivery</h2>
            <p>Use an address where your order can be delivered.</p>
          </div>
          <div className="commerce-form-grid">
            {fields.filter((field) => CUSTOMER_FIELDS[field.name]).map(renderField)}
            {fields.filter((field) => ADDRESS_FIELDS[field.name] && !CUSTOMER_FIELDS[field.name]).map(renderField)}
          </div>
        </section>
      <CommerceSummary
        lines={summaryLines}
        subtotalMinor={resource.totals.subtotalMinor}
        totalMinor={resource.totals.totalMinor}
        currency={resource.totals.currency}
        availabilityWarning={unavailable ? "Checkout is disabled until unavailable items are removed." : undefined}
      />
      <section className="commerce-card commerce-form-section checkout-payment">
          <div className="commerce-form-section__header">
            <h2>Payment</h2>
            <p>Payments are processed by the enabled Commerce provider.</p>
          </div>
          <div className="commerce-form-field">
            <Label htmlFor="checkout-payment-provider">Payment method</Label>
            <Select
              id="checkout-payment-provider"
              value={paymentProvider}
              placeholder={enabledMethods.length ? "Choose a payment method" : "No payment methods available"}
              items={enabledMethods.map((method) => ({ label: method.label, value: method.id }))}
              onValueChange={(next) => setPaymentProvider(typeof next === "string" ? next : "")}
              disabled={enabledMethods.length === 0 || submitting}
            />
          </div>
          {enabledMethods.length === 0 && <CommerceStatus message="No payment method is currently available." status="error" />}
          {unavailable && <CommerceStatus message="One or more items are unavailable. Return to the cart to update them." status="error" />}
          {error && <CommerceStatus message={error} status="error" />}
          {status && <CommerceStatus message={status} />}
          <Button type="submit" size="lg" disabled={!canSubmit}>{submitting ? "Opening payment…" : "Continue to payment"}</Button>
          <Badge variant="secondary">Secure checkout</Badge>
        </section>
      </form>
  );
}
