import { NextResponse } from "next/server";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { fanRefFolder, isFanRef } from "@/lib/fan-reels";
import { signFanRefs } from "@/lib/server/fans";
import { getFunnel, organizerOf } from "@/lib/server/funnels";

// Addresses for an event's private files, so its admins can watch their
// fans-only reels in the editor and preview. POST { slug, refs: ["fans:<slug>/..."] }
// -> { urls: { [ref]: address } }, each working for an hour.

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { slug?: unknown; refs?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!(await getFunnel(slug)) || !canPublish(admin, slug, await organizerOf(slug))) {
    return NextResponse.json({ error: "You can't edit this event." }, { status: 403 });
  }
  const refs = (Array.isArray(body?.refs) ? body.refs : []).filter((r): r is string => isFanRef(r) && fanRefFolder(r) === slug).slice(0, 200);
  const urls = await signFanRefs(refs);
  if (!urls) return NextResponse.json({ error: "Couldn't load private files. Try again." }, { status: 502 });
  return NextResponse.json({ urls }, { headers: { "Cache-Control": "private, no-store" } });
}
