import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_MOOD, OPENING_MOODS, type OpeningRecipe, type OpeningText } from "@/lib/opening";
import { Flyer, Grain, LightLeak, Sparks, camOn, camOnPoster, drift, mix, place, type Cam } from "@/remotion/shots";

/**
 * The opening scene of a link, made from its flyer, cut like a teaser: the
 * hook (the flyer's best line, huge, filled with the flyer itself), then one
 * camera travelling across the flyer from subject to subject with the
 * flyer's own lines set over it, then pulling back to reveal the whole
 * poster, which settles into a calm hold under the link's title and button.
 *
 * The words are typeset by us (crisp, in the look's title font and colors),
 * placed where Claude says the shot has room (never over a face), and every
 * motion is driven by the frame (see .claude/skills/remotion-best-practices
 * and .claude/skills/opening-scene).
 */
export type OpeningSceneProps = {
  src: string;
  /** The flyer's size in pixels, to frame each shot. */
  width: number;
  height: number;
  recipe: OpeningRecipe;
  /** The class of the look's title font (src/components/lookFonts.ts). */
  fontClass: string;
  /** Uppercase the big lines (engraved and condensed fonts read best that way). */
  caps: boolean;
  /** The look's highlight, for the last line, the rules and what floats in the air (any CSS color). */
  accent: string;
  /**
   * The download for Stories: the hold ends on its own card (the title, when,
   * and where to get tickets), since there's no page under it, and lasts
   * this many seconds instead of looping.
   */
  story?: { title: string; when: string; link: string; holdSeconds: number };
  /**
   * A reel's cut (src/lib/opening.ts): no hold under a title. It ends on the
   * whole flyer, crisp, held a moment under the reel's own title and Tickets
   * button, and the reel moves on. Words stay off the bottom, which is theirs.
   */
  reel?: boolean;
};

type Frame = { W: number; H: number; fw: number; fh: number };

const POSTER_SECONDS = 1;
// A reel ends on the whole flyer, long enough to take in and tap Tickets.
const REEL_POSTER_SECONDS = 2.2;
const HOLD_SECONDS = 6;
// Frames the whole flyer takes to fade into the hold, and a punch-in to settle.
const INTO_HOLD = 20;
const SNAP = 7;

/** How this opening is directed (its mood), with recipes from before moods as glamour. */
const directionOf = (recipe: OpeningRecipe) => OPENING_MOODS[recipe.mood ?? DEFAULT_MOOD];
const wordsIn = (t?: OpeningText) => (t ? t.lines.join(" ").split(/\s+/).length : 0);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const glide = Easing.bezier(0.65, 0, 0.35, 1);
const settle = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * A camera operator's sway: a few slow, unrelated waves (in screen pixels, and
 * degrees of roll), so even a resting shot never looks computed. A hand-held
 * camera (shake 4 and up) also has a quicker tremor.
 */
const sway = (f: number, amp: number) => {
  const tremor = amp >= 4 ? 0.35 * Math.sin(f * 0.53) + 0.25 * Math.sin(f * 0.91 + 2) : 0;
  return {
    x: amp * (Math.sin(f * 0.071) + 0.6 * Math.sin(f * 0.173 + 1.3) + tremor),
    y: amp * (Math.sin(f * 0.083 + 2.1) + 0.5 * Math.sin(f * 0.151) + tremor * 0.7),
    roll: amp * 0.05 * Math.sin(f * 0.059 + 0.7),
  };
};

/**
 * When everything happens, in frames: the hook (a first big line of up to
 * four words), each shot (at the mood's pace, a little shorter than the one
 * before, but always long enough to read), the camera's travel between shots
 * (when the mood dissolves rather than cuts), the pull-back to the whole
 * flyer, the flyer itself, and the hold.
 */
