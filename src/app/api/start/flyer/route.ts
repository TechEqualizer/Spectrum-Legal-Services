import { NextResponse } from "next/server";
import { flyerInputFrom, readFlyer } from "@/lib/server/flyer-import";
import { draftFunnel } from "@/lib/server/funnel-draft";
import { inviteStatus, countInviteRead } from "@/lib/server/invites";

// Reading a flyer, then drafting its reels: each can take a minute at busy times.
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

/** Why an invite can't read a flyer, in the organizer's words. */
const STOPPED: Record<string, string> = {
  expired: "This invite has expired. Ask Showlnk for a new one.",
  claimed: "This invite has already been used to make a link. Sign in instead.",
  revoked: "This invite was withdrawn. Ask Showlnk for a new one.",
  unknown: "This invite link isn't right. Check you have the whole link.",
};

// The sign-up wizard's flyer (photo or PDF), with an invite instead of a
// sign-in. Each flyer counts once against the invite (5 at most), since
// reading costs money, and gets two answers, one per line as each is ready:
// what the flyer says (step 1 shows it at once), then the reels drafted
// from it (step 2), while the organizer carries on. Nothing is saved.
// POST { invite, type, data, today } -> NDJSON lines:
//   { read: { dates, note, look } } or { error }
//   then, when it found a date, { draft } or { draftError }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { invite?: unknown; type?: unknown; data?: unknown; today?: unknown } | null;
  const code = typeof body?.invite === "string" ? body.invite : "";
  const input = flyerInputFrom({ type: body?.type, data: body?.data });
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: input.status, headers: NO_STORE });

  const allowed = await countInviteRead(code);
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
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: unknown) => controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      // No event yet: the page is a new one, named from the flyer.
      const read = await readFlyer(input, "a new night, named from this flyer", today);
      if ("problem" in read) {
        send({ error: read.problem });
        return controller.close();
      }
      send({ read });
      if (read.dates.length) {
        const first = read.dates[0];
        const draft = await draftFunnel(input, {
          brand: first.name || "the organizer",
          today,
          dates: read.dates.map((d) => ({ date: d.date, name: d.name, ...(d.price ? { price: d.price } : {}) })),
          photos: false,
        });
        send("problem" in draft ? { draftError: draft.problem } : { draft });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { ...NO_STORE, "Content-Type": "application/x-ndjson; charset=utf-8" } });
}
