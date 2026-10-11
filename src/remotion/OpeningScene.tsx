import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { pushCut } from "@remotion/transitions/push-cut";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { OpeningRecipe, OpeningText } from "@/lib/opening";
import { Embers, Grain, LightLeak, Shot, type TrailerShot } from "@/remotion/shots";

/**
 * The opening scene of a link, made from its flyer: a short intro that cuts
 * through the flyer's artwork with the flyer's own lines set over it, then
 * settles into a calm hold that loops under the link's title and button.
 *
 * The words are typeset by us (crisp, in the look's title font and colors),
 * placed where Claude says the shot has room (never over a face), and every
 * motion is driven by the frame (see .claude/skills/remotion-best-practices).
 */
type Beat = { shot: TrailerShot; text?: OpeningText };

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
  /** The look's highlight, for the last line, the rule and the embers (any CSS color). */
  accent: string;
};

const POSTER_SECONDS = 2.4;
const HOLD_SECONDS = 6;

/** The recipe's shots, then the whole flyer; and the hold. */
function cut(recipe: OpeningRecipe): { beats: Beat[]; hold: TrailerShot } {
  return {
    beats: [
      ...recipe.beats.map((b) => ({ shot: { box: b.box, move: b.move, seconds: b.seconds }, text: b.text })),
      { shot: { box: { x: 0, y: 0, w: 1, h: 1 }, move: "poster" as const, seconds: POSTER_SECONDS } },
    ],
    hold: { box: recipe.hold, move: "breathe", seconds: HOLD_SECONDS },
  };
}

const CUT = 8;
const INTO_HOLD = 20;

/**
 * When the hold starts (as the whole flyer begins fading into it: the title
 * can come up then), when its loop starts (the fade done, so a repeat never
 * shows the flyer again), and the frames in all.
 */
export function openingFrames(recipe: OpeningRecipe, fps: number) {
  const { beats, hold } = cut(recipe);
  const intro = beats.reduce((sum, b) => sum + Math.round(b.shot.seconds * fps), 0) - Math.max(0, beats.length - 2) * CUT;
  const holdStart = intro - INTO_HOLD;
  return { holdStart, loopFrom: intro, total: holdStart + Math.round(hold.seconds * fps) };
}

export const OpeningScene: React.FC<OpeningSceneProps> = ({ src, width, height, recipe, fontClass, caps, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { beats, hold } = cut(recipe);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {beats.flatMap((beat, i) => {
          const items = [
            <TransitionSeries.Sequence key={`beat-${i}`} name={`Beat ${i + 1}`} durationInFrames={Math.round(beat.shot.seconds * fps)} premountFor={fps}>
              <Shot src={src} width={width} height={height} shot={beat.shot} />
              {beat.text && <Words text={beat.text} fontClass={fontClass} caps={caps} accent={accent} />}
            </TransitionSeries.Sequence>,
          ];
          if (i < beats.length - 2) {
            items.push(
              <TransitionSeries.Transition
                key={`cut-${i}`}
                presentation={pushCut({ flashColor: "#fff", flashOpacity: 0.5, flashFrames: 3, incomingStartScale: 1.16 })}
                timing={linearTiming({ durationInFrames: CUT })}
              />,
            );
          } else if (i === beats.length - 2) {
            // A light leak washes into the last beat.
            items.push(
              <TransitionSeries.Overlay key={`leak-${i}`} durationInFrames={18}>
                <LightLeak seed={i} hue={0} />
              </TransitionSeries.Overlay>,
            );
          }
          return items;
        })}
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: INTO_HOLD })} />
        <TransitionSeries.Sequence name="Hold" durationInFrames={Math.round(hold.seconds * fps)} premountFor={fps}>
          {/* Softened, like a backdrop behind a title: whatever the flyer prints there never fights the link's own words. */}
          <AbsoluteFill style={{ filter: "blur(5px) brightness(0.7)" }}>
            <Shot src={src} width={width} height={height} shot={hold} />
          </AbsoluteFill>
          {/* Darker below, where the link's title and button sit. */}
          <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.25) 62%, transparent 80%)" }} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Embers color={accent} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 85% at 50% 45%, transparent 50%, rgba(0,0,0,0.7))" }} />
      <Grain />
      {/* Letterbox bars open over the first second, like the first shot of a film. */}
      <Bars frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const Bars: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const open = interpolate(frame, [0.2 * fps, 1.4 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.6, 0, 0.2, 1),
  });
  if (open <= 0) return null;
  return (
    <>
      <AbsoluteFill style={{ height: "14%", backgroundColor: "#000", transformOrigin: "top", scale: `1 ${open}` }} />
      <AbsoluteFill style={{ top: "86%", height: "14%", backgroundColor: "#000", transformOrigin: "bottom", scale: `1 ${open}` }} />
    </>
  );
};

/**
 * A beat's lines, set over its shot: each line rises out of a mask one after
 * another, holds, then blurs away just before the cut.
 */
const Words: React.FC<{ text: OpeningText; fontClass: string; caps: boolean; accent: string }> = ({ text, fontClass, caps, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const eyebrow = text.size === "eyebrow";
  const out = interpolate(frame, [durationInFrames - 0.3 * fps, durationInFrames - 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const place = { top: { top: "13%" }, middle: { top: "40%" }, bottom: { bottom: "17%" } }[text.at];
  return (
    <>
      {/* A soft scrim where the words sit, so they read over any artwork. */}
      <AbsoluteFill
        style={{
          background:
            text.at === "top"
              ? "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 42%)"
              : text.at === "bottom"
                ? "linear-gradient(to top, rgba(0,0,0,0.65), transparent 45%)"
                : "radial-gradient(90% 30% at 50% 47%, rgba(0,0,0,0.5), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 44,
          right: 44,
          ...place,
          textAlign: "center",
          opacity: 1 - out,
          filter: `blur(${out * 10}px)`,
        }}
      >
        {text.lines.map((line, i) => {
          const start = 0.15 * fps + i * 5;
          const p = interpolate(frame, [start, start + 0.45 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const last = i === text.lines.length - 1 && text.lines.length > 1;
          return (
            <div key={i} style={{ overflow: "hidden", paddingBottom: eyebrow ? 4 : 6 }}>
              <div
                className={eyebrow ? undefined : fontClass}
                style={{
                  translate: `0px ${(1 - p) * 110}%`,
                  opacity: p,
                  color: last ? accent : "#fff",
                  fontFamily: eyebrow ? "Montserrat, system-ui, sans-serif" : undefined,
                  fontWeight: eyebrow ? 700 : undefined,
                  fontSize: eyebrow ? 22 : 74,
                  lineHeight: eyebrow ? 1.5 : 1.02,
                  textTransform: eyebrow || caps ? "uppercase" : "none",
                  // The eyebrow's letters close in as it comes up, like a title credit.
                  letterSpacing: eyebrow ? `${0.5 - 0.22 * p}em` : caps ? "0.02em" : "-0.01em",
                  textShadow: "0 2px 24px rgba(0,0,0,0.55)",
                }}
              >
                {line}
              </div>
            </div>
          );
        })}
        {eyebrow && (
          // A thin rule draws under the credit.
          <div style={{ margin: "14px auto 0", height: 1, width: `${interpolate(frame, [0.4 * fps, 1.1 * fps], [0, 38], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`, backgroundColor: accent }} />
        )}
      </div>
    </>
  );
};
