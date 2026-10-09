// Eventbrite: tickets SOLD per place a link was shared.
//
// Every Tickets button sends buyers to Eventbrite with the tracking code
// aff=reels_<source> (src/lib/events.ts). An organizer connects their
// Eventbrite account once, with Eventbrite's own sign-in (OAuth): we get a
// token, never their password. We then ask Eventbrite to tell us about every
// order (a webhook), fetch each order ourselves with that token, and record
// it in ticket_sales, matched to the event by its ticket link and to a
// source by the attendees' affiliate code. funnel_stats adds the totals.
//
// Eventbrite's API (as used here; see the README's "Eventbrite" section):
//   OAuth   GET  {oauth}/oauth/authorize?response_type=code&client_id&redirect_uri&state
//           POST {oauth}/oauth/token  (form: code, client_id, client_secret,
//                grant_type=authorization_code, redirect_uri) -> { access_token }
//   API     {api} = https://www.eventbriteapi.com/v3, Authorization: Bearer <token>
//           GET  /users/me/                         -> { id, name, emails }
//           GET  /users/me/organizations/           -> { organizations: [{ id, name }] }
//           GET  /events/{id}/                      -> { id, organization_id }
//           POST /organizations/{org}/webhooks/     (endpoint_url, actions) -> { id }
//           DELETE /webhooks/{id}/
//           GET  /orders/{id}/?expand=attendees     -> Order
//           GET  /events/{id}/orders/?expand=attendees&continuation=…
//                -> { orders: Order[], pagination: { has_more_items, continuation } }
// Webhook deliveries carry no signature, so their body is never trusted:
// only an api_url on the configured API host, of the form /v3/orders/<digits>/,
// for a webhook id we created, is acted on, and the order is fetched fresh.
//
// The tables are closed (no policies): only this file reads and writes them,
// with the project's secret key, like src/lib/server/auth-admin.ts.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Funnel } from "@/data/funnel-types";
import { getAdmin, managesOrganizer, type Admin } from "@/lib/server/admin-auth";
import { getOrganizer, type Organizer } from "@/lib/server/funnels";
import { listOrganizerEventVersions } from "@/lib/server/publications";
import { normalizeSourceTag } from "@/lib/source-tag";

// ---------------------------------------------------------------- config

const env = (name: string) => process.env[name]?.trim() || undefined;
const trimSlash = (s: string) => s.replace(/\/+$/, "");

export const ENV_VARS = ["EVENTBRITE_CLIENT_ID", "EVENTBRITE_CLIENT_SECRET", "EVENTBRITE_TOKEN_KEY"] as const;

const config = () => ({
  clientId: env("EVENTBRITE_CLIENT_ID"),
  clientSecret: env("EVENTBRITE_CLIENT_SECRET"),
  tokenKey: env("EVENTBRITE_TOKEN_KEY"),
  oauthBase: trimSlash(env("EVENTBRITE_OAUTH_BASE") ?? "https://www.eventbrite.com"),
  apiBase: trimSlash(env("EVENTBRITE_API_BASE") ?? "https://www.eventbriteapi.com/v3"),
  supabaseUrl: env("SUPABASE_URL"),
  secret: env("SUPABASE_SECRET_KEY"),
});

/** The settings this deployment still needs before organizers can connect (for full admins). */
export function missingSettings(): string[] {
  const c = config();
  return [
    ...ENV_VARS.filter((name) => !env(name)),
    ...(!c.supabaseUrl ? ["SUPABASE_URL"] : []),
    ...(!c.secret ? ["SUPABASE_SECRET_KEY"] : []),
  ];
}

/** Whether organizers can connect Eventbrite on this deployment. */
export const isEventbriteConfigured = () => missingSettings().length === 0;

// ---------------------------------------------------------------- the token, encrypted at rest

/** EVENTBRITE_TOKEN_KEY as 32 bytes: base64 of exactly 32 bytes, else its SHA-256. */
function tokenKey(): Buffer {
  const raw = config().tokenKey;
  if (!raw) throw new Error("EVENTBRITE_TOKEN_KEY is not set");
  const decoded = Buffer.from(raw, "base64");
  return decoded.length === 32 ? decoded : createHash("sha256").update(raw).digest();
}

