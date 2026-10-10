// Fans: following an organizer with an email, confirmed through a
// single-use link (docs/plans/02-fans.md, step 1).
//
// Everything about fans is in server-only tables, reached through the fan_*
// database functions with the secret key (supabase/migrations/*_fans.sql).
// A confirmed fan carries a signed, httpOnly cookie holding their id; fans
// never get Supabase accounts.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Funnel, ReelMedia } from "@/data/funnel-types";
import { FAN_BUCKET, FAN_REF_PREFIX, fanRefPath, fanRefsOf, isFanRef, isFansReel, swapFanRefs } from "@/lib/fan-reels";
import { getOrganizer } from "@/lib/server/funnels";
import { planOf } from "@/lib/server/plans";
import type { Plan, PlanStatus } from "@/lib/plans";
import { followConsent } from "@/lib/fans";
import { normalizeSourceTag } from "@/lib/source-tag";

const env = (name: string) => process.env[name]?.trim() || undefined;

export const FAN_COOKIE = "showlnk_fan";
/** 180 days. */
export const FAN_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

const config = () => ({
  supabaseUrl: env("SUPABASE_URL"),
  secret: env("SUPABASE_SECRET_KEY"),
  cookieSecret: env("FAN_COOKIE_SECRET"),
  resendKey: env("RESEND_API_KEY"),
  resendBase: (env("RESEND_API_BASE") ?? "https://api.resend.com").replace(/\/+$/, ""),
  from: env("FAN_FROM_EMAIL") ?? "fans@showlnk.com",
  postal: env("SHOWLNK_POSTAL_ADDRESS"),
});

/** The settings this deployment still needs before visitors can follow. */
export function missingFanSettings(): string[] {
  const c = config();
  return [
    ...(!c.supabaseUrl ? ["SUPABASE_URL"] : []),
    ...(!c.secret ? ["SUPABASE_SECRET_KEY"] : []),
    ...(!c.cookieSecret ? ["FAN_COOKIE_SECRET"] : []),
    ...(!c.resendKey ? ["RESEND_API_KEY"] : []),
    ...(!c.postal ? ["SHOWLNK_POSTAL_ADDRESS"] : []),
  ];
}
export const isFollowingConfigured = () => missingFanSettings().length === 0;

/** Plans that came through Showlnk's own sign-up (a trial or Stripe), as opposed to an organizer Showlnk set up and comped. */
const SELF_SERVE: PlanStatus[] = ["trialing", "active", "past_due", "canceled"];

/**
 * Whether an organizer's links show Follow. The deployment must have every
 * fan setting; then Follow is on for organizers who signed up themselves
 * (their plan came from a trial or Stripe), and, during the rollout, for
 * those FOLLOW_ORGANIZERS lists (comma-separated slugs, or * for all), which
 * is how organizers Showlnk set up (Big Love) get it. Pass the plan when
 * it's already loaded.
 */
export async function followOn(organizer: string | undefined, plan?: Plan): Promise<boolean> {
  if (!organizer || !isFollowingConfigured()) return false;
  const list = (env("FOLLOW_ORGANIZERS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.includes("*") || list.includes(organizer)) return true;
  const p = plan ?? (await planOf(organizer));
  return Boolean(p && SELF_SERVE.includes(p.status));
}

type Rpc<T> = { ok: true; data: T } | { ok: false; status: number };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<Rpc<T>> {
  const c = config();
  if (!c.supabaseUrl || !c.secret) return { ok: false, status: 503 };
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: c.secret, Authorization: `Bearer ${c.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[fans] ${fn} failed`, res.status, (await res.text()).slice(0, 300));
      return { ok: false, status: res.status };
    }
    const text = await res.text();
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  } catch (e) {
    console.error(`[fans] database unreachable`, e instanceof Error ? e.message : e);
    return { ok: false, status: 502 };
  }
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const hmac = (s: string) => createHmac("sha256", config().cookieSecret ?? "").update(s).digest("base64url");