function plan(recipe: OpeningRecipe, fps: number, holdSeconds = HOLD_SECONDS, reel = false) {
  const d = directionOf(recipe);
  const sec = (s: number) => Math.round(s * fps);
  const first = recipe.beats[0].text;
  const hook = first?.size === "big" && wordsIn(first) <= 4 ? first : null;
  const hookFor = hook ? sec((d.cut === "punch" ? 0.85 : 1.15) * d.pace) : 0;
  const travel = d.cut === "dissolve" ? sec(0.5 * d.pace) : 0;
  let at = hookFor;
  const stops = recipe.beats.map((b, i) => {
    // The hook's own shot is its payoff: a short look, its line already said.
    const text = i === 0 && hook ? undefined : b.text;
    const words = wordsIn(text);
    const seconds = i === 0 && hook ? 0.7 * d.pace : Math.max(b.seconds * 0.62 * d.pace * (1 - d.build * i), words ? 0.8 + 0.12 * words : 0.7);
    const stop = { from: at, dur: sec(seconds), text };
    at += stop.dur + (i < recipe.beats.length - 1 ? travel : 0);
    return stop;
  });
  const reveal = { from: at, dur: sec((d.cut === "punch" ? 0.9 : 1.2) * d.pace) };
  const poster = { from: reveal.from + reveal.dur, dur: sec(reel ? REEL_POSTER_SECONDS : POSTER_SECONDS) };
  const loopFrom = poster.from + poster.dur;
  const holdStart = loopFrom - INTO_HOLD;
  const hookPlan = hook ? { dur: hookFor, text: hook } : null;
  // A reel's cut has no hold: it's over when the flyer has had its moment.
  if (reel) return { d, hook: hookPlan, stops, travel, reveal, poster, holdStart: loopFrom, loopFrom, total: loopFrom };
  return { d, hook: hookPlan, stops, travel, reveal, poster, holdStart, loopFrom, total: holdStart + sec(holdSeconds) };
}

/**
 * When the hold starts (as the whole flyer begins fading into it: the title
 * can come up then), when its loop starts (the fade done, so a repeat never
 * shows the flyer again), and the frames in all.
 */
export function openingFrames(recipe: OpeningRecipe, fps: number, holdSeconds?: number) {
  const { holdStart, loopFrom, total } = plan(recipe, fps, holdSeconds);
  return { holdStart, loopFrom, total };
}

/** A reel's cut, in frames: it ends on the whole flyer. */
export const cutFrames = (recipe: OpeningRecipe, fps: number) => plan(recipe, fps, undefined, true).total;

