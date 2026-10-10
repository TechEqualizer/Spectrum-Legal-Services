// Sign-up invites (supabase/migrations/*_signup_invites.sql). A code is
// random and shown once; the database keeps only its SHA-256. Full admins
// manage invites with their own sign-in (the database checks); the wizard
// checks and uses them with the secret key.

import { createHash, randomBytes } from "node:crypto";
import { asAdmin, type Admin } from "@/lib/server/admin-auth";

export const INVITE_FLYER_READS = 5;

export type Invite = {
  id: string;
  note: string;
  created_at: string;
  expires_at: string;
  flyer_reads: number;
  claimed_at: string | null;
  claimed_organizer: string | null;
  revoked_at: string | null;
};

/** Where an invite stands, for the wizard. */
export type InviteStatus = "valid" | "expired" | "claimed" | "revoked" | "unknown";

export const hashInviteCode = (code: string) => createHash("sha256").update(code).digest("hex");
const CODE = /^[A-Za-z0-9_-]{32}$/;

const env = (name: string) => process.env[name]?.trim() || undefined;
const service = () => {
  const url = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY");
  return url && secret ? { url, headers: { apikey: secret, Authorization: `Bearer ${secret}` } } : null;
};

const rpc = (admin: Admin, fn: string, body: object) =>
  asAdmin(`/rest/v1/rpc/${fn}`, admin.accessToken, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** A new invite; its code (shown once) and id. null: not a full admin; undefined: failed. */
export async function createInvite(admin: Admin, note: string): Promise<{ id: string; code: string } | null | undefined> {
  const code = randomBytes(24).toString("base64url");
  const res = await rpc(admin, "create_signup_invite", { p_code_hash: hashInviteCode(code), p_note: note });
  if (res && (res.status === 401 || res.status === 403)) return null;
  if (!res?.ok) return undefined;
  const id = await res.json().catch(() => undefined);
  return typeof id === "string" ? { id, code } : undefined;
}

/** Every invite, newest first. null: not a full admin; undefined: failed. */
export async function listInvites(admin: Admin): Promise<Invite[] | null | undefined> {
  const res = await rpc(admin, "signup_invites_list", {});
  if (res && (res.status === 401 || res.status === 403)) return null;
  if (!res?.ok) return undefined;
  const rows: unknown = await res.json().catch(() => undefined);
  return Array.isArray(rows) ? (rows as Invite[]) : undefined;
}

/** Revokes an unclaimed invite. null: not a full admin. */
export async function revokeInvite(admin: Admin, id: string): Promise<boolean | null> {
  const res = await rpc(admin, "revoke_signup_invite", { p_id: id });
  if (res && (res.status === 401 || res.status === 403)) return null;
  return res?.ok ? (await res.json().catch(() => false)) === true : false;
}

/** Where the invite with this code stands, and how many flyer reads it has left; undefined if unreachable. */
export async function inviteStatus(code: string, now = Date.now()): Promise<{ status: InviteStatus; readsLeft: number } | undefined> {
  if (!CODE.test(code)) return { status: "unknown", readsLeft: 0 };
  const s = service();
  if (!s) return undefined;
  try {
    const res = await fetch(`${s.url}/rest/v1/signup_invites?code_hash=eq.${hashInviteCode(code)}&select=expires_at,flyer_reads,claimed_at,revoked_at`, { headers: s.headers, cache: "no-store" });
    if (!res.ok) return undefined;
    const row = ((await res.json()) as Pick<Invite, "expires_at" | "flyer_reads" | "claimed_at" | "revoked_at">[])[0];
    if (!row) return { status: "unknown", readsLeft: 0 };
    const status: InviteStatus = row.revoked_at ? "revoked" : row.claimed_at ? "claimed" : Date.parse(row.expires_at) <= now ? "expired" : "valid";
    return { status, readsLeft: status === "valid" ? Math.max(0, INVITE_FLYER_READS - row.flyer_reads) : 0 };
  } catch {
    return undefined;
  }
}

/** Counts one flyer read against the invite; false when it can't be used (or has read 5). undefined if unreachable. */
export async function useInviteRead(code: string): Promise<boolean | undefined> {
  if (!CODE.test(code)) return false;
  const s = service();
  if (!s) return undefined;
  try {
    const res = await fetch(`${s.url}/rest/v1/rpc/use_signup_invite_read`, {
      method: "POST",
      headers: { ...s.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code_hash: hashInviteCode(code) }),
    });
    if (!res.ok) return undefined;
    return (await res.json()) === true;
  } catch {
    return undefined;
  }
}
