// Admin sign-in, with Supabase Auth (email and password).
//
// The sign-in tokens live in httpOnly cookies, so page scripts can't read
// them. The proxy (src/proxy.ts) refreshes them before they expire. Every
// write goes to Supabase with the admin's own token, and row-level security
// decides what it may change: see supabase/migrations/*_admin_publishing.sql.

import { cookies } from "next/headers";

export const ACCESS_COOKIE = "admin_at";
export const REFRESH_COOKIE = "admin_rt";

const url = () => process.env.SUPABASE_URL;
const key = () => process.env.SUPABASE_PUBLISHABLE_KEY;

export type AuthTokens = { access_token: string; refresh_token: string; expires_in: number };

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/** Thirty days: how long "stay signed in" lasts without a visit. */
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

async function authCall(path: string, init: RequestInit): Promise<Response | null> {
  if (!url() || !key()) return null;
  try {
    return await fetch(`${url()}/auth/v1/${path}`, {
      ...init,
      headers: { apikey: key()!, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthTokens | "invalid" | "unavailable"> {
  const res = await authCall("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!res) return "unavailable";
  if (res.status === 400 || res.status === 401) return "invalid";
  if (!res.ok) return "unavailable";
  return (await res.json()) as AuthTokens;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  const res = await authCall("token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
  return res?.ok ? ((await res.json()) as AuthTokens) : null;
}

export async function signOut(accessToken: string) {
  await authCall("logout", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
}

export async function updatePassword(accessToken: string, password: string): Promise<boolean> {
  const res = await authCall("user", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password, data: { must_change_password: false } }),
  });
  return Boolean(res?.ok);
}

export type Admin = {
  email: string;
  /** Funnel slugs this admin may publish; "*" means all. */
  slugs: string[];
  mustChangePassword: boolean;
  accessToken: string;
};

/**
 * The signed-in admin for this request, checked with Supabase, or null. Only
 * accounts listed in admin_users count.
 */
export async function getAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const userRes = await authCall("user", { headers: { Authorization: `Bearer ${token}` } });
  if (!userRes?.ok) return null;
  const user = (await userRes.json()) as { email?: string; user_metadata?: { must_change_password?: boolean } };
  if (!user.email) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/admin_users?select=email,slugs`, {
      headers: { apikey: key()!, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { email: string; slugs: string[] }[];
    if (!rows[0]) return null;
    return {
      email: user.email,
      slugs: rows[0].slugs,
      mustChangePassword: Boolean(user.user_metadata?.must_change_password),
      accessToken: token,
    };
  } catch {
    return null;
  }
}

export const canPublish = (admin: Pick<Admin, "slugs">, slug: string) => admin.slugs.includes("*") || admin.slugs.includes(slug);

/** When a JWT expires, in seconds since the epoch, without verifying it (Supabase verifies on use). */
export function tokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

/** A Supabase REST or Storage call made as the signed-in admin, so row-level security applies. */
export async function asAdmin(path: string, accessToken: string, init: RequestInit = {}): Promise<Response | null> {
  if (!url() || !key()) return null;
  try {
    return await fetch(`${url()}${path}`, {
      ...init,
      headers: { apikey: key()!, Authorization: `Bearer ${accessToken}`, ...init.headers },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export const supabaseUrl = () => url();
