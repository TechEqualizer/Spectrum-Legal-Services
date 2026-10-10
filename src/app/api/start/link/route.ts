import { NextResponse } from "next/server";
import { EVENT_SLUG } from "@/lib/new-event";
import { slugIsFree } from "@/lib/server/funnels";
import { inviteStatus } from "@/lib/server/invites";

const NO_STORE = { "Cache-Control": "no-store" };

// Whether a link (showlnk.com/f/<slug>) is free, checked as the organizer
// types it in the wizard's last step. Only with a usable invite.
// GET ?invite=&slug= -> { free }
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug") ?? "";
  if (!EVENT_SLUG.test(slug)) return NextResponse.json({ free: false, error: "Use lowercase letters, numbers and dashes." }, { headers: NO_STORE });
  const s = await inviteStatus(params.get("invite") ?? "");
  if (s?.status !== "valid") return NextResponse.json({ error: "This invite can't be used." }, { status: 403, headers: NO_STORE });
  return NextResponse.json({ free: await slugIsFree(slug) }, { headers: NO_STORE });
}
