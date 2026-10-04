import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { asAdmin, getAdmin, managesOrganizer, supabaseUrl } from "@/lib/server/admin-auth";
import { getOrganizer, ORGANIZERS_TAG } from "@/lib/server/funnels";

// An organizer's profile photo (Settings → Organizers): the circle beside
// their name on every reel. Stored in avatars/organizers/<organizer>/,
// which only that organizer's admins can write to, and linked from the
// organizer (set_organizer_avatar). The browser sends a small square already.

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

/** The organizer named in ?organizer=, if this admin runs it. */
async function target(request: Request) {
  const admin = await getAdmin();
  if (!admin) return { error: NextResponse.json({ error: "Sign in again." }, { status: 401 }) };
  const slug = new URL(request.url).searchParams.get("organizer") ?? "";
  const organizer = await getOrganizer(slug);
  if (!organizer) return { error: NextResponse.json({ error: "No such organizer." }, { status: 404 }) };
  if (!managesOrganizer(admin, organizer.slug)) {
    return { error: NextResponse.json({ error: "Only this organizer's admins can change its photo." }, { status: 403 }) };
  }
  return { admin, organizer };
}

/** Points the organizer at a photo (or none), then removes the photo it had. */
async function setPhoto(accessToken: string, slug: string, link: string | null, old: string | undefined) {
  const res = await asAdmin("/rest/v1/rpc/set_organizer_avatar", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_organizer: slug, p_url: link }),
  });
  if (!res?.ok) return false;
  revalidateTag(ORGANIZERS_TAG, { expire: 0 });
  const prefix = `${supabaseUrl()}/storage/v1/object/public/avatars/organizers/${slug}/`;
  if (old?.startsWith(prefix) && old !== link) {
    await asAdmin(`/storage/v1/object/avatars/organizers/${slug}/${old.slice(prefix.length)}`, accessToken, { method: "DELETE" });
  }
  return true;
}

export async function POST(request: Request) {
  const t = await target(request);
  if (t.error) return t.error;
  const type = request.headers.get("content-type") ?? "";
  const ext = TYPES[type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 415 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Use a photo under 2 MB." }, { status: 413 });
  }
  const path = `organizers/${t.organizer.slug}/${Date.now()}.${ext}`;
  const res = await asAdmin(`/storage/v1/object/avatars/${path}`, t.admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": type, "Cache-Control": "max-age=31536000" },
    body: bytes,
  });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't upload the photo. Try again." }, { status: 502 });
  const avatarUrl = `${supabaseUrl()}/storage/v1/object/public/avatars/${path}`;
  if (!(await setPhoto(t.admin.accessToken, t.organizer.slug, avatarUrl, t.organizer.avatarUrl))) {
    return NextResponse.json({ error: "Couldn't save the photo. Try again." }, { status: 502 });
  }
  return NextResponse.json({ avatarUrl });
}

export async function DELETE(request: Request) {
  const t = await target(request);
  if (t.error) return t.error;
  if (!(await setPhoto(t.admin.accessToken, t.organizer.slug, null, t.organizer.avatarUrl))) {
    return NextResponse.json({ error: "Couldn't remove the photo. Try again." }, { status: 502 });
  }
  return NextResponse.json({ avatarUrl: null });
}
