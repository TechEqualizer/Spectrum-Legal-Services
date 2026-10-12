// Drafts a whole funnel from an event flyer with Claude: four things. The
// opening scene (its words and looping background), then three core reels,
// each built on one proven reason people buy a ticket: The Night (desire and
// self-image), Your People (belonging and real social proof) and Last Call
// (fear of missing out, from true deadlines only). Each comes with a
// ready-to-paste video prompt, and its own cut from the flyer that plays
// until that video exists (docs/plans/08-flyer-cuts.md). Nothing is saved
// here: the admin reviews the draft before it goes into the editor.

import Anthropic from "@anthropic-ai/sdk";
import { flyerBlock, missingKeyProblem, type FlyerInput } from "@/lib/server/flyer-import";
import { REEL_ORDER, REEL_ROLES, type DraftReel, type FunnelDraft, type ReelRole } from "@/lib/funnel-draft";
import { base64ImageSize } from "@/lib/image-size";
import { OPENING_MOODS, OPENING_MOOD_IDS, OPENING_MOVES, boxFromPixels, parseCut, parseOpening, type OpeningMood, type OpeningRecipe } from "@/lib/opening";
import { lintRecipes, type Facts, type FlyerMap } from "@/lib/recipe-lint";
import { SCREEN_LIMITS } from "@/lib/publication";

const str = (description: string) => ({ type: "string", description });
type Px = { w: number; h: number };
/**
 * A box in the flyer's own pixels. Claude places boxes far better in pixels
 * than in fractions (platform.claude.com/docs/en/build-with-claude/vision-coordinates);
 * the code turns them into fractions (boxFromPixels).
 */
const box = (description: string, px: Px) => ({
  type: "object",
  additionalProperties: false,
  required: ["x1", "y1", "x2", "y2"],
  description: `${description}. In pixels on the ${px.w}x${px.h} flyer image: x1, y1 its top-left corner, x2, y2 its bottom-right corner (x from the left edge, y down from the top).`,
  properties: { x1: { type: "integer" }, y1: { type: "integer" }, x2: { type: "integer" }, y2: { type: "integer" } },
});
const focus = (px: Px) => box("The face, or the exact point of the subject this shot is about: a tight box around it", px);

/** What's on the flyer, mapped before any shot is chosen: its subjects, and every block of its printed words. */
const mapSchema = (px: Px) => ({
  type: "object",
  additionalProperties: false,
  required: ["subjects", "lettering"],
  properties: {
    subjects: {
      type: "array",
      description: "Every face, figure, prop or scene a fan would recognize, most striking first",
      items: { type: "object", additionalProperties: false, required: ["what", "box"], properties: { what: str("What it is, in a few words"), box: box("Tightly around it", px) } },
    },
    lettering: { type: "array", description: "Every block of printed words: titles, dates, venue, credits, lists, logos, badges", items: box("Tightly around the block", px) },
  },
});