export const OpeningScene: React.FC<OpeningSceneProps> = ({ src, width, height, recipe, fontClass, caps, accent, story, reel = false }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const p = plan(recipe, fps, story?.holdSeconds, reel);
  const { d } = p;
  const fr: Frame = { W, H, fw: width, fh: height };
  const shots = p.stops.map((s, i) => ({ ...s, cams: drift(camOn(recipe.beats[i].box, fr), recipe.beats[i].move, fr) }));
  const poster = camOnPoster(fr);
  const punch = d.cut === "punch";
  // A punch-in lands on every shot after a cut (the first too, when the hook flies into it).
  const punched = (i: number) => punch && (i > 0 || Boolean(p.hook));

  /** Where the camera is at frame f, and whether a cut lands there. */
  const camAt = (f: number): { cam: Cam; cut: boolean } => {
    if (f < shots[0].from) return { cam: shots[0].cams[0], cut: false };
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      if (f < s.from + s.dur) {
        const c = mix(s.cams[0], s.cams[1], settle((f - s.from) / s.dur));
        const k = f - s.from;
        if (punched(i) && k < SNAP) c.z += Math.log(1 + 0.16 * (1 - Easing.out(Easing.cubic)(k / SNAP)));
        return { cam: c, cut: punched(i) && k === 0 };
      }
      const next = shots[i + 1];
      if (next && f < next.from) return { cam: mix(s.cams[1], next.cams[0], glide((f - s.from - s.dur) / p.travel)), cut: false };
    }
    const last = shots[shots.length - 1].cams[1];
    if (f < p.poster.from) return { cam: mix(last, poster, glide((f - p.reveal.from) / p.reveal.dur)), cut: false };
    return { cam: { ...poster, z: poster.z + Math.log(1 + 0.03 * Math.min(1, (f - p.poster.from) / p.poster.dur)) }, cut: false };
  };
  const now = camAt(frame);
  const hand = sway(frame, d.shake);
  const s = Math.exp(now.cam.z);
  const held = { ...now.cam, x: now.cam.x - hand.x / (width * s), y: now.cam.y - hand.y / (height * s) };
  // Motion blur from how far the picture moved since the last frame (none across a cut).
  const a = place(now.cam, fr);
  const b = place(camAt(Math.max(0, frame - 1)).cam, fr);
  const speed = now.cut ? 0 : Math.abs(a.left - b.left) + Math.abs(a.top - b.top) + Math.abs(a.width - b.width) * 0.5;
  // A light crosses the print as it lands (not for the quiet moods).
  const shines = d.flash !== null || d.leak;
  const sweep = shines ? (frame - (p.poster.from - 8)) / (0.9 * fps) : -1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Flyer src={src} frame={fr} cam={held} blur={Math.min(5, speed * 0.12)} sweep={sweep} grade={d.grade} bloom={d.bloom} tilt={hand.roll} />
      {shots.map(
        (s, i) =>
          s.text && (
            <Sequence key={i} from={s.from} durationInFrames={s.dur} name={`Words ${i + 1}`}>
              <Words text={reel && s.text.at === "bottom" ? { ...s.text, at: "middle" } : s.text} fontClass={fontClass} caps={caps} accent={accent} type={d.type} left={d.align === "left"} />
            </Sequence>
          ),
      )}
      {shots.map(
        (s, i) =>
          punched(i) && (
            <Sequence key={`flash-${i}`} from={s.from} durationInFrames={4} name={`Flash ${i + 1}`}>
              <Flash color={d.flash === "accent" ? accent : "#fff"} strength={d.flash === "accent" ? 0.75 : 0.5} />
            </Sequence>
          ),
      )}
      {d.leak && (
        // As the camera starts to pull back, so the reveal itself stays clear.
        <Sequence from={p.reveal.from - 6} durationInFrames={16} name="Light leak">
          <AbsoluteFill style={{ opacity: 0.45 }}>
            <LightLeak seed={shots.length} hue={0} />
          </AbsoluteFill>
        </Sequence>
      )}
      {!reel && (
        <Sequence from={p.holdStart} durationInFrames={p.total - p.holdStart} name="Hold">
          <Hold src={src} frame={fr} base={camOn(recipe.hold, fr)} grade={d.grade} />
          {story && <StoryCard story={story} fontClass={fontClass} caps={caps} accent={accent} />}
        </Sequence>
      )}
      {p.hook && (
        <Sequence from={0} durationInFrames={p.hook.dur} name="Hook">
          <Hook text={p.hook.text} src={src} frame={fr} cam={shots[0].cams[0]} fontClass={fontClass} caps={caps} accent={accent} through={punch} solid={Boolean(story)} />
        </Sequence>
      )}
      <Sparks kind={d.sparks} color={accent} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 85% at 50% 45%, transparent 50%, rgba(0,0,0,0.7))" }} />
      <Grain />
      {/* Without a hook, letterbox bars open quickly over the first shot, like the first shot of a film. */}
      {!p.hook && <Bars frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

const Bars: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const open = interpolate(frame, [0.05 * fps, 0.75 * fps], [1, 0], { ...clamp, easing: Easing.bezier(0.6, 0, 0.2, 1) });
  if (open <= 0) return null;
  return (
    <>
      <AbsoluteFill style={{ height: "14%", backgroundColor: "#000", transformOrigin: "top", scale: `1 ${open}` }} />
      <AbsoluteFill style={{ top: "86%", height: "14%", backgroundColor: "#000", transformOrigin: "bottom", scale: `1 ${open}` }} />
    </>
  );
};

const Flash: React.FC<{ color: string; strength: number }> = ({ color, strength }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundColor: color, opacity: interpolate(frame, [0, 3], [strength, 0], clamp), mixBlendMode: "screen" }} />;
};

