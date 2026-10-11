import { lightLeak } from "@remotion/effects/light-leak";
import { AbsoluteFill, Easing, Img, Solid, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Box, OpeningMove } from "@/lib/opening";

// The pieces the opening scene is cut from (src/remotion/OpeningScene.tsx):
// a shot on the flyer with a camera move, the whole flyer as a poster, light
// leaks, embers and grain. Every motion is driven by the frame, never CSS
// animation, so it plays the same in the Player and in a render
// (.claude/skills/remotion-best-practices).

/** The recipe's moves, plus "breathe" (in and back out, so it loops) and "poster" (the whole flyer). */
export type ShotMove = OpeningMove | "breathe" | "poster";
export type TrailerShot = { box: Box; move: ShotMove; seconds: number };

/** One shot: its box fills the frame, and the camera moves across the shot's length. */
export const Shot: React.FC<{ src: string; width: number; height: number; shot: TrailerShot }> = ({ src, width, height, shot }) => {
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
    breathe: { scale: 1.02 + 0.06 * (0.5 - 0.5 * Math.cos((frame / durationInFrames) * Math.PI * 2)), translate: "0px 0px" },
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

export const LightLeak: React.FC<{ seed: number; hue: number }> = ({ seed, hue }) => {
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

// What floats in the air, per mood: positions are a function of the frame, so they render the same everywhere.
const SPECKS = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: r(1), y: r(2), speed: 0.04 + r(3) * 0.08, size: 2 + r(4) * 5, sway: r(5) * 0.04, phase: r(6), near: r(7) > 0.82 };
});

export type SparkKind = "embers" | "glitter" | "haze" | "dust" | "motes";

/**
 * embers: sparks rising and fading, brightest low (club, fire, stage).
 * glitter: flecks falling and catching the light (gala, fashion).
 * haze: a few big soft lights drifting slowly (jazz, lounge).
 * dust: a few pale motes hanging in the light, barely moving (galleries, talks).
 * motes: sun bokeh floating up, warm and soft (daytime).
 */
export const Sparks: React.FC<{ kind: SparkKind; color: string }> = ({ kind, color }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sec = frame / fps;
  const specks = kind === "dust" ? SPECKS.slice(0, 14) : kind === "haze" || kind === "motes" ? SPECKS.slice(0, 10) : SPECKS;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {specks.map((e, i) => {
        const fall = kind === "glitter";
        const speed = kind === "dust" ? e.speed * 0.15 : kind === "haze" ? e.speed * 0.3 : kind === "motes" ? e.speed * 0.4 : e.speed;
        const y = (((e.y + (fall ? 1 : -1) * sec * speed) % 1) + 1) % 1;
        const x = e.x + Math.sin((sec * 0.6 + e.phase) * Math.PI * 2) * e.sway;
        const big = kind === "haze" || kind === "motes";
        const size = big ? 40 + e.size * 14 : e.near ? e.size * 3 : kind === "dust" ? 1.5 + e.size * 0.3 : e.size;
        // Glitter catches the light now and then; the rest glow steadily.
        const glint = fall ? Math.pow(Math.max(0, Math.sin((sec * 1.5 + e.phase) * Math.PI * 2)), 8) : 0;
        const opacity =
          kind === "embers" ? (e.near ? 0.45 : 0.85) * Math.pow(y, 0.8)
          : kind === "glitter" ? 0.25 + 0.75 * glint
          : kind === "dust" ? 0.35
          : kind === "haze" ? 0.12
          : 0.18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x * width,
              top: (0.05 + y * 0.95) * height,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: kind === "dust" ? "#f4efe6" : color,
              boxShadow: big || kind === "dust" ? undefined : `0 0 ${size * (fall ? 2 + glint * 4 : 3)}px ${size}px ${color}`,
              // Near the lens: big and soft. Far: small and sharp.
              filter: big ? "blur(18px)" : e.near && kind === "embers" ? "blur(6px)" : undefined,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Film grain, a new pattern every two frames. */
export const Grain: React.FC = () => {
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