/** The opening scene: its mood, its shots on the flyer with their words, and the hold. */
const openingSchema = (px: Px) => ({
  type: "object",
  additionalProperties: false,
  required: ["mood", "beats", "hold"],
  properties: {
    mood: { type: "string", enum: OPENING_MOOD_IDS, description: "The kind of event this is, which sets how the opening is cut" },
    beats: {
      type: "array",
      description: "3 shots on the flyer's own artwork (4 only for four distinct striking subjects), in the order they play",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["box", "focus", "move", "seconds", "text"],
        properties: {
          box: box("The part of the flyer this shot shows: a face, a figure, a striking detail, clear of the flyer's lettering, at least a third of the flyer's width, and close to a tall phone shape", px),
          focus: focus(px),
          move: { type: "string", enum: [...OPENING_MOVES], description: "The camera's move through the shot" },
          seconds: { type: "number", description: "1.5 to 2.2" },
          text: {
            type: "object",
            additionalProperties: false,
            required: ["lines", "at", "size"],
            properties: {
              lines: { type: "array", items: str("One short line, under 24 characters"), description: "0 to 3 lines, five words at most in all; empty for a shot with no words" },
              at: { type: "string", enum: ["top", "middle", "bottom"], description: "Where the shot has room for words, away from faces" },
              size: { type: "string", enum: ["eyebrow", "big"], description: "eyebrow: a small presenter credit; big: a selling line" },
            },
          },
        },
      },
    },
    hold: box("The calm shot the scene settles on under the page's title: the flyer's strongest figure or image, with room below it", px),
  },
});
/** A reel's cut: shots on the flyer with that reel's words, in the opening's mood (it ends on the whole flyer). */
const cutSchema = (px: Px) => ({
  type: "object",
  additionalProperties: false,
  required: ["beats"],
  properties: {
    beats: {
      type: "array",
      description: "3 shots on the flyer's artwork (2 to 4), in the order they play",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["box", "focus", "move", "seconds", "text"],
        properties: {
          box: box("The part of the flyer this shot shows: a subject a fan recognizes, clear of the flyer's lettering, at least a third of the flyer's width, close to a tall phone shape", px),
          focus: focus(px),
          move: { type: "string", enum: [...OPENING_MOVES], description: "The camera's move through the shot" },
          seconds: { type: "number", description: "1.2 to 2.2: the_night and your_people 1.6 to 2.2, last_call 1.2 to 1.6" },
          text: {
            type: "object",
            additionalProperties: false,
            required: ["lines", "at", "size"],
            properties: {
              lines: { type: "array", items: str("One short line, under 24 characters"), description: "1 to 3 lines, five words at most in all" },
              at: { type: "string", enum: ["top", "middle"], description: "Where the shot has room for words, away from faces (the reel's own title and Tickets button sit at the bottom)" },
              size: { type: "string", enum: ["eyebrow", "big"], description: "big for a selling line; eyebrow for a small credit" },
            },
          },
        },
      },
    },
  },
});

/**
 * The whole draft. With the flyer's picture (and its size), Claude maps it
 * first, then cuts the opening and each reel from it; from words or a PDF,
 * there's no picture to cut, so it writes only the words and prompts.
 */
const schemaFor = (px: Px | null) => ({
  type: "object",
  additionalProperties: false,
  required: [...(px ? ["map"] : []), "screen", ...(px ? ["opening"] : []), "styleLock", "avoid", "hero", "reels"],
  properties: {
    ...(px ? { map: mapSchema(px) } : {}),
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
    ...(px ? { opening: openingSchema(px) } : {}),
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
      description: "Exactly three reels, in this order: the_night, your_people, last_call",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "title", "summary", "hook", "captions", "date", "source", "camera", "seconds", "prompt", ...(px ? ["cut"] : [])],
        properties: {
          role: { type: "string", enum: Object.keys(REEL_ROLES) },
          title: str("Reel title, under 60 characters"),
          summary: str("One or two sentences, under 200 characters"),
          hook: str("The first two seconds: the moment that stops the scroll, under 120 characters"),
          captions: { type: "array", items: str("One caption line, under 40 characters"), description: "2 to 4 short caption lines, in order" },
          date: { type: ["string", "null"], description: "YYYY-MM-DD of the date this reel sells, or null" },
          source: { type: "string", enum: ["photo", "flyer_art", "text"] },
          camera: str("Camera move"),
          seconds: { type: "integer" },
          prompt: str("What happens on screen"),
          ...(px ? { cut: cutSchema(px) } : {}),
        },
      },
    },
  },
});

