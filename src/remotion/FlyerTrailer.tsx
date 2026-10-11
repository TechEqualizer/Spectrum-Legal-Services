import { lightLeak } from "@remotion/effects/light-leak";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { pushCut } from "@remotion/transitions/push-cut";
import { AbsoluteFill, Easing, Img, Solid, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * A flyer trailer: one uploaded flyer cut into a few "shots" (boxes Claude
 * picks on it, clear of lettering) and edited like a teaser: each shot gets
 * its own camera move, cuts punch in with a flash, light leaks wash over a
 * couple of them, and embers drift through. Our own type goes on top on the
 * link, so the trailer itself carries no words.
 *
 * Built with Remotion (free license: companies of up to 3 people), following
 * .claude/skills/remotion-best-practices: every animation is driven by the
 * frame, not CSS, so it plays the same in the Player and in a rendered MP4.
 */
/** "poster" shows the whole flyer, crisp, over a blurred copy of itself: the closing shot. */
export type ShotMove = "push" | "pull" | "tilt-up" | "pan-left" | "pan-right" | "poster";

export type TrailerShot = {
  /** A box on the flyer, 0 to 1 from its top left. */
  box: { x: number; y: number; w: number; h: number };
  move: ShotMove;
  seconds: number;
};

/**
 * How the trailer is cut, matched to the night:
 * - luxe: slow moves, punch-ins and light leaks (galas, fashion, jazz);
 * - club: fast cuts on the beat, colored strobe flashes, a shaking camera (club nights);
 * - hype: shots cut with big words from the flyer, like a promo reel.
 */
export type TrailerStyle = "luxe" | "club" | "hype";

export type FlyerTrailerProps = {
  src: string;
  /** The flyer's size in pixels, to frame each shot. */
  width: number;
  height: number;
  shots: TrailerShot[];
  style: TrailerStyle;
  /** Hype: short lines from the flyer (the date, the city, its tagline), one per card. */
  words?: string[];
  /** The color of the embers, strobes and words, from the flyer. */
  spark: string;
  /** Rotates the light leaks' hue toward the flyer's colors (0 to 360). */
  hue: number;
};

const BEAT = 15; // frames: 120 beats a minute at 30 fps
const WORD_FRAMES = 18;
const cutFrames = (style: TrailerStyle) => (style === "club" ? 5 : style === "luxe" ? 8 : 0);

type Segment = { kind: "shot"; shot: TrailerShot; frames: number } | { kind: "word"; text: string; frames: number };

/** The edit: shots in order, with a word card after each one but the last in hype. */
function segments({ shots, style, words = [] }: Pick<FlyerTrailerProps, "shots" | "style" | "words">, fps: number): Segment[] {
  const out: Segment[] = [];
  shots.forEach((shot, i) => {
    // Club cuts land on the beat.
    const frames = style === "club" ? Math.max(1, Math.round((shot.seconds * fps) / BEAT)) * BEAT : Math.round(shot.seconds * fps);
    out.push({ kind: "shot", shot, frames });
    if (style === "hype" && i < shots.length - 1 && words[i]) out.push({ kind: "word", text: words[i], frames: WORD_FRAMES });
  });
  return out;
}

/** Which joins get a punch-in transition (it overlaps the two segments it joins). */
const punchesAt = (style: TrailerStyle, i: number) => style === "club" || (style === "luxe" && i % 2 === 0);

export function trailerFrames(props: Pick<FlyerTrailerProps, "shots" | "style" | "words">, fps: number) {
  const segs = segments(props, fps);
  const total = segs.reduce((sum, s) => sum + s.frames, 0);
  const punches = segs.slice(0, -1).filter((_, i) => punchesAt(props.style, i)).length;
  return total - punches * cutFrames(props.style);
}

export const FlyerTrailer: React.FC<FlyerTrailerProps> = (props) => {
  const { src, width, height, style, spark, hue } = props;
  const { fps } = useVideoConfig();
  const segs = segments(props, fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Shake on={style === "club"}>
        <TransitionSeries>
          {segs.flatMap((seg, i) => {
            const items = [
              <TransitionSeries.Sequence key={`seg-${i}`} name={seg.kind === "shot" ? `Shot ${i + 1}` : `Word ${i + 1}`} durationInFrames={seg.frames} premountFor={fps}>
                {seg.kind === "shot" ? <Shot src={src} width={width} height={height} shot={seg.shot} /> : <WordCard src={src} text={seg.text} color={spark} />}
              </TransitionSeries.Sequence>,
            ];
            if (i < segs.length - 1 && punchesAt(style, i)) {
              items.push(
                <TransitionSeries.Transition
                  key={`cut-${i}`}
                  presentation={pushCut({
                    flashColor: style === "club" ? spark : "#fff",
                    flashOpacity: style === "club" ? 0.8 : 0.55,
                    flashFrames: 3,
                    incomingStartScale: style === "club" ? 1.3 : 1.18,
                  })}
                  timing={linearTiming({ durationInFrames: cutFrames(style) })}
                />,
              );
            } else if (i < segs.length - 1 && style === "luxe") {
              items.push(
                <TransitionSeries.Overlay key={`leak-${i}`} durationInFrames={18}>
                  <LightLeak seed={i} hue={hue} />
                </TransitionSeries.Overlay>,
              );
            }
            return items;
          })}
        </TransitionSeries>
      </Shake>
      {style === "club" && <Strobe color={spark} />}
      <Embers color={spark} />
      {/* Lens falloff and a touch of contrast, the same over every shot. */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 85% at 50% 45%, transparent 50%, rgba(0,0,0,0.7))" }} />
      <Grain />
    </AbsoluteFill>
  );
};

/** Club: the camera shakes a little on every beat, then settles. */
const Shake: React.FC<{ on: boolean; children: React.ReactNode }> = ({ on, children }) => {
  const frame = useCurrentFrame();
  if (!on) return <AbsoluteFill>{children}</AbsoluteFill>;
  const k = Math.max(0, 1 - (frame % BEAT) / 6);
  const jx = Math.sin(frame * 12.9898) * 7 * k;
  const jy = Math.cos(frame * 78.233) * 7 * k;
  return <AbsoluteFill style={{ translate: `${jx}px ${jy}px`, scale: String(1 + 0.03 * k) }}>{children}</AbsoluteFill>;
};

/** Club: a colored flash on every beat. */
const Strobe: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const k = Math.max(0, 1 - (frame % BEAT) / 3);
  return <AbsoluteFill style={{ backgroundColor: color, opacity: 0.32 * k, mixBlendMode: "screen" }} />;
};

