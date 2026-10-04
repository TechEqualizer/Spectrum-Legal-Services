import { NextResponse } from "next/server";
import { asAdmin, getAdmin, supabaseUrl, updateProfile } from "@/lib/server/admin-auth";

// The signed-in admin's profile photo (Settings): stored in their own folder
// of the avatars bucket, which only they can write to, and linked from their
// sign-in account. The browser sends a small square already.

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

/** The stored path of a photo link in this admin's folder, if it is one. */
function ownPath(link: string | undefined, folder: string) {
  const prefix = `${supabaseUrl()}/storage/v1/object/public/avatars/${folder}/`;
  return link?.startsWith(prefix) ? `${folder}/${link.slice(prefix.length)}` : undefined;
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const type = request.headers.get("content-type") ?? "";
  const ext = TYPES[type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 415 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Use a photo under 2 MB." }, { status: 413 });
  }

  const path = `${admin.id}/${Date.now()}.${ext}`;
  const res = await asAdmin(`/storage/v1/object/avatars/${path}`, admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": type, "Cache-Control": "max-age=31536000" },
    body: bytes,
  });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't upload the photo. Try again." }, { status: 502 });
  const avatarUrl = `${supabaseUrl()}/storage/v1/object/public/avatars/${path}`;
  if (!(await updateProfile(admin.accessToken, { avatarUrl }))) {
    return NextResponse.json({ error: "Couldn't save the photo. Try again." }, { status: 502 });
  }
  // The old photo isn't needed any more.
  const old = ownPath(admin.profile.avatarUrl, admin.id);
  if (old) await asAdmin(`/storage/v1/object/avatars/${old}`, admin.accessToken, { method: "DELETE" });
  return NextResponse.json({ avatarUrl });
}

export async function DELETE() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!(await updateProfile(admin.accessToken, { avatarUrl: null }))) {
    return NextResponse.json({ error: "Couldn't remove the photo. Try again." }, { status: 502 });
  }
  const old = ownPath(admin.profile.avatarUrl, admin.id);
  if (old) await asAdmin(`/storage/v1/object/avatars/${old}`, admin.accessToken, { method: "DELETE" });
  return NextResponse.json({ avatarUrl: null });
}
