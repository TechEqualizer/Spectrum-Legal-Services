import { NextResponse } from "next/server";
import { savePlan } from "@/lib/server/plans";
import { currentSubscription, planFromSubscription, verifiedEvent } from "@/lib/server/stripe";

// Stripe's webhook: when a subscription starts, changes, fails to renew or
// ends, the organizer's plan row follows it. Only events Stripe signed are
// read, and the subscription is re-read from Stripe, so an old event that
// arrives late can't undo a newer one. Listen for: checkout.session.completed,
// customer.subscription.created, .updated and .deleted.

export async function POST(request: Request) {
  const body = await request.text();
  const event = verifiedEvent(body, request.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  const object = event.data.object;
  const subscriptionId =
    event.type === "checkout.session.completed"
      ? (object.subscription as string | null)
      : event.type.startsWith("customer.subscription.")
        ? (object.id as string)
        : null;
  if (!subscriptionId) return NextResponse.json({ ok: true, ignored: event.type });

  const sub = await currentSubscription(subscriptionId);
  // Stripe unreachable: answer an error so it sends the event again later.
  if (!sub) return NextResponse.json({ error: "Couldn't read the subscription." }, { status: 503 });
  const plan = planFromSubscription(sub, event.type === "customer.subscription.deleted");
  if (!plan) return NextResponse.json({ ok: true, ignored: sub.status });
  if (!(await savePlan(plan.organizer, plan.row))) return NextResponse.json({ error: "Couldn't save the plan." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
