import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { pushCut } from "@remotion/transitions/push-cut";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Embers, Grain, LightLeak, Shot, type TrailerShot } from "@/remotion/FlyerTrailer";

/**
 * The opening scene of a link, made from its flyer: a short intro that cuts
 * through the flyer's artwork with the flyer's own lines set over it, then
 * settles into a calm hold that loops under the link's title and button.
 *
 * The words are typeset by us (crisp, in the look's title font and colors),
 * placed where Claude says the shot has room (never over a face), and every
 * motion is driven by the frame (see .claude/skills/remotion-best-practices).
 */
export type BeatText = {
  /** One to three short lines, from the flyer. */
  lines: string[];
  /** Where the shot has room for words. */
  at: "top" | "middle" | "bottom";
  /** "eyebrow": small and spaced, like a presenter credit. "big": the line that sells. */
  size: "eyebrow" | "big";
};

export type Beat = { shot: TrailerShot; text?: BeatText };

export type OpeningSceneProps = {
  src: string;
  width: number;
  height: number;
  beats: Beat[];
  /** The calm shot the scene settles on, looping under the link's title. */
  hold: TrailerShot;
  /** The class of the look's title font (src/components/lookFonts.ts). */
  fontClass: string;
  /** Uppercase the big lines (engraved and condensed fonts read best that way). */
  caps: boolean;
  /** The look's highlight, for the last line and the embers. */
  accent: string;
  hue: number;
};

const CUT = 8;
const INTO_HOLD = 20;

/**
 * When the hold starts (as the last beat begins fading into it: the title can
 * come up then), when its loop starts (the fade done, so a repeat never shows
 * the last beat again), and the frames in all.
 */
export function openingFrames({ beats, hold }: Pick<OpeningSceneProps, "beats" | "hold">, fps: number) {
  const intro = beats.reduce((sum, b) => sum + Math.round(b.shot.seconds * fps), 0) - Math.max(0, beats.length - 2) * CUT;
  const holdStart = intro - INTO_HOLD;
  return { holdStart, loopFrom: intro, total: holdStart + Math.round(hold.seconds * fps) };
}

export const OpeningScene: React.FC<OpeningSceneProps> = ({ src, width, height, beats, hold, fontClass, caps, accent, hue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
                <LightLeak seed={i} hue={hue} />
              </TransitionSeries.Overlay>,
            );
          }
          return items;
        })}
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: INTO_HOLD })} />
        <TransitionSeries.Sequence name="Hold" durationInFrames={Math.round(hold.seconds * fps)} premountFor={fps}>
          <Shot src={src} width={width} height={height} shot={hold} />
          {/* Darker below, where the link's title and button sit. */}
          <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 40%, transparent 65%)" }} />
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
const Words: React.FC<{ text: BeatText; fontClass: string; caps: boolean; accent: string }> = ({ text, fontClass, caps, accent }) => {
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