/** How to cut the opening scene from the flyer (in the funnel draft, and on its own from the Design tab). */
const openingBrief = `the first seconds of the link, cut from the flyer itself like a film trailer. First read what kind of event this is, from everything on the flyer (what happens there, the venue, the time of day, the crowd it speaks to, its typography and palette), and pick the mood that fits it; the mood sets the pace, the cuts and what floats in the air, and how the words should sound:
${OPENING_MOOD_IDS.map((m) => `   - ${m}: ${OPENING_MOODS[m].for}. Words: ${OPENING_MOODS[m].words}.`).join("\n")}
   A book signing is never electric; a club night is never editorial. Then cut it like a teaser: a hook, a build, the reveal (the whole flyer, added for you), then the page's title and button.
   - Shots: 3 on the flyer's artwork (4 only when it has four distinct striking subjects; never the same subject twice unless closer), each something a fan recognizes at a glance (a face, a figure, the venue, a prop), never a crop of texture or background alone. Each is a box clear of the flyer's printed words, at least a third of the flyer's width, and close to a tall phone shape.
   - The hook is the first shot: the most striking image on the flyer (a face or a figure when it has one) with its most enticing line, two to four words, set big. That line opens the scene alone, huge on black with the first shot showing through its letters, so make it the words that most make someone want to be there. Never open on the presenter credit or the date; a credit, if you use one, is an eyebrow on the second shot.
   - Build: each shot closer or more intense than the last; the lines go from the promise of the night toward when and where, so the date or place, if used, comes last, right before the reveal.
   - Moves: end each shot framed on its subject. Push in on a face, tilt up a standing figure, pan across a crowd or skyline the way it faces; never the same move twice in a row.
   - Words: one idea per shot, five words at most, copied from the flyer's own words (its taglines, the night's promise, the presenter credit); never invent words, names, dates or claims the flyer doesn't print. Put them where the shot is dark and empty enough for white type, never over a face.
   - The hold: the calm shot the scene settles on under the page's title, with room at the bottom.`;

/**
 * How to cut each reel from the flyer (.claude/skills/flyer-cuts). Until the
 * organizer has video, these are the reels: the flyer, directed three more
 * ways, each selling one reason to buy.
 */
const cutBrief = `each reel's cut: the reel itself until the organizer adds a video, cut from the flyer with the same camera as the opening and in the opening's mood (it's played for you: the shots, then the whole flyer, then the reel's own title and Tickets button over it). Someone who gave you only a flyer should feel they got three trailers. Four cuts come from one flyer, so make each one feel different by its framing, its rhythm and its words:
   - the_night: closer than the opening. Its first shot is the most desirable detail on the flyer (a face, eyes behind a mask, the outfit, the light) with a big line of two to four words, which opens the reel alone, huge on black, so make it the line that most makes someone want to be there. Then push in, tighter each shot. Lines sell who they get to be, in second person and present tense ("You, in gold.").
   - your_people: wider than the others, and unhurried. Pan across the crowd, the group, the dancers or the room, the way they face, and pull back to show more of the scene; no hook. Lines answer "is this for someone like me?" with what the flyer says: who it's for, the dress code, the age, the music, the vibe, an invitation to bring their people.
   - last_call: brisk; no hook, it opens straight on its first fact. Shorter shots, a punch on each one, and one true fact a shot, read from the flyer or the dates you were given: the date, the place, the price, the time doors open, a deadline, few tickets left only when you were told so. The date comes last, right before the whole flyer. If the flyer gives no facts beyond the date, use the date and one line on why not to wait for it.
   For all three: 3 shots (2 when the flyer has little artwork, 4 only for four distinct subjects), each on a subject a fan recognizes, clear of the flyer's lettering, at least a third of the flyer's width, close to a tall phone shape. Don't repeat a shot from the opening or another reel unless it's closer; never the same move twice in a row. One line per shot, five words at most, set where the shot is dark and empty (top or middle, never over a face: the bottom belongs to the reel's title and Tickets button). Lines can be your own words in the reel's voice, but every fact in them (names, dates, times, places, prices, performers, dress code, age, how many are left) must be on the flyer or in the dates above. Never invent quotes, reviews, numbers, "selling fast" or "sold out".`;

/** How to see and measure the flyer before cutting it: a map, then every box in its pixels. */
const pixelBrief = (px: Px) =>
  `The flyer image is ${px.w}x${px.h} pixels. Before choosing any shot, map it (map): every subject a fan would recognize (faces, figures, props, the venue) and every block of its printed words. Then give every box in pixels on this image, and keep every shot's box clear of the lettering you mapped. A shot's box is at least ${Math.round(px.w / 3)} pixels wide and ${Math.round(px.h / 5)} pixels tall, and close to a tall phone shape (about 9 wide by 16 tall). Each shot also gives its focus: a tight box on the face or point it's about, which the camera frames and the words stay off.`;