/**
 * The hook: the flyer's first line, huge, one word a row, each row filling
 * the width, cut out of black with the flyer showing through the letters
 * (CSS text clipping, which the Stories download can draw too), a sheen
 * crossing them. Then the camera flies through the words into the first shot
 * (the cutting moods), or the black falls away around them and they melt
 * into it (the dissolving ones).
 */
const Hook: React.FC<{ text: OpeningText; src: string; frame: Frame; cam: Cam; fontClass: string; caps: boolean; accent: string; through: boolean; solid: boolean }> = ({
  text,
  src,
  frame: fr,
  cam,
  fontClass,
  caps,
  accent,
  through,
  solid,
}) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur, width: W, height: H } = useVideoConfig();
  const rows = (text.lines.length === 1 ? text.lines[0].split(/\s+/).slice(0, 3) : text.lines).map((r) => (caps ? r.toUpperCase() : r));
  // Each row about as wide as the frame (a rough measure of the face's letters), never taller than a fifth of it.
  const em = caps ? 0.78 : 0.6;
  const sizes = rows.map((r) => Math.min(H * 0.2, (W * 0.84) / (r.length * em)));
  const tall = sizes.reduce((sum, s) => sum + s * 0.92, 0);
  const tops = sizes.map((_, i) => (H - tall) / 2 + sizes.slice(0, i).reduce((sum, s) => sum + s * 0.92, 0));
  // The flyer drifts inside the letters, arriving exactly where the first shot starts.
  const at = place(mix({ ...cam, x: cam.x + 0.03, z: cam.z - Math.log(1.12) }, cam, settle(f / dur)), fr);
  // A sheen crosses the words while they hold (in percent across a row).
  const sheen = interpolate(f, [0.25 * dur, 0.85 * dur], [-30, 130], clamp);
  const away = through ? interpolate(f, [dur - 10, dur], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) }) : 0;
  const card = 1 - (through ? interpolate(f, [dur - 5, dur], [0, 1], clamp) : interpolate(f, [dur - 0.45 * fps, dur], [0, 1], clamp));
  const zoom = (1 + 0.06 * (f / dur)) * (1 + 13 * away);
  return (
    <AbsoluteFill style={{ opacity: through ? card : 1 }}>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: card }} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 50%" }}>
        {rows.map((r, i) => {
          const size = sizes[i];
          const top = tops[i] - size * 0.08;
          // The rows come up one after another.
          const p = interpolate(f, [2 + i * 4, 2 + i * 4 + 0.35 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div
              key={i}
              className={fontClass}
              style={{
                position: "absolute",
                left: 0,
                top,
                width: W,
                height: size * 1.08,
                fontSize: size,
                lineHeight: `${size * 1.08}px`,
                textAlign: "center",
                whiteSpace: "nowrap",
                // The Stories video can't fill letters with a picture: there they're solid, edged in the highlight.
                ...(solid
                  ? { color: "#fff" }
                  : {
                      color: "transparent",
                      // The sheen over the flyer, both cut to the letters; the flyer placed as the frame shows it.
                      backgroundImage: `linear-gradient(105deg, transparent ${sheen - 12}%, rgba(255,255,255,${0.55 * card}) ${sheen}%, transparent ${sheen + 12}%), url("${src}")`,
                      backgroundSize: `${W}px ${size * 1.08}px, ${at.width}px ${at.height}px`,
                      backgroundPosition: `0px 0px, ${at.left}px ${at.top - top}px`,
                      backgroundRepeat: "no-repeat",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                    }),
                // An edge in the look's color, so even a dark part of the flyer reads on black.
                WebkitTextStroke: `${Math.max(1.5, size / 90) * card}px ${accent}`,
                filter: `brightness(${1 + 0.6 * card}) contrast(1.1) saturate(1.2)`,
                opacity: p,
                translate: `0px ${(1 - p) * size * 0.25}px`,
              }}
            >
              {r}
            </div>
          );
        })}
      </AbsoluteFill>
      {/* A hairline in the look's color under the words. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: (H + tall) / 2 + 18,
          height: 2,
          width: `${interpolate(f, [0.3 * fps, 0.8 * fps], [0, 22], clamp)}%`,
          translate: "-50% 0",
          backgroundColor: accent,
          opacity: card * (1 - away),
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The Stories download's last seconds: the event's title, when, and where to
 * get tickets, kept clear of Instagram's own bars at the top and bottom.
 */
const StoryCard: React.FC<{ story: { title: string; when: string; link: string }; fontClass: string; caps: boolean; accent: string }> = ({ story, fontClass, caps, accent }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const up = (delay: number) => interpolate(f, [INTO_HOLD + delay * fps, INTO_HOLD + (delay + 0.5) * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const size = Math.min(W * 0.13, (W * 0.84) / Math.max(6, Math.min(story.title.length, 18) * (caps ? 0.62 : 0.5)));
  return (
    <div style={{ position: "absolute", left: W * 0.08, right: W * 0.08, bottom: H * 0.2, color: "#fff" }}>
      <div className={fontClass} style={{ fontSize: size, lineHeight: 1, textTransform: caps ? "uppercase" : "none", opacity: up(0), translate: `0px ${(1 - up(0)) * 24}px`, textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}>
        {story.title}
      </div>
      <div style={{ marginTop: W * 0.03, fontFamily: "Montserrat, system-ui, sans-serif", fontWeight: 600, fontSize: W * 0.038, opacity: up(0.25) * 0.9 }}>{story.when}</div>
      <div
        style={{
          marginTop: W * 0.05,
          display: "inline-block",
          padding: `${W * 0.018}px ${W * 0.04}px`,
          borderRadius: 999,
          border: `3px solid ${accent}`,
          fontFamily: "Montserrat, system-ui, sans-serif",
          fontWeight: 700,
          fontSize: W * 0.034,
          letterSpacing: "0.02em",
          opacity: up(0.5),
        }}
      >
        Tickets: {story.link}
      </div>
    </div>
  );
};

/**
 * A shot's lines over the moving flyer, in the mood's hand: slammed in a word
 * at a time (electric), tracking in from wide (glamour), rising out of a mask
 * (editorial, sunlit) or surfacing softly (soulful). Gone just before the
 * shot ends, so the next line never lands on top of it.
 */
const Words: React.FC<{ text: OpeningText; fontClass: string; caps: boolean; accent: string; type: "slam" | "track" | "rise" | "soft"; left: boolean }> = ({ text, fontClass, caps, accent, type, left }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur, width: W } = useVideoConfig();
  const eyebrow = text.size === "eyebrow";
  const gone = dur - 3;
  const out = interpolate(frame, [gone - 0.25 * fps, gone], [0, 1], clamp);
  const where = { top: { top: "13%" }, middle: { top: "40%" }, bottom: { bottom: "16%" } }[text.at];
  const lines = text.lines;
  // One size for the lines, as big as the longest allows.
  const room = W - 2 * 48;
  const size = eyebrow ? 26 : Math.min(type === "slam" ? 112 : 96, ...lines.map((l) => room / (l.length * (caps ? 0.74 : 0.56))));
  // Electric's words land one at a time, across the lines.
  const firstWord = lines.map((_, i) => lines.slice(0, i).reduce((n, l) => n + l.split(/\s+/).length, 0));
  return (
    <>
      {/* A soft scrim where the words sit, so they read over any artwork. */}
      <AbsoluteFill
        style={{
          background:
            text.at === "top"
              ? "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 42%)"
              : text.at === "bottom"
                ? "linear-gradient(to top, rgba(0,0,0,0.7), transparent 48%)"
                : "radial-gradient(90% 30% at 50% 47%, rgba(0,0,0,0.5), transparent)",
        }}
      />
      <div style={{ position: "absolute", left: 48, right: 48, ...where, textAlign: left ? "left" : "center", opacity: 1 - out, filter: `blur(${out * 10}px)` }}>
        {left && !eyebrow && <div style={{ height: 2, marginBottom: 18, width: `${interpolate(frame, [0, 0.5 * fps], [0, 18], clamp)}%`, backgroundColor: accent }} />}
        {lines.map((line, i) => {
          const last = i === lines.length - 1 && lines.length > 1;
          const base: React.CSSProperties = {
            color: last ? accent : "#fff",
            fontFamily: eyebrow ? "Montserrat, system-ui, sans-serif" : undefined,
            fontWeight: eyebrow ? 700 : undefined,
            fontSize: size,
            lineHeight: eyebrow ? 1.5 : 1,
            letterSpacing: eyebrow ? "0.28em" : caps ? "0.02em" : "-0.01em",
            textTransform: eyebrow || caps ? "uppercase" : "none",
            textShadow: "0 2px 24px rgba(0,0,0,0.55)",
            whiteSpace: "nowrap",
          };
          if (eyebrow) {
            const p = interpolate(frame, [0.1 * fps + i * 5, 0.6 * fps + i * 5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
            return (
              <div key={i} style={{ ...base, opacity: p, letterSpacing: `${0.5 - 0.22 * p}em` }}>
                {line}
              </div>
            );
          }
          if (type === "slam") {
            // A word at a time, each punched in from big.
            return (
              <div key={i} className={fontClass} style={base}>
                {line.split(/\s+/).map((w, j) => {
                  const start = 2 + (firstWord[i] + j) * 4;
                  const p = interpolate(frame, [start, start + 4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
                  return (
                    <span key={j}>
                      {j > 0 && " "}
                      <span style={{ display: "inline-block", opacity: p, scale: String(1.6 - 0.6 * p), filter: `blur(${(1 - p) * 6}px)` }}>{w}</span>
                    </span>
                  );
                })}
              </div>
            );
          }
          const start = 0.1 * fps + i * (type === "soft" ? 8 : 5);
          const p = interpolate(frame, [start, start + (type === "soft" ? 0.7 : type === "track" ? 0.6 : 0.45) * fps], [0, 1], {
            ...clamp,
            easing: type === "rise" ? Easing.bezier(0.16, 1, 0.3, 1) : Easing.out(Easing.cubic),
          });
          if (type === "rise")
            return (
              <div key={i} style={{ overflow: "hidden", paddingBottom: 6 }}>
                <div className={fontClass} style={{ ...base, translate: `0px ${(1 - p) * 110}%`, opacity: p }}>
                  {line}
                </div>
              </div>
            );
          return (
            <div
              key={i}
              className={fontClass}
              style={{
                ...base,
                opacity: p,
                filter: `blur(${(1 - p) * (type === "soft" ? 12 : 8)}px)`,
                // Glamour's letters close in from wide, like a fashion title; soulful's drift up.
                letterSpacing: type === "track" ? `${0.3 * (1 - p) + (caps ? 0.02 : -0.01)}em` : base.letterSpacing,
                translate: type === "soft" ? `0px ${(1 - p) * 14}px` : undefined,
              }}
            >
              {line}
            </div>
          );
        })}
        {eyebrow && <div style={{ margin: left ? "14px 0 0" : "14px auto 0", height: 1, width: `${interpolate(frame, [0.3 * fps, fps], [0, 38], clamp)}%`, backgroundColor: accent }} />}
      </div>
    </>
  );
};

/** The calm loop under the title: the hold box breathing, softened and darkened below so the link's words read. */
const Hold: React.FC<{ src: string; frame: Frame; base: Cam; grade: string }> = ({ src, frame: fr, base, grade }) => {
  const f = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  // One breath from the end of the fade to the end, so the loop's two ends meet.
  const t = (f - INTO_HOLD) / (dur - INTO_HOLD);
  const breathe = 1.02 + 0.05 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [0, INTO_HOLD], [0, 1], clamp) }}>
      {/* Softened and dimmed on the flyer itself (the Stories download draws filters there, not on a wrapper). */}
      <Flyer src={src} frame={fr} cam={{ ...base, z: base.z + Math.log(breathe) }} grade={`${grade} brightness(0.72)`} blur={3.5} />
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.25) 62%, transparent 80%)" }} />
    </AbsoluteFill>
  );
};
