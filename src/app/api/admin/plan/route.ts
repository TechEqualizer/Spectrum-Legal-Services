import { NextResponse } from "next/server";
import { adminOrganizer, NO_STORE } from "@/lib/server/organizer-fans";
import { billingOf, planForAdmin } from "@/lib/server/plans";
import { isBillingConfigured } from "@/lib/server/stripe";

// Settings → Plan: the organizer of the event `slug`, and its plan.
// GET ?slug=

export async function GET(request: Request) {
  const t = await adminOrganizer(new URL(request.url).searchParams.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const plan = await planForAdmin(t.admin, t.organizer.slug);
  if (plan === null) return NextResponse.json({ error: "Only the organizer's own admins can see its plan." }, { status: 403, headers: NO_STORE });
  if (!plan) return NextResponse.json({ error: "Couldn't load your plan. Reload to try again." }, { status: 502, headers: NO_STORE });
  // Whether Start Core can open checkout here, and whether there's billing to manage.
  const billing = isBillingConfigured() ? await billingOf(t.organizer.slug) : undefined;
  return NextResponse.json(
    { organizer: { slug: t.organizer.slug, name: t.organizer.name }, plan, billing: isBillingConfigured(), manage: Boolean(billing?.customerId) },
    { headers: NO_STORE }
  );
}