/** AES-256-GCM: base64url of iv (12 bytes) + auth tag (16) + ciphertext. */
export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** The token, or null if it was encrypted with another key or tampered with. */
export function decryptToken(sealed: string): string | null {
  try {
    const all = Buffer.from(sealed, "base64url");
    if (all.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", tokenKey(), all.subarray(0, 12));
    decipher.setAuthTag(all.subarray(12, 28));
    return Buffer.concat([decipher.update(all.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- matching

/**
 * Eventbrite's event id from a ticket link: the number ending /e/<name>-tickets-<id>
 * (or /e/<id>), on eventbrite.com or a country site (eventbrite.co.uk, eventbrite.ca…),
 * or an ?eid= link. Undefined for anything else.
 */
export function ebEventIdFromUrl(link: string | undefined): string | undefined {
  if (!link) return undefined;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return undefined;
  }
  if (!/^https?:$/.test(url.protocol)) return undefined;
  if (!/(^|\.)eventbrite\.[a-z]{2,3}(\.[a-z]{2})?$/i.test(url.hostname)) return undefined;
  const eid = url.searchParams.get("eid");
  if (eid && /^\d{6,30}$/.test(eid)) return eid;
  const path = url.pathname.match(/\/e\/(?:[^/]*?-)?(\d{6,30})\/?$/);
  return path?.[1];
}

/** The <source> from our tracking code reels_<source>, or undefined for other codes. */
export function sourceFromAffiliate(aff: string | null | undefined): string | undefined {
  const m = typeof aff === "string" ? aff.trim().match(/^reels_(.+)$/i) : null;
  return m ? normalizeSourceTag(m[1]) : undefined;
}

/** The order id from a webhook's api_url, only on our configured API host and path. */
export function orderIdFromApiUrl(apiUrl: unknown): string | undefined {
  if (typeof apiUrl !== "string" || apiUrl.length > 300) return undefined;
  let url: URL;
  let base: URL;
  try {
    url = new URL(apiUrl);
    base = new URL(config().apiBase);
  } catch {
    return undefined;
  }
  if (url.protocol !== base.protocol || url.host !== base.host || url.username || url.password) return undefined;
  const prefix = trimSlash(base.pathname);
  const m = url.pathname.match(/^(.*)\/orders\/(\d{1,30})\/?$/);
  return m && m[1] === prefix ? m[2] : undefined;
}

// ---------------------------------------------------------------- Eventbrite API

const TIMEOUT_MS = 10_000;

export type EbOrganization = { id: string; name?: string };
export type EbAttendee = {
  affiliate?: string | null;
  status?: string;
  cancelled?: boolean;
  refunded?: boolean;
  quantity?: number;
};
export type EbOrder = {
  id: string;
  created?: string;
  status?: string;
  event_id?: string;
  affiliate?: string | null;
  costs?: { gross?: { value?: number; currency?: string } };
  attendees?: EbAttendee[];
};

class EventbriteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function ebFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config().apiBase}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new EventbriteError(res.status, `Eventbrite ${init.method ?? "GET"} ${path.split("?")[0]} answered ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Where to send the organizer to sign in to Eventbrite and allow us. */
export function authorizeUrl(state: string, redirectUri: string): string {
  const c = config();
  const url = new URL(`${c.oauthBase}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", c.clientId ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

/** Trades the sign-in code for the organizer's token (long-lived; Eventbrite gives no refresh token). */
export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const c = config();
  const res = await fetch(`${c.oauthBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: c.clientId ?? "",
      client_secret: c.clientSecret ?? "",
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!res.ok || typeof body?.access_token !== "string" || !body.access_token) {
    throw new EventbriteError(res.status, `Eventbrite token exchange answered ${res.status}`);
  }
  return body.access_token;
}

export const getMe = (token: string) => ebFetch<{ id: string; name?: string }>(token, "/users/me/");

export async function getOrganizations(token: string): Promise<EbOrganization[]> {
  const body = await ebFetch<{ organizations?: { id?: unknown; name?: unknown }[] }>(token, "/users/me/organizations/");
  return (body.organizations ?? [])
    .filter((o) => o.id !== undefined && o.id !== null)
    .map((o) => ({ id: String(o.id), ...(typeof o.name === "string" ? { name: o.name } : {}) }));
}

const getEvent = (token: string, ebEventId: string) => ebFetch<{ id: string; organization_id?: string }>(token, `/events/${ebEventId}/`);

export async function createWebhook(token: string, orgId: string, endpointUrl: string): Promise<string> {
  const body = await ebFetch<{ id?: unknown }>(token, `/organizations/${encodeURIComponent(orgId)}/webhooks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint_url: endpointUrl, actions: "order.placed,order.refunded,order.updated" }),
  });
  if (body.id === undefined || body.id === null) throw new EventbriteError(502, "Eventbrite gave no webhook id");
  return String(body.id);
}

export async function deleteWebhook(token: string, webhookId: string): Promise<void> {
  await ebFetch(token, `/webhooks/${encodeURIComponent(webhookId)}/`, { method: "DELETE" });
}

export const getOrder = (token: string, orderId: string) => ebFetch<EbOrder>(token, `/orders/${orderId}/?expand=attendees`);

async function eventOrders(token: string, ebEventId: string, continuation?: string) {
  const q = new URLSearchParams({ expand: "attendees" });
  if (continuation) q.set("continuation", continuation);
  return ebFetch<{ orders?: EbOrder[]; pagination?: { has_more_items?: boolean; continuation?: string } }>(
    token,
    `/events/${ebEventId}/orders/?${q}`
  );
}

// ---------------------------------------------------------------- the database (secret key)

async function db(path: string, init: RequestInit = {}): Promise<Response | null> {
  const c = config();
  if (!c.supabaseUrl || !c.secret) return null;
  try {
    return await fetch(`${c.supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: c.secret, Authorization: `Bearer ${c.secret}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[eventbrite] database unreachable", e instanceof Error ? e.message : e);
    return null;
  }
}

export type Connection = {
  organizer_slug: string;
  eb_user_id: string;
  eb_org_id: string;
  eb_org_name: string | null;
  token_ciphertext: string;
  webhook_id: string | null;
  connected_by: string;
  connected_at: string;
  last_order_at: string | null;
};

async function oneConnection(filter: string): Promise<Connection | null> {
  const res = await db(`eventbrite_connections?${filter}&select=*`);
  if (!res?.ok) return null;
  return ((await res.json()) as Connection[])[0] ?? null;
}

export const getConnection = (organizer: string) => oneConnection(`organizer_slug=eq.${encodeURIComponent(organizer)}`);

export const connectionByWebhook = (webhookId: string) =>
  /^[A-Za-z0-9_-]{1,64}$/.test(webhookId) ? oneConnection(`webhook_id=eq.${webhookId}`) : Promise.resolve(null);

export async function saveConnection(row: Omit<Connection, "connected_at" | "last_order_at">): Promise<boolean> {
  const res = await db("eventbrite_connections?on_conflict=organizer_slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ ...row, connected_at: new Date().toISOString(), last_order_at: null }),
  });
  return Boolean(res?.ok);
}

export async function removeConnection(organizer: string): Promise<boolean> {
  const res = await db(`eventbrite_connections?organizer_slug=eq.${encodeURIComponent(organizer)}`, { method: "DELETE" });
  return Boolean(res?.ok);
}

/** Tickets recorded for an organizer (placed orders), for Settings. */
export async function ticketsSynced(organizer: string): Promise<number> {
  const res = await db(`ticket_sales?organizer_slug=eq.${encodeURIComponent(organizer)}&status=eq.placed&select=quantity&limit=50000`);
  if (!res?.ok) return 0;
  return ((await res.json()) as { quantity: number }[]).reduce((n, r) => n + (r.quantity ?? 0), 0);
}

// ---------------------------------------------------------------- recording orders

type EventMatch = { funnelId: string; eventId?: string };

/** Eventbrite event id -> the organizer's funnel and date it sells, from each date's live ticket link. */
async function organizerEventMap(organizer: string): Promise<Map<string, EventMatch>> {
  const funnels: Funnel[] = (await listOrganizerEventVersions(organizer)).map((e) => e.live);
  const map = new Map<string, EventMatch>();
  for (const funnel of funnels) {
    for (const date of funnel.events ?? []) {
      const eb = ebEventIdFromUrl(date.ticketUrl);
      if (eb && !map.has(eb)) map.set(eb, { funnelId: funnel.id, eventId: date.id });
    }
  }
  return map;
}

/** Tickets still valid on an order: attendees not refunded or cancelled (each its quantity, else 1). */
function liveQuantity(order: EbOrder): number {
  return (order.attendees ?? [])
    .filter((a) => !a.refunded && !a.cancelled && !/^(refunded|cancell?ed|deleted|not attending)$/i.test(a.status ?? ""))
    .reduce((n, a) => n + (Number.isInteger(a.quantity) && a.quantity! > 0 ? a.quantity! : 1), 0);
}

/** The order's tracking code: the most common affiliate among its attendees, else the order's own. */
function affiliateOf(order: EbOrder): string | undefined {
  const counts = new Map<string, number>();
  for (const a of order.attendees ?? []) {
    const aff = typeof a.affiliate === "string" ? a.affiliate.trim() : "";
    if (aff) counts.set(aff, (counts.get(aff) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  return (top ?? (typeof order.affiliate === "string" ? order.affiliate.trim() : "")) || undefined;
}

type Recorded = "recorded" | "skipped" | "failed";

/**
 * Records one Eventbrite order (or updates it: refunds, cancellations).
 * Idempotent by order id. Orders for events none of the organizer's links
 * sell, and unfinished checkouts, are skipped.
 */
export async function recordOrder(connection: Connection, order: EbOrder, events?: Map<string, EventMatch>): Promise<Recorded> {
  const id = String(order.id ?? "");
  const ebEventId = String(order.event_id ?? "");
  if (!/^\d{1,30}$/.test(id) || !/^\d{1,30}$/.test(ebEventId)) return "skipped";
  const orderStatus = (order.status ?? "placed").toLowerCase();
  // Checkouts that never finished aren't sales.
  if (["started", "pending", "abandoned", "reserved"].includes(orderStatus)) return "skipped";
  const match = (events ?? (await organizerEventMap(connection.organizer_slug))).get(ebEventId);
  if (!match) return "skipped";

  const quantity = liveQuantity(order);
  const anyRefunded = (order.attendees ?? []).some((a) => a.refunded);
  const status =
    orderStatus === "refunded" ? "refunded"
    : orderStatus === "cancelled" || orderStatus === "canceled" || orderStatus === "deleted" ? "cancelled"
    : quantity === 0 && (order.attendees?.length ?? 0) > 0 ? (anyRefunded ? "refunded" : "cancelled")
    : "placed";
  const aff = affiliateOf(order);
  const created = order.created && !Number.isNaN(Date.parse(order.created)) ? new Date(order.created).toISOString() : new Date().toISOString();
  const gross = order.costs?.gross;
  const currency = typeof gross?.currency === "string" && /^[A-Za-z]{3}$/.test(gross.currency) ? gross.currency.toUpperCase() : null;
  const cents = Number.isInteger(gross?.value) && gross!.value! >= 0 ? gross!.value! : null;

  const res = await db("ticket_sales?on_conflict=eventbrite_order_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      eventbrite_order_id: id,
      organizer_slug: connection.organizer_slug,
      funnel_id: match.funnelId,
      event_id: match.eventId ?? null,
      eb_event_id: ebEventId,
      ordered_at: created,
      quantity: status === "placed" ? Math.min(quantity, 10000) : 0,
      gross_cents: cents,
      currency,
      aff: aff?.slice(0, 100) ?? null,
      source_tag: sourceFromAffiliate(aff) ?? null,
      status,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res?.ok) {
    console.error("[eventbrite] couldn't record order", id, res?.status);
    return "failed";
  }
  return "recorded";
}

/** Marks when the organizer's last order arrived (Settings' "last sale"). */
export async function touchLastOrder(organizer: string, at: string) {
  await db(`eventbrite_connections?organizer_slug=eq.${encodeURIComponent(organizer)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_order_at: at }),
  });
}

/**
 * Imports the orders already placed for every event the organizer's links
 * sell. Bounded: stops at `deadline` (ms since the epoch) or after 50 pages
 * per event, whichever comes first; webhooks keep it current from then on.
 */
export async function backfill(connection: Connection, deadline = Date.now() + 20_000): Promise<{ recorded: number; complete: boolean }> {
  const token = decryptToken(connection.token_ciphertext);
  if (!token) return { recorded: 0, complete: false };
  const events = await organizerEventMap(connection.organizer_slug);
  let recorded = 0;
  let latest = "";
  let complete = true;
  for (const ebEventId of events.keys()) {
    let continuation: string | undefined;
    for (let page = 0; page < 50; page++) {
      if (Date.now() > deadline) return finish(false);
      let body: Awaited<ReturnType<typeof eventOrders>>;
      try {
        body = await eventOrders(token, ebEventId, continuation);
      } catch (e) {
        console.error("[eventbrite] backfill:", e instanceof Error ? e.message : e);
        complete = false;
        break;
      }
      for (const order of body.orders ?? []) {
        if ((await recordOrder(connection, order, events)) === "recorded") {
          recorded++;
          if (order.created && order.created > latest) latest = order.created;
        }
      }
      if (!body.pagination?.has_more_items || !body.pagination.continuation) break;
      continuation = body.pagination.continuation;
    }
  }
  return finish(complete);

  async function finish(done: boolean) {
    if (latest && !Number.isNaN(Date.parse(latest))) await touchLastOrder(connection.organizer_slug, new Date(latest).toISOString());
    return { recorded, complete: done };
  }
}

/**
 * Which of the account's organizations sells the organizer's events: the
 * owner of the first of their Eventbrite events we can look up, else the first.
 */
export async function pickOrganization(token: string, organizer: string, orgs: EbOrganization[]): Promise<EbOrganization | undefined> {
  if (orgs.length <= 1) return orgs[0];
  for (const ebEventId of [...(await organizerEventMap(organizer)).keys()].slice(0, 3)) {
    try {
      const owner = String((await getEvent(token, ebEventId)).organization_id ?? "");
      const found = orgs.find((o) => o.id === owner);
      if (found) return found;
    } catch {
      // Not theirs, or gone: try the next.
    }
  }
  return orgs[0];
}

/**
 * Handles one webhook delivery's (untrusted) body. Returns what happened, for
 * logs only; the route always answers 200.
 */
export async function handleDelivery(body: unknown): Promise<string> {
  if (!isEventbriteConfigured() || !body || typeof body !== "object") return "ignored";
  const { api_url, config: cfg } = body as { api_url?: unknown; config?: { webhook_id?: unknown; action?: unknown } };
  const webhookId = cfg && (typeof cfg.webhook_id === "string" || typeof cfg.webhook_id === "number") ? String(cfg.webhook_id) : "";
  const orderId = orderIdFromApiUrl(api_url);
  if (!orderId || !webhookId) return "ignored";
  const connection = await connectionByWebhook(webhookId);
  if (!connection) return "unknown webhook";
  const token = decryptToken(connection.token_ciphertext);
  if (!token) return "token unreadable";
  let order: EbOrder;
  try {
    order = await getOrder(token, orderId);
  } catch (e) {
    return e instanceof Error ? e.message : "order fetch failed";
  }
  if (String(order.id ?? "") !== orderId) return "order mismatch";
  const result = await recordOrder(connection, order);
  // A new sale (not a refund) moves Settings' "last sale".
  if (result === "recorded" && cfg?.action === "order.placed" && liveQuantity(order) > 0) {
    const at = order.created && !Number.isNaN(Date.parse(order.created)) ? new Date(order.created).toISOString() : new Date().toISOString();
    await touchLastOrder(connection.organizer_slug, at);
  }
  return result;
}

export { EventbriteError };

// ---------------------------------------------------------------- who may connect

/** The organizer named in ?organizer=, if this signed-in admin runs it (connecting covers all its events). */
export async function organizerForAdmin(
  request: Request
): Promise<{ error: "signin" | "access"; status: number } | { error?: undefined; admin: Admin; organizer: Organizer }> {
  const admin = await getAdmin();
  if (!admin) return { error: "signin", status: 401 };
  const slug = new URL(request.url).searchParams.get("organizer") ?? "";
  const organizer = await getOrganizer(slug);
  // Not theirs looks the same as not there.
  if (!organizer || !managesOrganizer(admin, organizer.slug)) return { error: "access", status: 404 };
  return { admin, organizer };
}

export const STATE_COOKIE = "eb_oauth";
