// Reads an event flyer (a photo, a PDF, or pasted text) with Claude and
// returns the event dates it finds. Nothing is saved here: the admin reviews
// each date in the date sheet before it's added.

import Anthropic from "@anthropic-ai/sdk";

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

export type ImportResult = { dates: ImportedDate[]; note: string } | { problem: string };

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const PDF_TYPE = "application/pdf";

const nullableString = { type: ["string", "null"] };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dates", "note"],
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

Only include what the flyer actually says; never invent details. If you can't find any event date, return an empty list and use note to say what's missing in one short sentence, written to the event organizer. Otherwise note is null, or one short sentence about anything they should double-check (e.g. a time that was hard to read).`;

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
      messages: [{ role: "user", content: [source, { type: "text", text: "Pull out the event dates." }] }],
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
  let parsed: { dates?: unknown; note?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    return { problem: "Couldn't read the flyer just now. Try again, or add the date by hand." };
  }
  return { dates: cleanDates(parsed.dates), note: clean(parsed.note, 200) };
}
