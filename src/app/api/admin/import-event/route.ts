import { NextResponse } from "next/server";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { getFunnel } from "@/lib/server/funnels";
import { flyerInputFrom, readFlyer } from "@/lib/server/flyer-import";

// Reading a flyer can take a little while.
export const maxDuration = 60;

// Reads a flyer (photo, PDF, or pasted text) and returns the dates on it, for
// the admin to review. Nothing is saved.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { slug?: unknown; type?: unknown; data?: unknown; text?: unknown; today?: unknown }
    | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const funnel = await getFunnel(slug);
  if (!funnel || !canPublish(admin, slug)) {
    return NextResponse.json({ error: "You can't edit this funnel." }, { status: 403 });
  }

  const input = flyerInputFrom(body);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: input.status });

  // The admin's own date, so "Sat Oct 12" without a year lands on the right one.
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const result = await readFlyer(input, funnel.events?.[0]?.name.split(": ")[0] ?? funnel.brand.name, today);
  if ("problem" in result) return NextResponse.json({ error: result.problem }, { status: 502 });
  return NextResponse.json(result);
}
