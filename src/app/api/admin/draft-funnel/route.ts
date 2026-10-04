import { NextResponse } from "next/server";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { getFunnel } from "@/lib/server/funnels";
import { flyerInputFrom } from "@/lib/server/flyer-import";
import { draftFunnel } from "@/lib/server/funnel-draft";

// Planning a whole funnel takes longer than reading dates.
export const maxDuration = 120;

// Drafts the funnel from a flyer (opening words, reels in selling order,
// and a video prompt for each), for the admin to review. Nothing is saved.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { slug?: unknown; type?: unknown; data?: unknown; text?: unknown; today?: unknown; dates?: unknown; photos?: unknown }
    | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const funnel = await getFunnel(slug);
  if (!funnel || !canPublish(admin, slug)) {
    return NextResponse.json({ error: "You can't edit this funnel." }, { status: 403 });
  }
  const input = flyerInputFrom(body);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: input.status });

  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const dates = (Array.isArray(body?.dates) ? body.dates : [])
    .slice(0, 20)
    .flatMap((d) => {
      const x = (d ?? {}) as { date?: unknown; name?: unknown };
      return typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? [{ date: x.date, name: typeof x.name === "string" ? x.name.slice(0, 80) : "" }] : [];
    });
  const result = await draftFunnel(input, { brand: funnel.brand.name, today, dates, photos: body?.photos === true });
  if ("problem" in result) return NextResponse.json({ error: result.problem }, { status: 502 });
  return NextResponse.json(result);
}
