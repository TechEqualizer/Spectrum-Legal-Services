import { NextResponse } from "next/server";
import { asAdmin, getAdmin } from "@/lib/server/admin-auth";

// The Showlnk waitlist (Settings → Waitlist), for full admins only. Read as
// the signed-in admin, so the database checks that too.
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!admin.slugs.includes("*")) return NextResponse.json({ error: "Only Showlnk admins see the waitlist." }, { status: 403 });
  const res = await asAdmin("/rest/v1/waitlist?select=email,instagram,source_tag,created_at&order=created_at.desc&limit=5000", admin.accessToken);
  if (!res?.ok) return NextResponse.json({ error: "Couldn't load the waitlist. Reload to try again." }, { status: 502 });
  return NextResponse.json({ entries: await res.json() }, { headers: { "Cache-Control": "private, no-store" } });
}
