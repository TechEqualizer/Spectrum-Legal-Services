import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin-auth";
import { createInvite, listInvites, revokeInvite } from "@/lib/server/invites";

// Settings → Invites (full admins): invite links for the sign-up wizard.
// GET: every invite  ·  POST { note }: a new one, its link shown once  ·
// DELETE ?id=: revoke an unclaimed one.

const NO_STORE = { "Cache-Control": "private, no-store" };
const ONLY = "Only Showlnk can invite organizers.";

async function fullAdmin() {
  const admin = await getAdmin();
  if (!admin) return { error: NextResponse.json({ error: "Sign in again." }, { status: 401, headers: NO_STORE }) };
  if (!admin.slugs.includes("*")) return { error: NextResponse.json({ error: ONLY }, { status: 403, headers: NO_STORE }) };
  return { admin };
}

export async function GET() {
  const a = await fullAdmin();
  if ("error" in a) return a.error;
  const invites = await listInvites(a.admin);
  if (invites === null) return NextResponse.json({ error: ONLY }, { status: 403, headers: NO_STORE });
  if (!invites) return NextResponse.json({ error: "Couldn't load invites. Reload to try again." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ invites }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const a = await fullAdmin();
  if ("error" in a) return a.error;
  const body = await request.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.replace(/\s+/g, " ").trim() : "";
  if (!note || note.length > 120) return NextResponse.json({ error: "Say who it's for (up to 120 characters)." }, { status: 400, headers: NO_STORE });
  const made = await createInvite(a.admin, note);
  if (made === null) return NextResponse.json({ error: ONLY }, { status: 403, headers: NO_STORE });
  if (!made) return NextResponse.json({ error: "Couldn't make the invite. Try again." }, { status: 502, headers: NO_STORE });
  const link = `${new URL(request.url).origin}/start?invite=${made.code}`;
  return NextResponse.json({ id: made.id, link }, { status: 201, headers: NO_STORE });
}

export async function DELETE(request: Request) {
  const a = await fullAdmin();
  if ("error" in a) return a.error;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Which invite?" }, { status: 400, headers: NO_STORE });
  const done = await revokeInvite(a.admin, id);
  if (done === null) return NextResponse.json({ error: ONLY }, { status: 403, headers: NO_STORE });
  return NextResponse.json({ ok: true, revoked: done }, { headers: NO_STORE });
}
