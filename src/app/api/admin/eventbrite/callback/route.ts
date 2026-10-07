import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, getAdmin, managesOrganizer } from "@/lib/server/admin-auth";
import {
  backfill,
  createWebhook,
  decryptToken,
  deleteWebhook,
  encryptToken,
  exchangeCode,
  getConnection,
  getMe,
  getOrganizations,
  isEventbriteConfigured,
  pickOrganization,
  saveConnection,
  STATE_COOKIE,
} from "@/lib/server/eventbrite";
import { getOrganizer } from "@/lib/server/funnels";

// Where Eventbrite sends the organizer's admin back after they allow
// Showlnk: checks the state against this browser's cookie, trades the code
// for a token, picks the Eventbrite organization, asks Eventbrite to tell us
// about its orders (a webhook), stores the token encrypted, imports the
// orders already placed (bounded), and returns to Settings.

const sameText = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const done = (outcome: "connected" | "error", reason?: string) => {
    const to = new URL("/admin/settings", request.url);
    to.searchParams.set("eventbrite", outcome);
    if (reason) to.searchParams.set("reason", reason);
    const response = NextResponse.redirect(to, 303);
    response.cookies.set(STATE_COOKIE, "", { ...cookieOptions(0), path: "/api/admin/eventbrite" });
    return response;
  };

  // The state must match the one this browser was given, for this organizer.
  const stored = (await cookies()).get(STATE_COOKIE)?.value ?? "";
  const dot = stored.indexOf(".");
  const state = url.searchParams.get("state") ?? "";
  if (dot < 1 || !state || !sameText(stored.slice(0, dot), state)) return done("error", "state");
  const organizerSlug = stored.slice(dot + 1);

  if (url.searchParams.get("error")) return done("error", "denied");
  const code = url.searchParams.get("code") ?? "";
  if (!code || code.length > 500) return done("error", "denied");
  if (!isEventbriteConfigured()) return done("error", "not-configured");

  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  const organizer = await getOrganizer(organizerSlug);
  if (!organizer || !managesOrganizer(admin, organizer.slug)) return done("error", "access");

  const redirectUri = `${url.origin}/api/admin/eventbrite/callback`;
  let token: string;
  let userId: string;
  let org: { id: string; name?: string } | undefined;
  try {
    token = await exchangeCode(code, redirectUri);
    userId = String((await getMe(token)).id ?? "");
    org = await pickOrganization(token, organizer.slug, await getOrganizations(token));
  } catch (e) {
    console.error("[eventbrite] connect failed:", e instanceof Error ? e.message : e);
    return done("error", "eventbrite");
  }
  if (!userId) return done("error", "eventbrite");
  if (!org) return done("error", "no-organization");

  // Reconnecting: the old webhook goes, so orders aren't counted from two.
  const previous = await getConnection(organizer.slug);
  const oldToken = previous && decryptToken(previous.token_ciphertext);
  if (previous?.webhook_id && oldToken) await deleteWebhook(oldToken, previous.webhook_id).catch(() => {});

  let webhookId: string;
  try {
    webhookId = await createWebhook(token, org.id, `${url.origin}/api/eventbrite/webhook`);
  } catch (e) {
    console.error("[eventbrite] webhook failed:", e instanceof Error ? e.message : e);
    return done("error", "webhook");
  }

  const row = {
    organizer_slug: organizer.slug,
    eb_user_id: userId.slice(0, 64),
    eb_org_id: org.id.slice(0, 64),
    eb_org_name: org.name?.slice(0, 200) ?? null,
    token_ciphertext: encryptToken(token),
    webhook_id: webhookId,
    connected_by: admin.email,
  };
  if (!(await saveConnection(row))) {
    await deleteWebhook(token, webhookId).catch(() => {});
    return done("error", "save");
  }

  // Orders placed before connecting: imported now, for at most 20 seconds.
  const connection = await getConnection(organizer.slug);
  if (connection) await backfill(connection, Date.now() + 20_000).catch((e) => console.error("[eventbrite] backfill failed:", e instanceof Error ? e.message : e));
  return done("connected");
}
