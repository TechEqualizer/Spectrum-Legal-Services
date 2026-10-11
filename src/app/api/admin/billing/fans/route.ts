import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { adminOrganizer, NO_STORE } from "@/lib/server/organizer-fans";
import { planForAdmin, planTag, savePlan, chargingSubscriptionOf } from "@/lib/server/plans";
import { addFans, isBillingConfigured, removeFans } from "@/lib/server/stripe";

// The fans add-on (docs/plans/03-billing.md, "Pay to go live", step 3), for
// an organizer on Core: added to their subscription at Core's cadence and
// charged now for the rest of the period, or taken off now with the unused
// time credited to their next bill. Stripe's webhook confirms it; the plan row
// is written here too, so the screens follow at once.
// POST { slug, on: boolean } -> { fans }

export async function POST(request: Request) {
  if (!isBillingConfigured()) return NextResponse.json({ error: "Billing isn't turned on yet." }, { status: 503, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  if (typeof body?.on !== "boolean") return NextResponse.json({ error: "Say whether to add or remove it." }, { status: 400, headers: NO_STORE });
  const on: boolean = body.on;
  const t = await adminOrganizer(typeof body?.slug === "string" ? body.slug : "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const plan = await planForAdmin(t.admin, t.organizer.slug);
  if (plan === null) return NextResponse.json({ error: "Only the organizer's own admins can change the plan." }, { status: 403, headers: NO_STORE });
  if (!plan) return NextResponse.json({ error: "Couldn't load your plan. Try again." }, { status: 502, headers: NO_STORE });
  if (plan.status === "comped") return NextResponse.json({ error: "The fans features are already included." }, { status: 409, headers: NO_STORE });
  const subscription = await chargingSubscriptionOf(t.organizer.slug);
  if (subscription === undefined) return NextResponse.json({ error: "Couldn't load your plan. Try again." }, { status: 502, headers: NO_STORE });
  if (!subscription || !plan.interval || (plan.status !== "active" && plan.status !== "trialing")) {
    return NextResponse.json({ error: "Go live with Core first." }, { status: 409, headers: NO_STORE });
  }
  if (Boolean(plan.fans) === on) return NextResponse.json({ fans: on }, { headers: NO_STORE });

  const done = on ? await addFans(subscription, plan.interval) : await removeFans(subscription);
  if (!done) return NextResponse.json({ error: on ? "Couldn't add it: the card may have been declined. Try again, or update your card in Manage billing." : "Couldn't remove it. Try again." }, { status: 502, headers: NO_STORE });
  await savePlan(t.organizer.slug, { fans: on });
  revalidateTag(planTag(t.organizer.slug), { expire: 0 });
  return NextResponse.json({ fans: on }, { headers: NO_STORE });
}
