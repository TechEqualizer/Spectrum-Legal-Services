// Drafts a whole funnel from an event flyer with Claude: the opening
// screen's words, a handful of reels in selling order, and a ready-to-paste
// video prompt for the opening scene and each reel. Nothing is saved here:
// the admin reviews the draft before it goes into the editor.

import Anthropic from "@anthropic-ai/sdk";
import { flyerBlock, missingKeyProblem, type FlyerInput } from "@/lib/server/flyer-import";
import { REEL_ROLES, type DraftReel, type FunnelDraft, type ReelRole } from "@/lib/funnel-draft";
import { SCREEN_LIMITS } from "@/lib/publication";

const str = (description: string) => ({ type: "string", description });
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["screen", "styleLock", "avoid", "hero", "reels"],
  properties: {
    screen: {
      type: "object",
      additionalProperties: false,
      required: ["title", "tagline", "watchLabel", "heading"],
      properties: {
        title: str(`The opening screen's big title, under ${SCREEN_LIMITS.title} characters`),
        tagline: str(`One line under it, under ${SCREEN_LIMITS.tagline} characters`),
        watchLabel: str(`The main button into the reels, under ${SCREEN_LIMITS.watchLabel} characters`),
        heading: str(`Small heading above the date circles, under ${SCREEN_LIMITS.heading} characters`),
      },
    },
    styleLock: str("One paragraph of shared visual style for every clip"),
    avoid: str("Comma-separated things every clip must avoid"),
    hero: {
      type: "object",
      additionalProperties: false,
      required: ["camera", "seconds", "prompt"],
      properties: { camera: str("Camera move"), seconds: { type: "integer" }, prompt: str("What happens on screen") },
    },
    reels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "title", "summary", "date", "source", "camera", "seconds", "prompt"],
        properties: {
          role: { type: "string", enum: Object.keys(REEL_ROLES) },
          title: str("Reel title, under 60 characters"),
          summary: str("One or two sentences, under 200 characters"),
          date: { type: ["string", "null"], description: "YYYY-MM-DD of the date this reel sells, or null" },
          source: { type: "string", enum: ["photo", "flyer_art", "text"] },
          camera: str("Camera move"),
          seconds: { type: "integer" },
          prompt: str("What happens on screen"),
        },
      },
    },
  },
};

const instructions = (ctx: DraftContext) => `You are a creative director for nightlife and live events. From an event flyer, you plan the short vertical video funnel an organizer shares in their Instagram bio: an opening screen with a looping background video, then 4 to 6 reels that play one after another and end on a Tickets button. Your job is to make people want to be there and buy a ticket.

Today is ${ctx.today}. The organizer's brand is "${ctx.brand}". Dates already known: ${ctx.dates.length ? ctx.dates.map((d) => `${d.date} ${d.name}`).join("; ") : "none yet"}.${ctx.photos ? " The organizer will also use their own event photos." : ""}

Write:
- screen: the opening screen's words. A short, confident title (the event's own name works), a tagline that sells the feeling, a main-button label inviting people to watch (e.g. "Sneak peek inside"), and a heading above the date circles (e.g. "Which night?").
- reels, in selling order, each with a role: start with hook (curiosity, eye contact), then spectacle (the main event at its best), belonging (the crowd, people like the viewer), details (what's included: performers, DJ, dress code; only if the flyer lists them), dare (the reason to dress up or go all in), and end with last_call (scarcity, a calm final shot that leaves room for a ticket button). Skip a role the flyer gives no material for. Titles are short, punchy and true to the flyer; summaries say what the viewer gets. Set date to the date a reel sells when there is one.
- For every clip (hero and each reel), a video prompt for an AI video tool, vertical 9:16: a camera move (slow and elegant: push in, dolly out, arc, crane, rack focus), its length in seconds (5 to 8; the hero loops seamlessly, 6 to 8), and what happens on screen in vivid, concrete, filmable detail: people, wardrobe, light, motion, and the final frame. Set source to photo when the organizer's own event photo should be the starting image (people and venue shots), flyer_art when the flyer's own imagery is the best start, and text when it should be generated from words alone.
- styleLock: one paragraph of shared look so every clip matches, drawn from the flyer's palette, lighting and era (lens, light, colors, grain, frame rate, 9:16).
- avoid: what every clip must avoid. Always include on-screen text, letters, logos and watermarks (the page adds its own words), warped hands, distorted or melting faces, flicker and sudden cuts.

Never put words, dates or prices inside the videos. Keep the lower third of every frame darker so the page's title and buttons stay readable. Don't invent facts the flyer doesn't state (performers, prices, venue details).`;

