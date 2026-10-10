import { NextResponse } from "next/server";
import { hasCore } from "@/lib/plans";
import { adminOrganizer, fansOnPlan, followOn, listFans, NO_STORE, removeFan } from "@/lib/server/organizer-fans";
import { planOf } from "@/lib/server/plans";

// The Fans page: the organizer of the event `slug`, whether Follow is on for
// them, whether they have Core, and everyone who has followed them (on Free,
// the first 100, and how many more are waiting). Personal data: never cached.
// GET ?slug=  ·  DELETE ?slug=&email= takes a fan off the list.

const NOT_YOURS = "Only the organizer's own admins can see its fans.";

export async function GET(request: Request) {
  const t = await adminOrganizer(new URL(request.url).searchParams.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const [all, plan] = await Promise.all([listFans(t.admin, t.organizer.slug), planOf(t.organizer.slug)]);
  if (all === null) return NextResponse.json({ error: NOT_YOURS }, { status: 403, headers: NO_STORE });
  if (!all) return NextResponse.json({ error: "Couldn't load your fans. Reload to try again." }, { status: 502, headers: NO_STORE });
  const { fans, waiting } = fansOnPlan(all, plan);
  return NextResponse.json(
    { organizer: { slug: t.organizer.slug, name: t.organizer.name }, followOn: await followOn(t.organizer.slug, plan), core: !plan || hasCore(plan), fans, waiting },
    { headers: NO_STORE }
  );
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const t = await adminOrganizer(params.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const email = (params.get("email") ?? "").trim();
  if (!email) return NextResponse.json({ error: "Which fan?" }, { status: 400, headers: NO_STORE });
  const done = await removeFan(t.admin, t.organizer.slug, email);
  if (done === null) return NextResponse.json({ error: NOT_YOURS }, { status: 403, headers: NO_STORE });
  return NextResponse.json({ ok: true, removed: done }, { headers: NO_STORE });
}
