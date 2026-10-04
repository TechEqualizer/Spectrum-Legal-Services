import { NextResponse } from "next/server";
import { asAdmin, getAdmin } from "@/lib/server/admin-auth";
import { invitesEnabled, setTemporaryLogin, temporaryPassword } from "@/lib/server/auth-admin";

// Send login (Settings → Accounts): gives an account a login with a
// temporary password, or resets theirs, and emails it to them when email is
// set up. The full admin sees it once too, to send another way if needed.

async function emailLogin(to: string, password: string, loginUrl: string, from: string | undefined, reset: boolean) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !from) return false;
  const text = [
    reset ? "Your Event Reels password was reset." : "You've been invited to the Event Reels admin.",
    "",
    `Sign in: ${loginUrl}`,
    `Email: ${to}`,
    `Temporary password: ${password}`,
    "",
    "You'll choose your own password when you sign in.",
  ].join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: reset ? "Your Event Reels password" : "Your Event Reels login", text }),
    });
    if (!res.ok) console.error("[invite] email failed", res.status, await res.text());
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!admin.slugs.includes("*")) return NextResponse.json({ error: "Only full admins send logins." }, { status: 403 });
  if (!invitesEnabled()) {
    return NextResponse.json({ error: "Sending logins isn't set up yet: add SUPABASE_SECRET_KEY to the site's settings." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email === admin.email.toLowerCase()) return NextResponse.json({ error: "Change your own password in Settings." }, { status: 400 });
  // Only accounts already on the list get a login (Add account first).
  const listed = await asAdmin(`/rest/v1/admin_users?select=email&email=eq.${encodeURIComponent(email)}`, admin.accessToken);
  const rows = listed?.ok ? ((await listed.json()) as unknown[]) : [];
  if (!email || !rows.length) return NextResponse.json({ error: "Add the account first, then send its login." }, { status: 404 });

  const password = temporaryPassword();
  const done = await setTemporaryLogin(email, password);
  if (!done) return NextResponse.json({ error: "Couldn't create the login. Try again." }, { status: 502 });
  const loginUrl = `${new URL(request.url).origin}/admin/login`;
  const emailed = await emailLogin(email, password, loginUrl, process.env.LEAD_FROM_EMAIL, done === "reset");
  return NextResponse.json({ email, reset: done === "reset", emailed, password, loginUrl }, { headers: { "Cache-Control": "no-store" } });
}