const instructions = (ctx: DraftContext, px: Px | null) => `You are a creative director for nightlife and live events. From an event flyer, you plan the short vertical video funnel an organizer shares in their Instagram bio: an opening scene with a looping background video, then three reels that play one after another, each ending on a Tickets button. Your job is to make people want to be there and buy a ticket.

Today is ${ctx.today}. The organizer's brand is "${ctx.brand}". Dates already known: ${ctx.dates.length ? ctx.dates.map((d) => [d.date, d.time && `at ${d.time}`, d.name, d.venue, d.price, d.status === "few_left" ? "few tickets left" : d.status === "sold_out" ? "sold out" : ""].filter(Boolean).join(", ")).join("; ") : "none yet"}.${ctx.photos ? " The organizer will also use their own event photos." : ""}

Write ${px ? "five" : "four"} things:
${px ? `0. map, then opening. ${pixelBrief(px)}
   The opening: ${openingBrief}
` : ""}1. screen and hero: the opening scene. A short, confident title (the event's own name works), a tagline that sells the feeling, a main-button label inviting people to watch (e.g. "Sneak peek inside"), a heading above the date circles (e.g. "Which night?"), and the looping background clip: pure atmosphere that sets the world of the night.
2. reels: exactly three, in this order, each built on one proven reason people buy a ticket. Each answers one question the viewer has before buying:
   - the_night ("Will this be amazing?"): desire and self-image. Sell who the viewer gets to BE that night, not the venue: the arrival, the peak moment, the look, the feeling, in second person and present tense ("You, in gold."). Cinematic and aspirational.
   - your_people ("Is this for someone like me?"): belonging and social proof. People like the viewer go and love it: friends getting ready, arriving together, the crowd, the photo moment. Feels real and phone-shot, not polished. Answer the quiet doubts the flyer can answer (dress code, age, the vibe). Never invent testimonials, quotes, reviews, attendance numbers or named guests; prefer the organizer's real photos and footage (source: photo).
   - last_call ("Why buy now?"): fear of missing out. What waiting costs, using only true facts: the event date, a price, a deadline or sales cutoff, or limited tickets, and only when the flyer or the known dates say so. If none are stated, the urgency is simply the date getting close. Short, direct, and it ends on the reason to buy now.
   For each reel: a short, punchy title true to the flyer; a summary of what the viewer gets; the hook (the first two seconds that stop the scroll); 2 to 4 short caption lines to add when editing; date set to the date it sells when there is one${px ? `; and its cut: ${cutBrief}` : "."}
- For every clip (hero and each reel), a video prompt for an AI video tool, vertical 9:16: a camera move (slow and elegant: push in, dolly out, arc, crane, rack focus), its length in seconds (5 to 8; the hero loops seamlessly, 6 to 8), and what happens on screen in vivid, concrete, filmable detail: people, wardrobe, light, motion, and the final frame. Set source to photo when the organizer's own event photo should be the starting image (people and venue shots), flyer_art when the flyer's own imagery is the best start, and text when it should be generated from words alone.
- styleLock: one paragraph of shared look so every clip matches, drawn from the flyer's palette, lighting and era (lens, light, colors, grain, frame rate, 9:16).
- avoid: what every clip must avoid. Always include on-screen text, letters, logos and watermarks (the page adds its own words), warped hands, distorted or melting faces, flicker and sudden cuts.

Never put words, dates or prices inside the videos. Keep the lower third of every frame darker so the page's title and buttons stay readable. Don't invent facts the flyer doesn't state (performers, prices, venue details).`;

export type DraftContext = {
  brand: string;
  today: string;
  /** Known dates, with the time, venue, price and how many are left when known (Last Call's true facts, and what its lines are checked against). */
  dates: { date: string; time?: string; name: string; venue?: string; price?: string; status?: "on_sale" | "few_left" | "sold_out" }[];
  photos: boolean;
};

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

