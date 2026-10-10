import { NextResponse } from "next/server";
import { clientIp, isValidFanEmail, startFollow } from "@/lib/server/fans";

// Follow an organizer: emails a single-use confirm link. Nothing is followed
// until the link is used.
// POST { email, organizer, sourceTag?, funnelId? }

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const organizer = typeof body.organizer === "string" ? body.organizer : "";
  if (!isValidFanEmail(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const result = await startFollow(
    {
      email,
      organizer,
      sourceTag: typeof body.sourceTag === "string" ? body.sourceTag : undefined,
      funnelId: typeof body.funnelId === "string" ? body.funnelId : undefined,
      ip: clientIp(request),
    },
    new URL(request.url).origin
  );
  switch (result) {
    case "sent":
      return NextResponse.json({ ok: true });
    case "rate_limited":
      return NextResponse.json({ error: "Too many links sent. Check your email, or try again in an hour." }, { status: 429 });
    case "unknown_organizer":
      return NextResponse.json({ error: "There's no one to follow here." }, { status: 404 });
    case "not_configured":
      return NextResponse.json({ error: "Following isn't turned on yet." }, { status: 503 });
    default:
      return NextResponse.json({ error: "Couldn't send the email. Try again." }, { status: 502 });
  }
}
