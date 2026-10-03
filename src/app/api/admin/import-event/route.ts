import { NextResponse } from "next/server";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { getFunnelBySlug } from "@/data/funnels";
import { IMAGE_TYPES, PDF_TYPE, readFlyer, type FlyerInput } from "@/lib/server/flyer-import";

// Reading a flyer can take a little while.
export const maxDuration = 60;

/** Under Vercel's 4.5 MB request limit, as base64. The browser shrinks photos first. */
const MAX_BASE64 = 4_000_000;

// Reads a flyer (photo, PDF, or pasted text) and returns the dates on it, for
// the admin to review. Nothing is saved.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { slug?: unknown; type?: unknown; data?: unknown; text?: unknown; today?: unknown }
    | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const funnel = getFunnelBySlug(slug);
  if (!funnel || !canPublish(admin, slug)) {
    return NextResponse.json({ error: "You can't edit this funnel." }, { status: 403 });
  }

  let input: FlyerInput;
  const type = typeof body?.type === "string" ? body.type : "";
  if (typeof body?.text === "string" && body.text.trim()) {
    input = { kind: "text", text: body.text.trim().slice(0, 20_000) };
  } else if (typeof body?.data === "string" && (IMAGE_TYPES.has(type) || type === PDF_TYPE)) {
    if (body.data.length > MAX_BASE64) {
      return NextResponse.json({ error: "That file is too big. Use a photo or a PDF under 3 MB." }, { status: 413 });
    }
    input = type === PDF_TYPE ? { kind: "pdf", data: body.data } : { kind: "image", mediaType: type, data: body.data };
  } else {
    return NextResponse.json({ error: "Add a flyer (photo or PDF) or paste the event details." }, { status: 400 });
  }

  // The admin's own date, so "Sat Oct 12" without a year lands on the right one.
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const result = await readFlyer(input, funnel.events?.[0]?.name.split(": ")[0] ?? funnel.brand.name, today);
  if ("problem" in result) return NextResponse.json({ error: result.problem }, { status: 502 });
  return NextResponse.json(result);
}