export type DraftContext = { brand: string; today: string; dates: { date: string; name: string }[]; photos: boolean };

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** One clip's prompt, ready to paste: camera and length first, then the scene, the shared look, and what to avoid. */
function clipPrompt(camera: unknown, seconds: unknown, scene: unknown, styleLock: string, avoid: string, loop = false) {
  const s = typeof seconds === "number" ? Math.min(10, Math.max(4, Math.round(seconds))) : 6;
  return [
    `Camera: ${clean(camera, 120) || "slow push in"}. Length: ${s}s, vertical 9:16${loop ? ", seamless loop" : ""}.`,
    clean(scene, 1200),
    styleLock && `Style: ${styleLock}`,
    avoid && `Avoid: ${avoid}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function draftFunnel(input: FlyerInput, ctx: DraftContext): Promise<FunnelDraft | { problem: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { problem: missingKeyProblem() };
  const client = new Anthropic();
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // If the request is declined, Anthropic retries it on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: instructions(ctx),
      messages: [{ role: "user", content: [flyerBlock(input), { type: "text", text: "Plan the funnel for this event." }] }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });
  } catch (e) {
    console.error("[funnel draft]", e);
    if (e instanceof Anthropic.AuthenticationError) return { problem: "The Claude API key was refused. Check ANTHROPIC_API_KEY in Vercel." };
    if (e instanceof Anthropic.RateLimitError) return { problem: "Too many requests at once. Wait a minute and try again." };
    return { problem: "Couldn't draft the funnel just now. Try again." };
  }
  if (response.stop_reason === "refusal") return { problem: "This flyer couldn't be used for a draft. Build the funnel by hand." };
  if (response.stop_reason === "max_tokens") return { problem: "The draft came out too long. Try again." };

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""));
  } catch {
    return { problem: "Couldn't draft the funnel just now. Try again." };
  }
  return cleanDraft(raw);
}

/** Only well-formed, in-limit pieces get through to the editor. */
export function cleanDraft(raw: Record<string, unknown>): FunnelDraft | { problem: string } {
  const screen = (raw.screen ?? {}) as Record<string, unknown>;
  const styleLock = clean(raw.styleLock, 800);
  const avoid = clean(raw.avoid, 400);
  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  const reels = (Array.isArray(raw.reels) ? raw.reels : []).slice(0, 6).flatMap((r): DraftReel[] => {
    if (!r || typeof r !== "object") return [];
    const x = r as Record<string, unknown>;
    const title = clean(x.title, 80);
    if (!title || typeof x.role !== "string" || !(x.role in REEL_ROLES)) return [];
    const date = typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : undefined;
    const source = x.source === "photo" || x.source === "flyer_art" ? x.source : "text";
    return [{
      role: x.role as ReelRole,
      title,
      summary: clean(x.summary, 280),
      ...(date ? { date } : {}),
      source,
      videoPrompt: clipPrompt(x.camera, x.seconds, x.prompt, styleLock, avoid),
    }];
  });
  if (!reels.length) return { problem: "Couldn't draft reels from this flyer. Try a clearer photo." };
  const fit = (s: unknown, key: keyof typeof SCREEN_LIMITS) => clean(s, SCREEN_LIMITS[key]);
  return {
    screen: { title: fit(screen.title, "title"), tagline: fit(screen.tagline, "tagline"), watchLabel: fit(screen.watchLabel, "watchLabel"), heading: fit(screen.heading, "heading") },
    heroPrompt: clipPrompt(hero.camera, hero.seconds, hero.prompt, styleLock, avoid, true),
    reels,
  };
}
