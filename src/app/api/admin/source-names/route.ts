import { NextResponse } from "next/server";
import { adminOrganizer, NO_STORE } from "@/lib/server/organizer-fans";
import { listSourceNames, setSourceName } from "@/lib/server/source-names";
import { normalizeSourceTag, SOURCE_PRESETS } from "@/lib/source-tag";

// The organizer's own names for the places it shares its links.
// GET ?slug=<one of its events>  ·  PUT { slug, tag, name } (an empty name forgets it)

const NOT_YOURS = "Only the organizer's own admins can name its links.";

export async function GET(request: Request) {
  const t = await adminOrganizer(new URL(request.url).searchParams.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const names = await listSourceNames(t.admin, t.organizer.slug);
  if (names === null) return NextResponse.json({ error: NOT_YOURS }, { status: 403, headers: NO_STORE });
  if (!names) return NextResponse.json({ error: "Couldn't load your link names." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ organizer: t.organizer.slug, names }, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const t = await adminOrganizer(typeof body?.slug === "string" ? body.slug : "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const tag = normalizeSourceTag(body?.tag);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!tag || tag !== body.tag) return NextResponse.json({ error: "That isn't a link tag." }, { status: 400, headers: NO_STORE });
  // The builder's own places keep their names.
  if (SOURCE_PRESETS.some((p) => p.tag === tag)) return NextResponse.json({ error: "That place already has a name." }, { status: 400, headers: NO_STORE });
  if (name.length > 60) return NextResponse.json({ error: "Keep the name to 60 characters." }, { status: 400, headers: NO_STORE });
  const done = await setSourceName(t.admin, t.organizer.slug, tag, name);
  if (done === null) return NextResponse.json({ error: NOT_YOURS }, { status: 403, headers: NO_STORE });
  if (!done) return NextResponse.json({ error: "Couldn't save the name. Try again." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ ok: true, tag, name }, { headers: NO_STORE });
}