/** Hype: one line from the flyer, slammed in big over the flyer's colors. */
const WordCard: React.FC<{ src: string; text: string; color: string }> = ({ src, text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.35) saturate(1.5)", scale: "1.3" }} />
      <div
        style={{
          padding: "0 48px",
          textAlign: "center",
          fontFamily: "Montserrat, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 92,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          color: "#fff",
          textShadow: `0 0 40px ${color}`,
          scale: String(
            interpolate(frame, [0, 0.25 * fps], [1.6, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          ),
          opacity: interpolate(frame, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** One shot: its box fills the frame, and the camera moves across the shot's length. */
const Shot: React.FC<{ src: string; width: number; height: number; shot: TrailerShot }> = ({ src, width, height, shot }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width: W, height: H } = useVideoConfig();
  const { x, y, w, h } = shot.box;
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });
  if (shot.move === "poster") return <Poster src={src} width={width} height={height} t={t} />;
  // Cover the frame with the box (a little extra so moves never show an edge).
  const s = Math.max(W / (w * width), H / (h * height)) * 1.08;
  const imgW = width * s;
  const imgH = height * s;
  const left = -x * imgW + (W - w * imgW) / 2;
  const top = -y * imgH + (H - h * imgH) / 2;
  const span = W * 0.035;
  const move = {
    push: { scale: 1 + 0.12 * t, translate: "0px 0px" },
    pull: { scale: 1.12 - 0.12 * t, translate: "0px 0px" },
    "tilt-up": { scale: 1.06, translate: `0px ${(t - 0.5) * span * 2}px` },
    "pan-left": { scale: 1.06, translate: `${(0.5 - t) * span * 2}px 0px` },
    "pan-right": { scale: 1.06, translate: `${(t - 0.5) * span * 2}px 0px` },
  }[shot.move as Exclude<ShotMove, "poster">];
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <AbsoluteFill style={{ scale: String(move.scale), translate: move.translate }}>
        <Img
          src={src}
          style={{
            position: "absolute",
            left,
            top,
            width: imgW,
            height: imgH,
            maxWidth: "none",
            // The film grade: deeper shadows, a little more color.
            filter: "contrast(1.12) saturate(1.15) brightness(1.03)",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The whole flyer, every word crisp, over a blurred, darker copy of itself that fills the frame. */
const Poster: React.FC<{ src: string; width: number; height: number; t: number }> = ({ src, width, height, t }) => {
  const { width: W, height: H } = useVideoConfig();
  const fit = Math.min(W / width, H / height) * 0.94;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.45) saturate(1.4)", scale: "1.2" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", scale: String(1 + 0.05 * t) }}>
        <Img src={src} style={{ width: width * fit, height: height * fit, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const LightLeak: React.FC<{ seed: number; hue: number }> = ({ seed, hue }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      color="transparent"
      style={{ mixBlendMode: "screen" }}
      effects={[
        lightLeak({
          seed,
          hueShift: hue,
          progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }),
      ]}
    />
  );
};

// Sparks rising through every shot: positions are a function of the frame, so they render the same everywhere.
const EMBERS = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: r(1), y: r(2), speed: 0.04 + r(3) * 0.08, size: 2 + r(4) * 5, sway: r(5) * 0.04, phase: r(6), near: r(7) > 0.82 };
});

const Embers: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sec = frame / fps;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {EMBERS.map((e, i) => {
        const y = (((e.y - sec * e.speed) % 1) + 1) % 1;
        const x = e.x + Math.sin((sec * 0.6 + e.phase) * Math.PI * 2) * e.sway;
        const size = e.near ? e.size * 3 : e.size;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x * width,
              top: (0.1 + y * 0.95) * height,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: color,
              boxShadow: `0 0 ${size * 3}px ${size}px ${color}`,
              // Near the lens: big and soft. Far: small and sharp. Brightest low, fading as they rise.
              filter: e.near ? "blur(6px)" : undefined,
              opacity: (e.near ? 0.45 : 0.85) * Math.pow(y, 0.8),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Film grain, a new pattern every two frames. */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2) % 5;
  const offsets = ["0% 0%", "-6% 4%", "5% -7%", "-3% -4%", "7% 6%"];
  return (
    <AbsoluteFill
      style={{
        inset: "-50%",
        opacity: 0.14,
        mixBlendMode: "overlay",
        translate: offsets[step].replace(/%/g, "%"),
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
};
