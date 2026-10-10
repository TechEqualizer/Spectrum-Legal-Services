// Stripe, for Core (docs/plans/03-billing.md, step 2). Its REST API over
// fetch (no SDK): Checkout to start Core, the billing portal to change card
// or cancel, and its webhook, checked by signature, which writes the plan.
// Never a card number here: Stripe hosts both pages.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanStatus } from "@/lib/plans";

const env = (name: string) => process.env[name]?.trim() || undefined;

export const ENV_VARS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;

/** The two prices, found by lookup key (set them on the prices in Stripe). */
export const PRICE_LOOKUP = { month: "core_month", year: "core_year" } as const;

/** The API version these calls and the webhook handler are written for. */
const API_VERSION = "2025-03-31.basil";

const config = () => ({
  key: env("STRIPE_SECRET_KEY"),
  webhookSecret: env("STRIPE_WEBHOOK_SECRET"),
  apiBase: (env("STRIPE_API_BASE") ?? "https://api.stripe.com").replace(/\/+$/, ""),
});

/** The settings this deployment still needs before organizers can start Core. */
export const missingStripeSettings = () => ENV_VARS.filter((name) => !env(name));
export const isBillingConfigured = () => missingStripeSettings().length === 0;

/** Stripe's form encoding: nested keys as a[b][0][c]=v. */
function form(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? form(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe<T>(method: "GET" | "POST", path: string, params: Record<string, unknown> = {}): Promise<T | null> {
  const c = config();
  if (!c.key) return null;
  const body = form(params);
  const url = `${c.apiBase}${path}${method === "GET" && body.size ? `?${body}` : ""}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${c.key}`, "Stripe-Version": API_VERSION, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
      ...(method === "POST" ? { body } : {}),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[stripe] ${method} ${path} failed:`, res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[stripe] ${method} ${path} unreachable:`, e);
    return null;
  }
}

/** A Checkout page for Core, monthly or yearly. Its URL, or null. */
export async function checkoutUrl(input: {
  organizer: string;
  interval: "month" | "year";
  customerId?: string;
  email?: string;
  returnTo: string;
  /** Paying during the trial: the first charge waits until it ends (unix seconds). */
  trialEnd?: number;
}): Promise<string | null> {
  const prices = await stripe<{ data: { id: string }[] }>("GET", "/v1/prices", { lookup_keys: [PRICE_LOOKUP[input.interval]], active: true });
  const price = prices?.data[0]?.id;
  if (!price) {
    console.error(`[stripe] no active price with lookup key ${PRICE_LOOKUP[input.interval]}`);
    return null;
  }
  const session = await stripe<{ url: string }>("POST", "/v1/checkout/sessions", {
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: input.organizer,
    metadata: { organizer: input.organizer },
    subscription_data: { metadata: { organizer: input.organizer }, ...(input.trialEnd ? { trial_end: input.trialEnd } : {}) },
    ...(input.customerId ? { customer: input.customerId } : input.email ? { customer_email: input.email } : {}),
    success_url: `${input.returnTo}?billing=started`,
    cancel_url: `${input.returnTo}?billing=canceled`,
  });
  return session?.url ?? null;
}

/** Stripe's billing portal for the organizer's customer: card, receipts, cancel. */
export async function portalUrl(customerId: string, returnTo: string): Promise<string | null> {
  const session = await stripe<{ url: string }>("POST", "/v1/billing_portal/sessions", { customer: customerId, return_url: returnTo });
  return session?.url ?? null;
}

// ---------------------------------------------------------------- the webhook

/** How far a webhook's timestamp may be from now (Stripe's own default). */
const TOLERANCE_S = 300;

/** The event, if the Stripe-Signature header proves Stripe sent this exact body recently; else null. */
export function verifiedEvent(body: string, header: string | null, now = Date.now()): StripeEvent | null {
  const secret = config().webhookSecret;
  if (!secret || !header) return null;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || !signatures.length || Math.abs(now / 1000 - t) > TOLERANCE_S) return null;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  const ok = signatures.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
  if (!ok) return null;
  try {
    return JSON.parse(body) as StripeEvent;
  } catch {
    return null;
  }
}

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string>;
  trial_end?: number | null;
  /** Before API version 2025-03-31 only; since then it's on the items. */
  current_period_end?: number;
  items?: { data: { current_period_end?: number; price?: { recurring?: { interval?: string } } }[] };
};

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

/** Stripe's subscription status as the plan's. Null: not one to act on (incomplete, paused). */
export function planStatusOf(status: string): Exclude<PlanStatus, "free" | "comped"> | null {
  switch (status) {
    case "trialing":
    case "active":
      return status;
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return null;
  }
}

/** The plan row a subscription means, or null when it says nothing to act on. */
export function planFromSubscription(sub: StripeSubscription, deleted = false) {
  const status = deleted ? "canceled" : planStatusOf(sub.status);
  const organizer = sub.metadata?.organizer;
  if (!status || !organizer) return null;
  const item = sub.items?.data[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const interval = item?.price?.recurring?.interval;
  const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);
  return {
    organizer,
    row: {
      status,
      billing_interval: interval === "month" || interval === "year" ? interval : null,
      trial_ends_at: iso(sub.trial_end),
      current_period_end: iso(periodEnd),
      comped_until: null,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
    },
  };
}

/** The subscription as Stripe has it now (events can arrive out of order, so never trust an old copy). */
export const currentSubscription = (id: string) => stripe<StripeSubscription>("GET", `/v1/subscriptions/${encodeURIComponent(id)}`);
