import { randomInt } from "node:crypto";

// Creating and resetting admin logins (Settings → Accounts → Send login),
// and the login an invited organizer makes when they claim their link
// (/api/start/claim, which checks the invite first). Only routes that check
// for a full admin or a usable invite call it. Without the secret key,
// both are off and Accounts says how to turn them on.

const url = () => process.env.SUPABASE_URL;
const secret = () => process.env.SUPABASE_SECRET_KEY;

export const invitesEnabled = () => Boolean(url() && secret());

async function authAdmin(path: string, init: RequestInit = {}): Promise<Response | null> {
  if (!invitesEnabled()) return null;
  try {
    return await fetch(`${url()}/auth/v1/admin/${path}`, {
      ...init,
      headers: { apikey: secret()!, Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export type LoginInfo = { id: string; email: string; lastSignInAt: string | null };

/** Every login, by email (lowercase). A handful of admins: one page is plenty. */
export async function listLogins(): Promise<Map<string, LoginInfo> | null> {
  const res = await authAdmin("users?page=1&per_page=1000");
  if (!res?.ok) return null;
  const body = (await res.json()) as { users?: { id: string; email?: string; last_sign_in_at?: string | null }[] };
  return new Map(
    (body.users ?? [])
      .filter((u) => u.email)
      .map((u) => [u.email!.toLowerCase(), { id: u.id, email: u.email!.toLowerCase(), lastSignInAt: u.last_sign_in_at ?? null }])
  );
}

/** A temporary password that's easy to read aloud or type: no 0/O, 1/l/I. */
export function temporaryPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) => Array.from({ length: n }, () => chars[randomInt(chars.length)]).join("");
  return `${pick(4)}-${pick(4)}-${pick(4)}`;
}

/**
 * Gives this email a login with a temporary password, or resets an existing
 * login to one. Either way they must choose their own at next sign-in.
 */
export async function setTemporaryLogin(email: string, password: string): Promise<"created" | "reset" | null> {
  const meta = { must_change_password: true };
  const created = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: meta }),
  });
  if (created?.ok) return "created";
  // Already has a login: reset it.
  const existing = (await listLogins())?.get(email);
  if (!existing) return null;
  const reset = await authAdmin(`users/${existing.id}`, {
    method: "PUT",
    body: JSON.stringify({ password, user_metadata: meta }),
  });
  return reset?.ok ? "reset" : null;
}

/**
 * A new login with the password its owner chose (the sign-up wizard's
 * claim). Its id, "exists" when the email already has one, or null.
 */
export async function createLogin(email: string, password: string): Promise<{ id: string } | "exists" | null> {
  const res = await authAdmin("users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  if (res?.status === 422) return "exists";
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => null)) as { id?: unknown } | null;
  return typeof body?.id === "string" ? { id: body.id } : null;
}

/** Removes a login (a claim that didn't go through leaves none behind). */
export async function deleteLogin(id: string): Promise<boolean> {
  const res = await authAdmin(`users/${encodeURIComponent(id)}`, { method: "DELETE" });
  return Boolean(res?.ok);
}
