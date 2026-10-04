import { NextResponse } from "next/server";
import { asAdmin, canPublish, getAdmin, supabaseUrl } from "@/lib/server/admin-auth";
import { getFunnel, organizerOf } from "@/lib/server/funnels";

const TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp", "image/gif", "text/vtt"]);
/** The storage bucket's limit (supabase/migrations/*_admin_publishing.sql). */
const MAX_UPLOAD = 50 * 1024 * 1024;

// A one-time link for the browser to upload a file straight to storage, in
// the funnel's folder. Files never pass through this server.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { slug?: unknown; name?: unknown; type?: unknown; size?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!(await getFunnel(slug)) || !canPublish(admin, slug, await organizerOf(slug))) {
    return NextResponse.json({ error: "You can't publish this funnel." }, { status: 403 });
  }
  const type = typeof body?.type === "string" ? body.type : "";
  if (!TYPES.has(type)) return NextResponse.json({ error: "That file type can't be published." }, { status: 400 });
  if (typeof body?.size !== "number" || body.size > MAX_UPLOAD) {
    return NextResponse.json({ error: "Files must be under 50 MB to publish. Trim or compress the video first." }, { status: 400 });
  }
  const name = (typeof body?.name === "string" ? body.name : "file").toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60);
  const path = `${slug}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}-${name}`;

  const res = await asAdmin(`/storage/v1/object/upload/sign/reel-media/${path}`, admin.accessToken, { method: "POST" });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't prepare the upload. Try again." }, { status: 502 });
  const { url } = (await res.json()) as { url: string };
  return NextResponse.json({
    uploadUrl: `${supabaseUrl()}/storage/v1${url}`,
    publicUrl: `${supabaseUrl()}/storage/v1/object/public/reel-media/${path}`,
  });
}
