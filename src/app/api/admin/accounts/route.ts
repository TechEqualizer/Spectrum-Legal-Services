import { NextResponse } from "next/server";
import { asAdmin, getAdmin, type Admin } from "@/lib/server/admin-auth";
import { listOrganizers } from "@/lib/server/funnels";

// Superadmin (Settings → Accounts): full admins see every admin account and
// set what each can edit. The database enforces it too, and nobody changes
// their own access here.

type AccountRow = { email: string; slugs: string[]; organizers: string[]; created_at?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9-]{1,64}$/;

async function fullAdmin(): Promise<Admin | NextResponse> {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!admin.slugs.includes("*")) return NextResponse.json({ error: "Only full admins manage accounts." }, { status: 403 });
  return admin;
}

/** Every admin account, newest last, with the organizers they could be given. */
export async function GET() {
  const admin = await fullAdmin();
  if (admin instanceof NextResponse) return admin;
  const res = await asAdmin("/rest/v1/admin_users?select=*&order=created_at", admin.accessToken);
  if (!res?.ok) return NextResponse.json({ error: "Couldn't load accounts. Reload to try again." }, { status: 502 });
  const rows = (await res.json()) as AccountRow[];
  return NextResponse.json({
    me: admin.email.toLowerCase(),
    accounts: rows.map((r) => ({ email: r.email, slugs: r.slugs, organizers: r.organizers ?? [], created_at: r.created_at })),
    organizers: await listOrganizers(),
  });
}

/** Adds an account or sets its access: full access, or the organizers it runs. */
export async function POST(request: Request) {
  const admin = await fullAdmin();
  if (admin instanceof NextResponse) return admin;
  const body = (await request.json().catch(() => null)) as { email?: unknown; full?: unknown; organizers?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  if (email === admin.email.toLowerCase()) return NextResponse.json({ error: "You can't change your own access." }, { status: 400 });
  const full = body?.full === true;
  const organizers = Array.isArray(body?.organizers) ? body.organizers.filter((o): o is string => typeof o === "string" && SLUG.test(o)) : [];
  const known = new Set((await listOrganizers()).map((o) => o.slug));
  if (organizers.some((o) => !known.has(o))) return NextResponse.json({ error: "Choose organizers from the list." }, { status: 400 });
  if (!full && !organizers.length) return NextResponse.json({ error: "Give them full access or at least one organizer." }, { status: 400 });

  const res = await asAdmin("/rest/v1/admin_users?on_conflict=email", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ email, slugs: full ? ["*"] : [], organizers: full ? [] : organizers }),
  });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't save the account. Try again." }, { status: 502 });
  return NextResponse.json({ email });
}

/** Removes an account's admin access (their sign-in stays, but opens nothing). */
export async function DELETE(request: Request) {
  const admin = await fullAdmin();
  if (admin instanceof NextResponse) return admin;
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Choose an account." }, { status: 400 });
  if (email === admin.email.toLowerCase()) return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  const res = await asAdmin(`/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}`, admin.accessToken, { method: "DELETE" });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't remove the account. Try again." }, { status: 502 });
  return NextResponse.json({ removed: email });
}
