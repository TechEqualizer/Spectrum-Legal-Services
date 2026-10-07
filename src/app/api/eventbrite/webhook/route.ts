import { after, NextResponse } from "next/server";
import { handleDelivery } from "@/lib/server/eventbrite";

// Eventbrite tells us about an organizer's orders here (the webhook made in
// /api/admin/eventbrite/callback). Public, and unsigned, so the body is never
// trusted: handleDelivery only acts on an order URL on Eventbrite's API host,
// for a webhook we made, and fetches the order itself with that organizer's
// token. It always answers 200 at once (Eventbrite retries otherwise, and
// pings with a test delivery when the webhook is made); the work runs after.

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  let body: unknown = null;
  if (text.length <= 10_000) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  after(async () => {
    try {
      const outcome = await handleDelivery(body);
      if (outcome !== "recorded" && outcome !== "ignored") console.warn("[eventbrite webhook]", outcome);
    } catch (e) {
      console.error("[eventbrite webhook] failed:", e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ ok: true });
}
