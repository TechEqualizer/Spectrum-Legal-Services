// Reads an event flyer (a photo, a PDF, or pasted text) with Claude and
// returns the event dates it finds. Nothing is saved here: the admin reviews
// each date in the date sheet before it's added.

import Anthropic from "@anthropic-ai/sdk";
import { LOOK_FONT_IDS, LOOK_FONTS, parseLook, type Look } from "@/lib/look";

/** A date as read from the flyer, in the event's local time. */
export type ImportedDate = {
  name: string;
  /** "2026-10-12" */
  date: string;
  /** "19:00", or "" when the flyer doesn't say. */
  time: string;
  venue: string;
  price: string;
  /** https only, or "". */
  ticketUrl: string;
};

/** The dates found, and the flyer's look when it was a picture of one. */
export type ImportResult = { dates: ImportedDate[]; note: string; look?: Look } | { problem: string };

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const PDF_TYPE = "application/pdf";

const nullableString = { type: ["string", "null"] };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dates", "note", "look"],
  properties: {
    dates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "date", "time", "venue", "price", "ticketUrl"],
        properties: {
          name: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { ...nullableString, description: "24-hour HH:MM start time, or null if not given" },
          venue: nullableString,
          price: nullableString,
          ticketUrl: nullableString,
        },
      },
    },
    note: nullableString,
    look: {
      type: "object",
      additionalProperties: false,
      required: ["found", "background", "depth", "button", "highlight", "light", "font"],
      properties: {
        found: { type: "boolean" },
        background: { type: "string", description: "#RRGGBB" },
        depth: { type: "string", description: "#RRGGBB" },
        button: { type: "string", description: "#RRGGBB" },
        highlight: { type: "string", description: "#RRGGBB" },
        light: { type: "string", description: "#RRGGBB" },
        font: { type: "string", enum: LOOK_FONT_IDS },
      },
    },
  },
};

const instructions = (today: string, eventName: string) => `You read event flyers and event details for a ticketing page, and pull out each event date.

Today is ${today}. The page is for "${eventName}".

For each separate date the flyer advertises, give:
- name: the event's name as the flyer shows it, short (under 80 characters). If the flyer names a special edition, put it after a colon, e.g. "Golden Hour: Halloween".
- date: YYYY-MM-DD. When the flyer leaves out the year, use the next time that date comes after today.
- time: when it starts, 24-hour HH:MM (doors time if that's all it gives). null if no time is shown.
- venue: the venue name, plus the neighborhood or city if shown. null if not shown.
- price: short, as the flyer says it, e.g. "From $25", "$20 / $30 at the door", "Free". null if not shown.
- ticketUrl: a ticket link written out on the flyer. Add https:// if it's written without it. null if there's only a QR code or no link; don't guess one.

Only include what the flyer actually says; never invent details. If you can't find any event date, return an empty list and use note to say what's missing in one short sentence, written to the event organizer. Otherwise note is null, or one short sentence about anything they should double-check (e.g. a time that was hard to read).

Also describe the flyer's look, so the event's ticket page can match it. The page is dark: a dark background behind white words, buttons with white text, bright highlights, and light sheets for forms. Set look.found to false if you were given only text (no picture or PDF of a flyer), and fill the colors with anything. Otherwise set it true and pick colors that are actually on the flyer, as #RRGGBB:
- background: the darkest dominant color, deep enough for white text (near-black versions of the flyer's darks are fine).
- depth: a second dark tone, a little lighter or a different hue than background, for gradients.
- button: the flyer's signature accent, used for the main buttons with white text.
- highlight: a bright accent from the flyer (often metallic gold, neon, or a light tint) for small highlights on the dark background.
- light: a pale tint in the flyer's palette (off-white, champagne, blush...) for light sheets with dark text.
- font: the title typeface closest in feel to the flyer's headline lettering: ${LOOK_FONT_IDS.map((id) => `"${id}" (${LOOK_FONTS[id].label}: ${LOOK_FONTS[id].hint})`).join(", ")}.`;

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

function ticketLink(s: unknown): string {
  const raw = clean(s, 500);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    url.protocol = "https:";
    return url.hostname.includes(".") ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Only well-formed dates and times get through to the editor. */
export function cleanDates(raw: unknown): ImportedDate[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).flatMap((d): ImportedDate[] => {
    if (!d || typeof d !== "object") return [];
    const r = d as Record<string, unknown>;
    const date = clean(r.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return [];
    const time = clean(r.time, 5);
    return [{
      name: clean(r.name, 80),
      date,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "",
      venue: clean(r.venue, 80),
      price: clean(r.price, 30),
      ticketUrl: ticketLink(r.ticketUrl),
    }];
  });
}

export type FlyerInput =
  | { kind: "image"; mediaType: string; data: string }
  | { kind: "pdf"; data: string }
  | { kind: "text"; text: string };

export async function readFlyer(input: FlyerInput, eventName: string, today: string): Promise<ImportResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const env = process.env.VERCEL_ENV;
    const where = env ? ` for ${env === "production" ? "Production" : env === "preview" ? "Preview" : env}` : "";
    return { problem: `Flyer import isn't set up on this deployment. Add ANTHROPIC_API_KEY in Vercel${where}, then redeploy.` };
  }
  const client = new Anthropic();
  const source: Anthropic.Beta.BetaContentBlockParam =
    input.kind === "image"
      ? { type: "image", source: { type: "base64", media_type: input.mediaType as "image/jpeg", data: input.data } }
      : input.kind === "pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.data } }
        : { type: "text", text: `<event_details>\n${input.text}\n</event_details>` };

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // If the request is declined, Anthropic retries it on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: instructions(today, eventName),
      messages: [{ role: "user", content: [source, { type: "text", text: "Pull out the event dates and the flyer's look." }] }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });
  } catch (e) {
    console.error("[flyer import]", e);
    if (e instanceof Anthropic.AuthenticationError) {
      return { problem: "The Claude API key was refused. Check ANTHROPIC_API_KEY in Vercel." };
    }
    if (e instanceof Anthropic.RateLimitError) return { problem: "Too many imports at once. Wait a minute and try again." };
    return { problem: "Couldn't read the flyer just now. Try again, or add the date by hand." };
  }

  if (response.stop_reason === "refusal") {
    return { problem: "This flyer couldn't be read. Add the date by hand." };
  }
  if (response.stop_reason === "max_tokens") {
    return { problem: "That was too much to read at once. Try a single flyer." };
  }
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let parsed: { dates?: unknown; note?: unknown; look?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    return { problem: "Couldn't read the flyer just now. Try again, or add the date by hand." };
  }
  // Only a picture of a flyer has a look; text has none to read.
  const look = input.kind !== "text" ? lookOf(parsed.look) : null;
  return { dates: cleanDates(parsed.dates), note: clean(parsed.note, 200), ...(look ? { look } : {}) };
}

/** The model's colors in the funnel's theme roles, made readable. */
function lookOf(raw: unknown): Look | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.found !== true) return null;
  return parseLook({
    colors: {
      "--deep-navy": r.background,
      "--royal-blue": r.depth,
      "--teal-accent": r.button,
      "--sky-accent": r.highlight,
      "--soft-gray": r.light,
    },
    font: r.font,
  });
}
