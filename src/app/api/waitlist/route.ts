import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/leads";
import { callRpc } from "@/lib/server/supabase";
import { normalizeSourceTag } from "@/lib/source-tag";
import { instagramHandle } from "@/lib/waitlist";

// Early access to Showlnk (the home page's "Get on the list"): an email and
// an Instagram handle. Saved through join_waitlist; joining
// twice keeps one entry.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
  // A field people never see: filled in, it's a bot. Answer as if it worked.
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || email.length > 254 || !isValidEmail(email)) {
    return NextResponse.json({ field: "email", error: "Enter your email, like name@example.com." }, { status: 400 });
  }
  const instagram = instagramHandle(typeof body.instagram === "string" ? body.instagram.slice(0, 120) : "");
  if (!instagram) {
    const error = instagram === null ? "That doesn't look like an Instagram handle. Try @yourname." : "Add your Instagram, so we can see your events.";
    return NextResponse.json({ field: "instagram", error }, { status: 400 });
  }

  const saved = await callRpc("join_waitlist", {
    p_email: email,
    p_instagram: instagram,
    p_source_tag: normalizeSourceTag(body.sourceTag) ?? null,
  });
  if (!saved.ok) {
    console.error("[waitlist] join_waitlist failed:", saved.status, saved.error.slice(0, 200));
    return NextResponse.json({ error: "We couldn't save that just now. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
