// Each organizer's plan (supabase/migrations/*_organizer_plans.sql). Admins
// read their own through organizer_plan, with their sign-in. (The gates read
// it with the secret key from step 3.)

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
