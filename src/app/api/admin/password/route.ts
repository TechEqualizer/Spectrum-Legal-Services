import { NextResponse } from "next/server";
import { getAdmin, updatePassword } from "@/lib/server/admin-auth";

const MIN_PASSWORD = 10;

// Changes the signed-in admin's password (also required after the first sign-in).
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < MIN_PASSWORD || password.length > 200) {
    return NextResponse.json({ error: `Use at least ${MIN_PASSWORD} characters.` }, { status: 400 });
  }
  if (!(await updatePassword(admin.accessToken, password))) {
    return NextResponse.json({ error: "Couldn't change the password. Try a different one." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
