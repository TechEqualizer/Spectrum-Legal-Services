import { NextResponse } from "next/server";
import { asAdmin, canPublish, getAdmin } from "@/lib/server/admin-auth";
import { organizerOf } from "@/lib/server/funnels";

// An event's real results for its admins: the database's funnel_stats,
// called with the admin's own sign-in, so it checks they may see them.
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const slug = params.get("slug") ?? "";
  const days = Number(params.get("days"));
  const tz = params.get("tz") ?? "UTC";
  if (![7, 30, 90].includes(days) || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(tz)) {
    return NextResponse.json({ error: "Choose 7, 30 or 90 days." }, { status: 400 });
  }
  const organizer = await organizerOf(slug);
  if (!organizer || !canPublish(admin, slug, organizer)) {
    return NextResponse.json({ error: "These results aren't yours to see." }, { status: 404 });
  }

  const res = await asAdmin("/rest/v1/rpc/funnel_stats", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug, p_days: days, p_tz: tz }),
  });
  const body = res?.ok ? await res.json().catch(() => null) : null;
  if (!body) {
    console.error("[stats] funnel_stats failed:", res?.status);
    return NextResponse.json({ error: "Couldn't load results. Reload to try again." }, { status: 502 });
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
