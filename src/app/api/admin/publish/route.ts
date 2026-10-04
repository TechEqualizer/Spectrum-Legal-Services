import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getFunnel } from "@/lib/server/funnels";
import { parsePublication } from "@/lib/publication";
import { asAdmin, canPublish, getAdmin } from "@/lib/server/admin-auth";
import { publicationTag } from "@/lib/server/publications";

async function authorize(slug: string) {
  const admin = await getAdmin();
  if (!admin) return { error: NextResponse.json({ error: "Sign in again." }, { status: 401 }) };
  const funnel = await getFunnel(slug);
  if (!funnel || !canPublish(admin, slug)) {
    return { error: NextResponse.json({ error: "You can't publish this funnel." }, { status: 403 }) };
  }
  return { admin, funnel };
}

// What's published now, read fresh (the editor starts from it).
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const { admin, funnel, error } = await authorize(slug);
  if (error) return error;
  const res = await asAdmin(
    `/rest/v1/funnel_publications?slug=eq.${encodeURIComponent(slug)}&select=data,published_at,published_by`,
    admin.accessToken
  );
  if (!res?.ok) return NextResponse.json({ error: "Couldn't load the live funnel." }, { status: 502 });
  const rows = (await res.json()) as { data: unknown; published_at: string; published_by: string }[];
  if (!rows[0]) return NextResponse.json({ publication: null });
  const publication = parsePublication(rows[0].data, funnel);
  return NextResponse.json({
    publication: typeof publication === "string" ? null : publication,
    publishedAt: rows[0].published_at,
    publishedBy: rows[0].published_by,
  });
}

// Publishes the admin's edits to the live funnel link.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { slug?: unknown; publication?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const { admin, funnel, error } = await authorize(slug);
  if (error) return error;
  const publication = parsePublication(body?.publication, funnel);
  if (typeof publication === "string") return NextResponse.json({ error: publication }, { status: 400 });

  const publishedAt = new Date().toISOString();
  const res = await asAdmin("/rest/v1/funnel_publications?on_conflict=slug", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ slug, data: publication, published_at: publishedAt, published_by: admin.email.toLowerCase() }),
  });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't publish. Try again." }, { status: 502 });
  // The next visit gets the new version straight away.
  revalidateTag(publicationTag(slug), { expire: 0 });
  return NextResponse.json({ publishedAt });
}

// Takes the published edits down: the link goes back to its built-in content.
export async function DELETE(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const { admin, error } = await authorize(slug);
  if (error) return error;
  const res = await asAdmin(`/rest/v1/funnel_publications?slug=eq.${encodeURIComponent(slug)}`, admin.accessToken, { method: "DELETE" });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't restore the original. Try again." }, { status: 502 });
  revalidateTag(publicationTag(slug), { expire: 0 });
  return NextResponse.json({ ok: true });
}