type Turn = Anthropic.Beta.BetaMessageParam;

/** One structured call to Claude: the JSON it wrote (and its text, to answer), or what went wrong in words. */
async function ask(system: string, messages: Turn[], schema: { [key: string]: unknown }, maxTokens: number, label: string, failed: string): Promise<{ raw: Record<string, unknown>; text: string } | { problem: string }> {
  const client = new Anthropic();
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: maxTokens,
      // If the request is declined, Anthropic retries it on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages,
      output_config: { format: { type: "json_schema", schema } },
    });
  } catch (e) {
    console.error(`[${label}]`, e);
    if (e instanceof Anthropic.AuthenticationError) return { problem: "The Claude API key was refused. Check ANTHROPIC_API_KEY in Vercel." };
    if (e instanceof Anthropic.RateLimitError) return { problem: "Too many requests at once. Wait a minute and try again." };
    return { problem: failed };
  }
  if (response.stop_reason === "refusal") return { problem: "refusal" };
  if (response.stop_reason === "max_tokens") return { problem: "The draft came out too long. Try again." };
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    return { raw: JSON.parse(text), text };
  } catch {
    return { problem: failed };
  }
}

/** The facts a cut's lines may state: the known dates' days, times, prices and how many are left. */
const factsOf = (ctx: DraftContext): Facts => ({
  dates: ctx.dates.map((d) => d.date),
  times: ctx.dates.flatMap((d) => (d.time ? [d.time] : [])),
  prices: ctx.dates.flatMap((d) => (d.price ? [d.price] : [])),
  statuses: ctx.dates.flatMap((d) => (d.status ? [d.status] : [])),
});

/** Every rule a drafted opening and its cuts break, in words for Claude to fix. */
export function draftProblems(raw: Record<string, unknown>, draft: FunnelDraft, px: Px, facts?: Facts): string[] {
  return [
    ...longLines(raw),
    ...lintRecipes({
      opening: draft.opening,
      cuts: draft.reels.flatMap((r) => (r.cut ? [{ role: r.role, cut: r.cut }] : [])),
      map: mapFrom(raw.map, px),
      facts,
    }),
  ];
}

/** The answer to a draft that broke the rules: what to fix, and to send it all again. */
const fixTurn = (problems: string[]): Turn => ({
  role: "user",
  content: `Your plan breaks these rules:\n- ${problems.join("\n- ")}\nFix every one, keep everything else that works, and return the whole plan again.`,
});

export async function draftFunnel(input: FlyerInput, ctx: DraftContext): Promise<FunnelDraft | { problem: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { problem: missingKeyProblem() };
  // The flyer's own size, so Claude can place every shot in its pixels.
  const px = input.kind === "image" ? base64ImageSize(input.data) : null;
  const system = instructions(ctx, px);
  const failed = "Couldn't draft the funnel just now. Try again.";
  const turns: Turn[] = [{ role: "user", content: [flyerBlock(input), { type: "text", text: "Plan the funnel for this event." }] }];
  const first = await ask(system, turns, schemaFor(px), 16000, "funnel draft", failed);
  if ("problem" in first) return { problem: first.problem === "refusal" ? "This flyer couldn't be used for a draft. Build the funnel by hand." : first.problem };
  const draft = cleanDraft(first.raw, px ?? undefined);
  if (!px || "problem" in draft) return draft;
  // Checked against the rules in code; anything broken goes back once to be fixed.
  const problems = draftProblems(first.raw, draft, px, factsOf(ctx));
  if (!problems.length) return draft;
  console.info("[funnel draft] fixing:", problems);
  const second = await ask(system, [...turns, { role: "assistant", content: first.text }, fixTurn(problems)], schemaFor(px), 16000, "funnel draft fix", failed);
  if ("problem" in second) return draft;
  const fixed = cleanDraft(second.raw, px);
  return "problem" in fixed ? draft : fixed;
}

