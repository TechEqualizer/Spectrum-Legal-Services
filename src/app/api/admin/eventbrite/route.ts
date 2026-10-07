import { NextResponse } from "next/server";
import {
  decryptToken,
  deleteWebhook,
  getConnection,
  isEventbriteConfigured,
  missingSettings,
  organizerForAdmin,
  removeConnection,
  ticketsSynced,
} from "@/lib/server/eventbrite";

// An organizer's Eventbrite connection, for Settings: whether it's on, and
// disconnecting. Never returns the token (or anything but what Settings shows).

const NO_STORE = { "Cache-Control": "private, no-store" };

const refused = (error: "signin" | "access", status: number) =>
  NextResponse.json({ error: error === "signin" ? "Sign in again." : "No such organizer." }, { status });

export async function GET(request: Request) {
  const t = await organizerForAdmin(request);
  if (t.error) return refused(t.error, t.status);
  const full = t.admin.slugs.includes("*");
  if (!isEventbriteConfigured()) {
    // Full admins see which settings to add; organizers only that it's not on yet.
    return NextResponse.json({ configured: false, connected: false, ...(full ? { missing: missingSettings() } : {}) }, { headers: NO_STORE });
  }
  const connection = await getConnection(t.organizer.slug);
  if (!connection) return NextResponse.json({ configured: true, connected: false }, { headers: NO_STORE });
  return NextResponse.json(
    {
      configured: true,
      connected: true,
      orgName: connection.eb_org_name,
      connectedAt: connection.connected_at,
      lastOrderAt: connection.last_order_at,
      ticketsSynced: await ticketsSynced(t.organizer.slug),
    },
    { headers: NO_STORE }
  );
}

/** Disconnects: removes our webhook at Eventbrite (best effort) and the connection. Sales already recorded stay. */
export async function DELETE(request: Request) {
  const t = await organizerForAdmin(request);
  if (t.error) return refused(t.error, t.status);
  const connection = await getConnection(t.organizer.slug);
  if (!connection) return NextResponse.json({ connected: false });
  const token = decryptToken(connection.token_ciphertext);
  if (token && connection.webhook_id) {
    await deleteWebhook(token, connection.webhook_id).catch((e) => console.error("[eventbrite] couldn't remove webhook:", e instanceof Error ? e.message : e));
  }
  if (!(await removeConnection(t.organizer.slug))) {
    return NextResponse.json({ error: "Couldn't disconnect Eventbrite. Try again." }, { status: 502 });
  }
  return NextResponse.json({ connected: false });
}