/** A keyed hash of the IP, for rate limits: the database never sees the IP itself. */
const ipHash = (ip: string | undefined) => (ip ? createHmac("sha256", config().cookieSecret ?? "").update(`ip:${ip}`).digest("hex") : null);

/** The visitor's IP: the first address Vercel's proxy saw. */
export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || undefined;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidFanEmail = (email: string) => email.length >= 3 && email.length <= 320 && EMAIL.test(email);

// --- The cookie: "<fan id>.<expires, unix seconds>.<signature>" ---

export function fanCookieValue(fanId: string, now = Date.now()): string {
  const body = `${fanId}.${Math.floor(now / 1000) + FAN_COOKIE_MAX_AGE}`;
  return `${body}.${hmac(body)}`;
}

/** The fan id in a cookie, if the signature holds and it hasn't expired. */
export function fanIdFromCookie(value: string | undefined, now = Date.now()): string | null {
  if (!value || !config().cookieSecret) return null;
  const m = value.match(/^([0-9a-f-]{36})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/);
  if (!m) return null;
  const expected = Buffer.from(hmac(`${m[1]}.${m[2]}`));
  const given = Buffer.from(m[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(m[2]) * 1000 > now ? m[1] : null;
}

export const fanCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/**
 * Whether a cookie-carrying POST came from this site. The cookie is
 * SameSite=Lax already; this also refuses a missing or foreign Origin.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

// --- Starting a follow: the sign-in email ---

export type StartResult = "sent" | "rate_limited" | "unknown_organizer" | "not_configured" | "failed";

export async function startFollow(
  input: { email: string; organizer: string; sourceTag?: string; funnelId?: string; ip?: string },
  origin: string
): Promise<StartResult> {
  if (!isFollowingConfigured()) return "not_configured";
  const organizer = await getOrganizer(input.organizer);
  if (!organizer) return "unknown_organizer";
  const email = input.email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const started = await rpc<string>("fan_start", {
    p_token_hash: sha256(token),
    p_email: email,
    p_organizer: organizer.slug,
    p_consent_text: followConsent(organizer.name),
    p_source_tag: normalizeSourceTag(input.sourceTag) ?? null,
    p_funnel_id: input.funnelId && /^[a-z0-9-]{1,80}$/.test(input.funnelId) ? input.funnelId : null,
    p_ip_hash: ipHash(input.ip),
  });
  if (!started.ok) return "failed";
  if (started.data === "rate_limited") return "rate_limited";
  if (started.data !== "ok") return "unknown_organizer";
  const link = `${origin}/fans/confirm?token=${token}`;
  return (await sendSignInEmail(email, organizer.name, link)) ? "sent" : "failed";
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
/** A display name inside a From header: no quotes or angle brackets. */
const fromName = (s: string) => s.replace(/["<>\r\n]/g, "").slice(0, 80);

async function sendSignInEmail(to: string, organizer: string, link: string): Promise<boolean> {
  const c = config();
  const subject = `Confirm you want to follow ${organizer}`;
  const footer = `You got this because this address was entered on ${organizer}'s Showlnk link. If that wasn't you, ignore this email: nothing happens unless you confirm.`;
  const text = [
    `Tap to confirm you want to follow ${organizer}:`,
    "",
    link,
    "",
    "The link works once, for 20 minutes.",
    "",
    "--",
    footer,
    `Showlnk, ${c.postal}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#0a0710;font-family:Montserrat,sans-serif;color:#f4eee4">
<div style="max-width:480px;margin:0 auto;padding:40px 24px">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b8adc4;margin:0 0 12px">Showlnk</p>
<h1 style="font-size:26px;line-height:1.2;margin:0 0 16px;color:#f4eee4">Follow ${escapeHtml(organizer)}</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 28px;color:#e6dfd4">Confirm and you'll hear about their next nights first: presales, reveals and fans-only reels.</p>
<a href="${escapeHtml(link)}" style="display:inline-block;background:#e8be5a;color:#1a1208;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px">Confirm and follow</a>
<p style="font-size:14px;line-height:1.6;margin:28px 0 0;color:#b8adc4">The button works once, for 20 minutes.</p>
<hr style="border:0;border-top:1px solid #2a2233;margin:36px 0 20px">
<p style="font-size:12px;line-height:1.6;margin:0;color:#8e839b">${escapeHtml(footer)}<br>Showlnk, ${escapeHtml(c.postal ?? "")}</p>
</div></body></html>`;
  try {
    const res = await fetch(`${c.resendBase}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${fromName(organizer)} via Showlnk <${c.from}>`, to: [to], subject, text, html }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[fans] sign-in email failed", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("[fans] email service unreachable", e instanceof Error ? e.message : e);
    return false;
  }
}

// --- Confirming, following, leaving ---

export type TokenInfo = { organizer: string; status: "valid" | "used" | "expired" };

/** What a sign-in link is for, without using it. */
export async function tokenInfo(token: string): Promise<TokenInfo | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const r = await rpc<{ organizer_slug: string; status: TokenInfo["status"] }[]>("fan_token_info", { p_token_hash: sha256(token) });
  const row = r.ok ? r.data?.[0] : undefined;
  return row ? { organizer: row.organizer_slug, status: row.status } : null;
}

/** Uses a sign-in link: the fan and the organizer they now follow, or null. */
export async function confirmFollow(token: string): Promise<{ fanId: string; organizer: string } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const r = await rpc<{ fan_id: string; organizer_slug: string }[]>("fan_confirm", { p_token_hash: sha256(token) });
  const row = r.ok ? r.data?.[0] : undefined;
  return row ? { fanId: row.fan_id, organizer: row.organizer_slug } : null;
}

/** The organizers a fan follows now. */
export async function following(fanId: string): Promise<string[] | null> {
  const r = await rpc<string[]>("fan_following", { p_fan_id: fanId });
  return r.ok ? (r.data ?? []) : null;
}

export async function unfollow(fanId: string, organizer: string): Promise<boolean | null> {
  const r = await rpc<boolean>("fan_unfollow", { p_fan_id: fanId, p_organizer: organizer });
  return r.ok ? r.data === true : null;
}

/** Deletes the fan and everything about them. */
export async function forget(fanId: string): Promise<boolean | null> {
  const r = await rpc<boolean>("fan_forget", { p_fan_id: fanId });
  return r.ok ? r.data === true : null;
}

// --- Fans-only reels: short-lived addresses for private files ---

/** How long a signed address works: long enough to watch, short enough not to share. */
export const FAN_MEDIA_TTL = 60 * 60;

/** Signed addresses for private references (src/lib/fan-reels.ts), by reference; null if storage can't be reached. */
export async function signFanRefs(refs: string[]): Promise<Record<string, string> | null> {
  const c = config();
  const unique = [...new Set(refs.filter(isFanRef))];
  if (!unique.length) return {};
  if (!c.supabaseUrl || !c.secret) return null;
  try {
    const res = await fetch(`${c.supabaseUrl}/storage/v1/object/sign/${FAN_BUCKET}`, {
      method: "POST",
      headers: { apikey: c.secret, Authorization: `Bearer ${c.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: FAN_MEDIA_TTL, paths: unique.map(fanRefPath) }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[fans] signing failed", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const rows = (await res.json()) as { path?: string; signedURL?: string | null; error?: string | null }[];
    const urls: Record<string, string> = {};
    for (const row of rows) {
      if (row.path && row.signedURL) urls[`${FAN_REF_PREFIX}${row.path}`] = `${c.supabaseUrl}/storage/v1${row.signedURL}`;
    }
    return urls;
  } catch (e) {
    console.error("[fans] storage unreachable", e instanceof Error ? e.message : e);
    return null;
  }
}

/** A fans-only reel's media, ready to play (private files signed), by reel id. */
export async function playableFanMedia(funnel: Funnel): Promise<Record<string, ReelMedia> | null> {
  const reels = funnel.reels.filter((r) => isFansReel(r) && r.media);
  const urls = await signFanRefs(reels.flatMap((r) => fanRefsOf(r.media)));
  if (!urls) return null;
  return Object.fromEntries(reels.map((r) => [r.id, swapFanRefs(r.media!, urls)]));
}