/**
 * Cuts just the opening scene from a flyer, for an event that already has its
 * funnel (the Design tab). The organizer can fix the mood, and ask for a cut
 * unlike the one they have. Checked like every other recipe.
 */
export async function draftOpening(input: FlyerInput, ask_: { mood?: OpeningMood; unlike?: OpeningRecipe } = {}): Promise<{ opening: OpeningRecipe } | { problem: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { problem: missingKeyProblem() };
  const px = input.kind === "image" ? base64ImageSize(input.data) : null;
  if (!px) return { problem: "Use a photo of the flyer (JPEG or PNG) to make an opening." };
  const asks = [
    ask_.mood && `The organizer chose the mood: ${ask_.mood}. Cut it that way.`,
    ask_.unlike && `They want a different cut from the one they have, so choose other shots, another order or other lines where the flyer allows: ${JSON.stringify(ask_.unlike)}`,
  ].filter(Boolean);
  const system = `You are a creative director for nightlife and live events. From an event flyer, you cut the opening of the link an organizer shares in their Instagram bio. ${pixelBrief(px)}\n\nThe opening: ${openingBrief}${asks.length ? `\n\n${asks.join("\n")}` : ""}`;
  const schema = { type: "object", additionalProperties: false, required: ["map", "opening"], properties: { map: mapSchema(px), opening: openingSchema(px) } };
  const failed = "Couldn't make the opening just now. Try again.";
  const turns: Turn[] = [{ role: "user", content: [flyerBlock(input), { type: "text", text: "Cut the opening for this event." }] }];
  const openingOf = (raw: Record<string, unknown>) => parseOpening(inPixels(raw.opening, px, true));
  const first = await ask(system, turns, schema, 6000, "opening draft", failed);
  if ("problem" in first) return { problem: first.problem === "refusal" ? "This flyer couldn't be used for an opening." : first.problem };
  let opening = openingOf(first.raw);
  if (!opening) return { problem: "Couldn't find shots on this flyer. Try another photo of it." };
  const problems = [...longLines(first.raw), ...lintRecipes({ opening, cuts: [], map: mapFrom(first.raw.map, px) })];
  if (problems.length) {
    console.info("[opening draft] fixing:", problems);
    const second = await ask(system, [...turns, { role: "assistant", content: first.text }, fixTurn(problems)], schema, 6000, "opening draft fix", failed);
    const fixed = "problem" in second ? null : openingOf(second.raw);
    if (fixed) opening = fixed;
  }
  // The organizer's mood stands, whatever came back.
  return { opening: ask_.mood ? { ...opening, mood: ask_.mood } : opening };
}

/** A recipe as Claude wrote it in pixels, with its boxes as fractions of the flyer (the hold too, for an opening). */
function inPixels(v: unknown, px: Px, withHold: boolean): unknown {
  if (!v || typeof v !== "object") return v;
  const r = v as Record<string, unknown>;
  const beats = Array.isArray(r.beats)
    ? r.beats.map((b) => {
        if (!b || typeof b !== "object") return b;
        const x = b as Record<string, unknown>;
        const f = boxFromPixels(x.focus, px);
        return { ...x, box: boxFromPixels(x.box, px), ...(f ? { focus: f } : { focus: undefined }) };
      })
    : r.beats;
  return { ...r, beats, ...(withHold ? { hold: boxFromPixels(r.hold, px) } : {}) };
}

/** The flyer map Claude made, as fractions. */
function mapFrom(v: unknown, px: Px): FlyerMap {
  const m = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const subjects = (Array.isArray(m.subjects) ? m.subjects : []).flatMap((s) => {
    const x = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const b = boxFromPixels(x.box, px);
    return b ? [{ what: clean(x.what, 60), box: b }] : [];
  });
  const lettering = (Array.isArray(m.lettering) ? m.lettering : []).flatMap((l) => boxFromPixels(l, px) ?? []);
  return { subjects, lettering };
}

