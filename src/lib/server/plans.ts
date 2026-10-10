// Each organizer's plan (supabase/migrations/*_organizer_plans.sql). Admins
// read their own through organizer_plan, with their sign-in; Stripe's
// webhook writes it, and billing reads its Stripe ids, with the secret key.

import { asAdmin, type Admin } from "@/lib/server/admin-auth";
import { FREE, type Plan, type PlanStatus } from "@/lib/plans";

type Row = {
  status: Exclude<PlanStatus, "free">;
  billing_interval: "month" | "year" | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  comped_until: string | null;
};

const toPlan = (r: Row | undefined): Plan =>
  r
    ? {
        status: r.status,
        ...(r.billing_interval ? { interval: r.billing_interval } : {}),
        ...(r.trial_ends_at ? { trialEndsAt: r.trial_ends_at } : {}),
        ...(r.current_period_end ? { periodEnd: r.current_period_end } : {}),
        ...(r.comped_until ? { compedUntil: r.comped_until } : {}),
      }
    : FREE;

/** The organizer's plan, for its admins; null when they may not see it, undefined if loading failed. */
export async function planForAdmin(admin: Admin, organizer: string): Promise<Plan | null | undefined> {
  const res = await asAdmin("/rest/v1/rpc/organizer_plan", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_organizer: organizer }),
  });
  if (res && (res.status === 401 || res.status === 403)) return null;
  if (!res?.ok) {
    console.error("[plans] organizer_plan failed:", res?.status);
    return undefined;
  }
  const rows: unknown = await res.json().catch(() => undefined);
  return Array.isArray(rows) ? toPlan(rows[0] as Row | undefined) : undefined;
}

const env = (name: string) => process.env[name]?.trim() || undefined;
const service = () => {
  const url = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY");
  return url && secret ? { url, headers: { apikey: secret, Authorization: `Bearer ${secret}` } } : null;
};

/** The organizer's Stripe customer and plan status (server only); undefined if unreachable. */
export async function billingOf(organizer: string): Promise<{ status: PlanStatus; customerId?: string } | undefined> {
  const s = service();
  if (!s) return undefined;
  try {
    const res = await fetch(`${s.url}/rest/v1/organizer_plans?organizer_slug=eq.${encodeURIComponent(organizer)}&select=status,stripe_customer_id`, { headers: s.headers, cache: "no-store" });
    if (!res.ok) return undefined;
    const row = ((await res.json()) as { status: PlanStatus; stripe_customer_id: string | null }[])[0];
    return row ? { status: row.status, ...(row.stripe_customer_id ? { customerId: row.stripe_customer_id } : {}) } : { status: "free" };
  } catch {
    return undefined;
  }
}

/** Writes the organizer's plan row (the Stripe webhook). Whether it saved. */
export async function savePlan(organizer: string, row: Record<string, string | null>): Promise<boolean> {
  const s = service();
  if (!s) return false;
  try {
    const res = await fetch(`${s.url}/rest/v1/organizer_plans?on_conflict=organizer_slug`, {
      method: "POST",
      headers: { ...s.headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ organizer_slug: organizer, ...row, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) console.error("[plans] save failed:", res.status, (await res.text().catch(() => "")).slice(0, 200));
    return res.ok;
  } catch {
    return false;
  }
}
