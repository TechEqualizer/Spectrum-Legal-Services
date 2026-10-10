import { NextResponse } from "next/server";
import { flyerInputFrom, readFlyer } from "@/lib/server/flyer-import";
import { inviteStatus, useInviteRead } from "@/lib/server/invites";

// Reading a flyer can take a little while.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

/** Why an invite can't read a flyer, in the organizer's words. */
const STOPPED: Record<string, string> = {
  expired: "This invite has expired. Ask Showlnk for a new one.",
  claimed: "This invite has already been used to make a link. Sign in instead.",
  revoked: "This invite was withdrawn. Ask Showlnk for a new one.",
  unknown: "This invite link isn't right. Check you have the whole link.",
};

// The sign-up wizard's first step: reads the organizer's flyer (photo or PDF)
// with an invite instead of a sign-in. Each read counts against the invite
// (5 at most), since reading costs money. Nothing is saved.
// POST { invite, type, data, today } -> { dates, note, look }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { invite?: unknown; type?: unknown; data?: unknown; today?: unknown } | null;
  const code = typeof body?.invite === "string" ? body.invite : "";
  const input = flyerInputFrom({ type: body?.type, data: body?.data });
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: input.status, headers: NO_STORE });

  const allowed = await useInviteRead(code);
  if (allowed === undefined) return NextResponse.json({ error: "Couldn't check your invite. Try again in a minute." }, { status: 502, headers: NO_STORE });
  if (!allowed) {
    const s = await inviteStatus(code);
    const error =
      s?.status === "valid"
        ? "This invite has read 5 flyers, its limit. Ask Showlnk if you need more."
        : (STOPPED[s?.status ?? "unknown"] ?? STOPPED.unknown);
    return NextResponse.json({ error }, { status: 403, headers: NO_STORE });
  }

  // The organizer's own date, so "Sat Oct 12" without a year lands on the right one.
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  // No event yet: the page is a new one, named from the flyer.
  const result = await readFlyer(input, "a new night, named from this flyer", today);
  if ("problem" in result) return NextResponse.json({ error: result.problem }, { status: 502, headers: NO_STORE });
  return NextResponse.json(result, { headers: NO_STORE });
}