/** Lines too long to show, which would otherwise be dropped without a word. */
function longLines(raw: Record<string, unknown>): string[] {
  const recipes: [string, unknown][] = [
    ["the opening", raw.opening],
    ...(Array.isArray(raw.reels) ? raw.reels : []).map((r): [string, unknown] => [`the ${(r as { role?: string })?.role ?? "reel"} cut`, (r as { cut?: unknown })?.cut]),
  ];
  const out: string[] = [];
  for (const [name, r] of recipes) {
    const beats = r && typeof r === "object" && Array.isArray((r as { beats?: unknown }).beats) ? ((r as { beats: unknown[] }).beats) : [];
    beats.forEach((b, i) => {
      const t = (b as { text?: { lines?: unknown; size?: unknown } })?.text;
      const max = t?.size === "eyebrow" ? 34 : 26;
      for (const l of Array.isArray(t?.lines) ? t.lines : []) if (typeof l === "string" && l.trim().length > max) out.push(`${name}, shot ${i + 1}: "${l}" is longer than ${max} characters; shorten it.`);
    });
  }
  return out;
}

/** Only well-formed, in-limit pieces get through to the editor. */
export function cleanDraft(raw: Record<string, unknown>, px?: Px): FunnelDraft | { problem: string } {
  const screen = (raw.screen ?? {}) as Record<string, unknown>;
  const styleLock = clean(raw.styleLock, 800);
  const avoid = clean(raw.avoid, 400);
  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  // One reel per core role, always in REEL_ORDER, whatever order they came in.
  const byRole = new Map<ReelRole, DraftReel>();
  const cuts = new Map<ReelRole, unknown>();
  for (const r of Array.isArray(raw.reels) ? raw.reels : []) {
    if (!r || typeof r !== "object") continue;
    const x = r as Record<string, unknown>;
    const title = clean(x.title, 80);
    if (!title || typeof x.role !== "string" || !(x.role in REEL_ROLES) || byRole.has(x.role as ReelRole)) continue;
    const date = typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : undefined;
    const source = x.source === "photo" || x.source === "flyer_art" ? x.source : "text";
    const captions = (Array.isArray(x.captions) ? x.captions : []).map((c) => clean(c, 60)).filter(Boolean).slice(0, 4);
    cuts.set(x.role as ReelRole, px ? inPixels(x.cut, px, false) : x.cut);
    byRole.set(x.role as ReelRole, {
      role: x.role as ReelRole,
      title,
      summary: clean(x.summary, 280),
      hook: clean(x.hook, 160),
      captions,
      ...(date ? { date } : {}),
      source,
      videoPrompt: [
        clipPrompt(x.camera, x.seconds, x.prompt, styleLock, avoid),
        captions.length && `Captions to add when editing (not in the video): ${captions.map((c) => `"${c}"`).join(" / ")}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }
  const opening = parseOpening(px ? inPixels(raw.opening, px, true) : raw.opening);
  const mood = opening?.mood ?? OPENING_MOOD_IDS.find((m) => m === (raw.opening as Record<string, unknown> | undefined)?.mood);
  // Each cut plays in the opening's mood; one that doesn't check out leaves the reel on the still flyer.
  const reels = REEL_ORDER.flatMap((role) => {
    const reel = byRole.get(role);
    // Only The Night opens on its hook; the others open straight on their first shot.
    const cut = reel && parseCut(cuts.get(role), mood, role === "the_night");
    return reel ? [cut ? { ...reel, cut } : reel] : [];
  });
  if (!reels.length) return { problem: "Couldn't draft reels from this flyer. Try a clearer photo." };
  const fit = (s: unknown, key: keyof typeof SCREEN_LIMITS) => clean(s, SCREEN_LIMITS[key]);
  return {
    screen: { title: fit(screen.title, "title"), tagline: fit(screen.tagline, "tagline"), watchLabel: fit(screen.watchLabel, "watchLabel"), heading: fit(screen.heading, "heading") },
    heroPrompt: clipPrompt(hero.camera, hero.seconds, hero.prompt, styleLock, avoid, true),
    reels,
    // Played from the flyer itself; a draft without a usable one keeps the still flyer.
    ...(opening ? { opening } : {}),
  };
}
