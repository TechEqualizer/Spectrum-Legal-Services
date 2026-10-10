import { NextResponse } from "next/server";
import { adminOrganizer, NO_STORE } from "@/lib/server/organizer-fans";
import { billingOf, planForAdmin } from "@/lib/server/plans";
import { isBillingConfigured, portalUrl } from "@/lib/server/stripe";

// Manage billing: Stripe's billing portal (card, receipts, cancel) for the
// organizer of the event `slug`. POST { slug } -> { url }

export async function POST(request: Request) {
  if (!isBillingConfigured()) return NextResponse.json({ error: "Billing isn't turned on yet." }, { status: 503, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  const t = await adminOrganizer(typeof body?.slug === "string" ? body.slug : "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const plan = await planForAdmin(t.admin, t.organizer.slug);
  if (plan === null) return NextResponse.json({ error: "Only the organizer's own admins can manage its billing." }, { status: 403, headers: NO_STORE });
  const billing = await billingOf(t.organizer.slug);
  if (!billing?.customerId) return NextResponse.json({ error: "There's no billing to manage yet." }, { status: 404, headers: NO_STORE });
  const url = await portalUrl(billing.customerId, `${new URL(request.url).origin}/admin/settings`);
  if (!url) return NextResponse.json({ error: "Couldn't open billing. Try again in a minute." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ url }, { headers: NO_STORE });
}
