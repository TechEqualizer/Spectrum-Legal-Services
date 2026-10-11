import { NextResponse } from "next/server";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { getFunnel, organizerOf } from "@/lib/server/funnels";
import { flyerInputFrom } from "@/lib/server/flyer-import";
import { draftOpening } from "@/lib/server/funnel-draft";
import { OPENING_MOOD_IDS, parseOpening } from "@/lib/opening";

// Reading a flyer and cutting its opening takes a little while.
export const maxDuration = 60;

// Cuts an event's opening scene from its flyer (a photo, sent by the Design
// tab), in the mood the organizer chose if they chose one, and unlike the cut
// they have when they ask for another. Nothing is saved: the editor shows it,
// and Publish puts it live.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { slug?: unknown; type?: unknown; data?: unknown; mood?: unknown; unlike?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const funnel = await getFunnel(slug);
  if (!funnel || !canPublish(admin, slug, await organizerOf(slug))) {
    return NextResponse.json({ error: "You can't edit this funnel." }, { status: 403 });
  }
  // A photo of the flyer only: the opening is cut from its picture.
  const input = flyerInputFrom({ type: body?.type, data: body?.data });
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: input.status });
  if (input.kind !== "image") return NextResponse.json({ error: "The opening needs a photo of the flyer." }, { status: 400 });

  const mood = OPENING_MOOD_IDS.find((m) => m === body?.mood);
  const unlike = parseOpening(body?.unlike) ?? undefined;
  const result = await draftOpening(input, { mood, unlike });
  if ("problem" in result) return NextResponse.json({ error: result.problem }, { status: 502 });
  return NextResponse.json(result);
}
