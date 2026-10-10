// A short tag saying where a funnel link was shared, e.g. /f/masquerade?src=instagram.
// Shared by the browser and the API routes so both accept the same values.

export const SOURCE_TAG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/**
 * Other names for the same place, so a visit tagged ?src=ig, a link Instagram
 * shares itself (utm_source=ig_web_copy_link) and ?src=instagram all count as
 * Instagram: one row in Results, not three.
 */
const ALIASES: Record<string, string> = {
  ig: "instagram", insta: "instagram", ig_web_copy_link: "instagram", ig_web_button_share_sheet: "instagram", igshid: "instagram",
  tt: "tiktok", "tik-tok": "tiktok",
  fb: "facebook", meta: "facebook",
  gbp: "google", "google-business": "google",
  text: "sms", texts: "sms", imessage: "sms",
  twitter: "x", "x-twitter": "x",
  yt: "youtube",
  snap: "snapchat",
  wa: "whatsapp",
  poster: "flyer", flyers: "flyer", qr: "flyer", "qr-code": "flyer",
};

/** The cleaned tag, or undefined when the value isn't a usable tag. Other names for a known place become its tag. */
export function normalizeSourceTag(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const tag = value.trim().toLowerCase();
  if (!SOURCE_TAG_PATTERN.test(tag)) return undefined;
  return ALIASES[tag] ?? tag;
}

/** Where a link can be shared, as offered in the admin's link builder. */
export const SOURCE_PRESETS = [
  { tag: "instagram", label: "Instagram bio" },
  { tag: "tiktok", label: "TikTok bio" },
  { tag: "facebook", label: "Facebook" },
  { tag: "google", label: "Google Business Profile" },
  { tag: "sms", label: "Text message" },
  { tag: "email", label: "Email signature" },
  { tag: "flyer", label: "Printed flyer or QR code" },
  { tag: "referral", label: "Referral partner" },
  { tag: "share", label: "Shared by a viewer" },
] as const;

/** No tag, and no app or site to tell where from: typed in, a saved link, or a text with the plain link. */
export const DIRECT = "Direct (no tag)";

/** Places the app or a fan tags itself, and well-known ones not offered in the builder. */
const KNOWN: Record<string, string> = {
  calendar: "Fan calendar",
  "google-search": "Google search",
  x: "X (Twitter)",
  youtube: "YouTube",
  snapchat: "Snapchat",
  threads: "Threads",
  whatsapp: "WhatsApp",
  linktree: "Linktree",
  eventbrite: "Eventbrite",
  newsletter: "Newsletter",
};

/** Kept in capitals when a tag spells them out: "dj-mike" reads "DJ mike". */
const ACRONYMS = new Set(["dj", "mc", "vip", "qr", "sms", "nye", "rsvp", "nyc", "atl", "dc", "hbcu", "tv"]);

/**
 * What people see for a tag, everywhere it shows: Results, Share, Home,
 * Leads, Fans and the exports. Known places get their name; anything else
 * reads as words in sentence case ("bus-bench" is "Bus bench").
 */
export function sourceLabel(tag: string | undefined) {
  if (!tag) return DIRECT;
  const t = normalizeSourceTag(tag) ?? tag;
  const known = SOURCE_PRESETS.find((p) => p.tag === t)?.label ?? KNOWN[t];
  if (known) return known;
  const words = t.split(/[-_]+/).filter(Boolean).map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  if (!words.length) return t;
  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(" ");
}
