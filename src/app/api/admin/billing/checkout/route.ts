import { NextResponse } from "next/server";
import { hasCore } from "@/lib/plans";
import { adminOrganizer, NO_STORE } from "@/lib/server/organizer-fans";
import { billingOf, planForAdmin } from "@/lib/server/plans";
import { checkoutUrl, isBillingConfigured } from "@/lib/server/stripe";

// Start Core: a Stripe Checkout page for the organizer of the event `slug`.
// POST { slug, interval: "month" | "year" } -> { url }

export async function POST(request: Request) {
  if (!isBillingConfigured()) return NextResponse.json({ error: "Billing isn't turned on yet." }, { status: 503, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  const interval = body?.interval === "year" ? "year" : body?.interval === "month" ? "month" : null;
  if (!interval) return NextResponse.json({ error: "Choose monthly or yearly." }, { status: 400, headers: NO_STORE });
  const t = await adminOrganizer(typeof body?.slug === "string" ? body.slug : "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  // Only the organizer's own admins (the database checks), and not twice.
  const plan = await planForAdmin(t.admin, t.organizer.slug);
  if (plan === null) return NextResponse.json({ error: "Only the organizer's own admins can start Core." }, { status: 403, headers: NO_STORE });
  if (!plan) return NextResponse.json({ error: "Couldn't load your plan. Try again." }, { status: 502, headers: NO_STORE });
  // A trial already paid for (a card on file) counts too.
  if (plan.status === "active" || plan.status === "past_due" || (plan.status === "comped" && hasCore(plan)) || (plan.status === "trialing" && plan.interval)) {
    return NextResponse.json({ error: "You already have Core." }, { status: 409, headers: NO_STORE });
  }
  // Keeping Core during the trial costs nothing until it ends, so there's no
  // reason to wait. (Stripe needs a trial end at least two days out.)
  const trialEnd = plan.status === "trialing" && plan.trialEndsAt && Date.parse(plan.trialEndsAt) - Date.now() > 2 * 864e5 + 3_600_000 ? Math.floor(Date.parse(plan.trialEndsAt) / 1000) : undefined;
  const billing = await billingOf(t.organizer.slug);
  const returnTo = `${new URL(request.url).origin}/admin/settings`;
  const url = await checkoutUrl({ organizer: t.organizer.slug, interval, customerId: billing?.customerId, email: t.admin.email, returnTo, ...(trialEnd ? { trialEnd } : {}) });
  if (!url) return NextResponse.json({ error: "Couldn't open checkout. Try again in a minute." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ url }, { headers: NO_STORE });
}
