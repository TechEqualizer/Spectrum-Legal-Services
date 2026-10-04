import { NextResponse } from "next/server";
import { getAdmin, updateProfile } from "@/lib/server/admin-auth";

// The signed-in admin's name (Settings). Empty clears it.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length > 60) return NextResponse.json({ error: "Keep your name to 60 characters." }, { status: 400 });
  if (!(await updateProfile(admin.accessToken, { name: name || null }))) {
    return NextResponse.json({ error: "Couldn't save your name. Try again." }, { status: 502 });
  }
  return NextResponse.json({ name: name || null });
}
