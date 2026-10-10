import { NextResponse } from "next/server";
import { normalizeSourceTag, sourceLabel } from "@/lib/source-tag";
import { listEventFunnels } from "@/lib/server/funnels";
import { adminOrganizer, fansOnPlan, listFans, NO_STORE } from "@/lib/server/organizer-fans";
import { planOf } from "@/lib/server/plans";
import { listSourceNames } from "@/lib/server/source-names";

// The organizer's list, theirs to keep: a CSV of everyone following them now
// (on Free, the first 100, as on the Fans page).
// GET ?slug=<one of their events>

/** One CSV cell, quoted; a leading = + - @ is defused so spreadsheets don't run it as a formula. */
const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const t = await adminOrganizer(new URL(request.url).searchParams.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const [all, plan] = await Promise.all([listFans(t.admin, t.organizer.slug), planOf(t.organizer.slug)]);
  if (all === null) return NextResponse.json({ error: "Only the organizer's own admins can export its fans." }, { status: 403, headers: NO_STORE });
  if (!all) return NextResponse.json({ error: "Couldn't load your fans. Try again." }, { status: 502, headers: NO_STORE });
  const { fans } = fansOnPlan(all, plan);

  const events = new Map((await listEventFunnels()).map(({ funnel }) => [funnel.id, funnel.cover.hero?.title ?? funnel.brand.seriesLabel]));
  // The organizer's own names for its places, as on the Fans page.
  const names = (await listSourceNames(t.admin, t.organizer.slug)) ?? {};
  const shared = (tag: string) => names[normalizeSourceTag(tag) ?? tag] ?? sourceLabel(tag);
  const rows = [
    ["Email", "Followed", "Shared on", "Followed from"],
    ...fans
      .filter((f) => !f.unfollowed_at)
      .map((f) => [f.email, f.confirmed_at.slice(0, 10), f.source_tag ? shared(f.source_tag) : "", (f.funnel_id && events.get(f.funnel_id)) || ""]),
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
