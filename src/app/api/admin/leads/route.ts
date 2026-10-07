import { NextResponse } from "next/server";
import { asAdmin, canPublish, getAdmin } from "@/lib/server/admin-auth";
import { organizerOf } from "@/lib/server/funnels";

// An event's leads for its admins (the Leads page): the database's
// funnel_leads, called with the admin's own sign-in, so it checks they may
// see them. Leads are personal data: never cached.
export async function GET(request: Request) {
  const noStore = { "Cache-Control": "private, no-store" };
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401, headers: noStore });

  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const organizer = await organizerOf(slug);
  if (!organizer || !canPublish(admin, slug, organizer)) {
    return NextResponse.json({ error: "These leads aren't yours to see." }, { status: 404, headers: noStore });
  }

  const res = await asAdmin("/rest/v1/rpc/funnel_leads", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug }),
  });
  const body: unknown = res?.ok ? await res.json().catch(() => undefined) : undefined;
  // null: the event has no funnel id yet, so no one can have asked.
  if (body !== null && !Array.isArray(body)) {
    console.error("[leads] funnel_leads failed:", res?.status);
    return NextResponse.json({ error: "Couldn't load leads. Reload to try again." }, { status: 502, headers: noStore });
  }
  return NextResponse.json(body ?? [], { headers: noStore });
}
