import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { parseFunnelRecord } from "@/lib/funnel-record";
import { EVENT_SLUG, newClientEvent, slugFromName } from "@/lib/new-event";
import { applyPublication, parsePublication } from "@/lib/publication";
import { ACCESS_COOKIE, cookieOptions, REFRESH_COOKIE, REFRESH_MAX_AGE, signInWithPassword } from "@/lib/server/admin-auth";
import { createLogin, deleteLogin } from "@/lib/server/auth-admin";
import { syncEventDates } from "@/lib/server/event-dates";
import { EVENT_FUNNELS_TAG, ORGANIZERS_TAG, slugIsFree } from "@/lib/server/funnels";
import { claimInvite, inviteStatus } from "@/lib/server/invites";
import { publicationTag } from "@/lib/server/publications";
import { isTimeZone } from "@/lib/event-time";
import { REEL_ROLES, type FunnelDraft } from "@/lib/funnel-draft";
import { parseLook } from "@/lib/look";
import { claimPublication, nightName, type StartDraft } from "@/lib/start-draft";

const NO_STORE = { "Cache-Control": "no-store" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Why an invite can't be claimed, in the organizer's words. */
const STOPPED: Record<string, string> = {
  expired: "This invite has expired. Ask Showlnk for a new one.",
  claimed: "This invite has already been used to make a link. Sign in instead.",
  revoked: "This invite was withdrawn. Ask Showlnk for a new one.",
  unknown: "This invite link isn't right. Check you have the whole link.",
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** The draft as the browser sent it, kept to the shapes the link is built from (everything is checked again as a publication). */
function draftFrom(input: unknown): StartDraft {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const dates = (Array.isArray(raw.dates) ? raw.dates : []).slice(0, 20).flatMap((d) => {
    const x = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    const date = str(x.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const time = str(x.time, 5);
    return [{ name: str(x.name, 80), date, time: /^\d{2}:\d{2}$/.test(time) ? time : "", venue: str(x.venue, 80), price: str(x.price, 30), ticketUrl: str(x.ticketUrl, 2000) }];
  });
  const r = raw.reels as FunnelDraft | undefined;
  const reels =
    r && typeof r === "object" && r.screen && typeof r.screen === "object" && Array.isArray(r.reels)
      ? {
          screen: { title: str(r.screen.title, 60), tagline: str(r.screen.tagline, 140), watchLabel: str(r.screen.watchLabel, 24), heading: str(r.screen.heading, 40) },
          heroPrompt: "",
          reels: r.reels.flatMap((x) =>
            x && typeof x === "object" && typeof x.role === "string" && x.role in REEL_ROLES
              ? [{ role: x.role, title: str(x.title, 80), summary: str(x.summary, 280), hook: "", captions: [], ...(typeof x.date === "string" ? { date: str(x.date, 10) } : {}), source: "text" as const, videoPrompt: "" }]
              : []
          ),
        }
      : undefined;
  const look = raw.look && typeof raw.look === "object" ? parseLook(raw.look) : undefined;
  return { dates, ...(reels ? { reels } : {}), ...(look ? { look } : {}) };
}

/** The event's own link: from the night's name, else after the organizer, numbered if taken. */
async function freeEventSlug(night: string, organizer: string): Promise<string | null> {
  const base = slugFromName(night) || "night";
  const tries = [base, `${organizer}-${base}`.slice(0, 64).replace(/-+$/, ""), ...[2, 3, 4, 5].map((n) => `${organizer}-${base}`.slice(0, 60).replace(/-+$/, "") + `-${n}`)];
  for (const slug of tries) if (slug !== organizer && EVENT_SLUG.test(slug) && (await slugIsFree(slug))) return slug;
  return null;
}

// Step 3 of the sign-up wizard (docs/plans/05-signup.md): claim the link.
// Makes the login with the password they chose, then, in one step in the
// database, their organizer (/f/<slug>), the night from their flyer as its
// first event (published with the reels' words), their access to it and
// Core's 14-day trial, and marks the invite used. If that step fails, the
// login goes too. Then they're signed in.
// POST { invite, name, slug, ticketUrl?, email, password, agree, timeZone, draft } -> { slug, eventSlug }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
  const bad = (field: string, error: string, status = 400) => NextResponse.json({ field, error }, { status, headers: NO_STORE });
  const invite = typeof body?.invite === "string" ? body.invite : "";
  const name = text(body?.name);
  const slug = text(body?.slug).toLowerCase();
  const email = text(body?.email).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  const timeZone = typeof body?.timeZone === "string" && isTimeZone(body.timeZone) ? body.timeZone : undefined;
  const draft = draftFrom(body?.draft);

  const s = await inviteStatus(invite);
  if (!s) return NextResponse.json({ error: "Couldn't check your invite. Try again in a minute." }, { status: 502, headers: NO_STORE });
  if (s.status !== "valid") return NextResponse.json({ error: STOPPED[s.status] }, { status: 403, headers: NO_STORE });

  if (!name || name.length > 120) return bad("name", "Add your name as fans see it (up to 120 characters).");
  if (!EVENT_SLUG.test(slug)) return bad("slug", "Use lowercase letters, numbers and dashes for your link.");
  if (!EMAIL.test(email) || email.length > 254) return bad("email", "Enter your email address.");
  if (password.length < 8 || password.length > 72) return bad("password", "Use a password of at least 8 characters.");
  if (body?.agree !== true) return bad("agree", "Agree to the terms to claim your link.");
  if (!draft.dates?.length) return NextResponse.json({ error: "Add your flyer first (step 1)." }, { status: 400, headers: NO_STORE });
  if (!(await slugIsFree(slug))) return bad("slug", `showlnk.com/f/${slug} is taken. Try another.`, 409);

  const night = nightName(draft);
  const eventSlug = await freeEventSlug(night, slug);
  if (!eventSlug) return NextResponse.json({ error: "Couldn't make a link for your night. Try again." }, { status: 502, headers: NO_STORE });
  // Checked before anything is saved.
  const event = parseFunnelRecord(JSON.parse(JSON.stringify(newClientEvent(name, { slug: eventSlug, name: night }))));
  if (typeof event === "string") {
    console.error("[claim] event didn't check out:", event);
    return NextResponse.json({ error: "Couldn't make your link. Try again." }, { status: 500, headers: NO_STORE });
  }
  const ticketUrl = typeof body?.ticketUrl === "string" ? body.ticketUrl : undefined;
  const publication = parsePublication(JSON.parse(JSON.stringify(claimPublication(draft, timeZone, ticketUrl))), event);
  if (typeof publication === "string") {
    console.error("[claim] reels didn't check out:", publication);
    return NextResponse.json({ error: "Something in your reels didn't check out. Go back a step and try again." }, { status: 400, headers: NO_STORE });
  }

  const login = await createLogin(email, password);
  if (login === "exists") return bad("email", "This email already has a Showlnk sign-in. Sign in, or use another email.", 409);
  if (!login) return NextResponse.json({ error: "Couldn't make your sign-in. Try again in a minute." }, { status: 502, headers: NO_STORE });

  const result = await claimInvite(invite, {
    email,
    organizer: { slug, name },
    event: { slug: eventSlug, funnelId: event.id, data: event },
    publication,
  });
  if (result !== "claimed") {
    await deleteLogin(login.id);
    if (result === "slug_taken") return bad("slug", `showlnk.com/f/${slug} is taken. Try another.`, 409);
    if (result === "email_taken") return bad("email", "This email already runs a link on Showlnk. Sign in instead.", 409);
    if (result === "invite") return NextResponse.json({ error: STOPPED.claimed }, { status: 403, headers: NO_STORE });
    return NextResponse.json({ error: "Couldn't claim your link. Try again." }, { status: 502, headers: NO_STORE });
  }
  revalidateTag(ORGANIZERS_TAG, { expire: 0 });
  revalidateTag(EVENT_FUNNELS_TAG, { expire: 0 });
  revalidateTag(publicationTag(eventSlug), { expire: 0 });

  const tokens = await signInWithPassword(email, password);
  const signedIn = typeof tokens === "object" && "access_token" in tokens;
  // The dates as rows, as a publish from the studio leaves them.
  if (signedIn) await syncEventDates(eventSlug, applyPublication(event, publication), tokens.access_token);
  const response = NextResponse.json({ slug, eventSlug, signedIn }, { status: 201, headers: NO_STORE });
  if (signedIn) {
    response.cookies.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_in));
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(REFRESH_MAX_AGE));
  }
  return response;
}
