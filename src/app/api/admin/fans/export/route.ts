import { NextResponse } from "next/server";
import { sourceLabel } from "@/lib/source-tag";
import { listEventFunnels } from "@/lib/server/funnels";
import { adminOrganizer, listFans, NO_STORE } from "@/lib/server/organizer-fans";

// The organizer's list, theirs to keep: a CSV of everyone following them now.
// GET ?slug=<one of their events>

/** One CSV cell, quoted; a leading = + - @ is defused so spreadsheets don't run it as a formula. */
const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const t = await adminOrganizer(new URL(request.url).searchParams.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const fans = await listFans(t.admin, t.organizer.slug);
  if (fans === null) return NextResponse.json({ error: "Only the organizer's own admins can export its fans." }, { status: 403, headers: NO_STORE });
  if (!fans) return NextResponse.json({ error: "Couldn't load your fans. Try again." }, { status: 502, headers: NO_STORE });

  const events = new Map((await listEventFunnels()).map(({ funnel }) => [funnel.id, funnel.cover.hero?.title ?? funnel.brand.seriesLabel]));
  const rows = [
    ["Email", "Followed", "Shared on", "Followed from"],
    ...fans
      .filter((f) => !f.unfollowed_at)
      .map((f) => [f.email, f.confirmed_at.slice(0, 10), f.source_tag ? sourceLabel(f.source_tag) : "", (f.funnel_id && events.get(f.funnel_id)) || ""]),
  ];
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.organizer.slug}-fans.csv"`,
    },
  });
}
