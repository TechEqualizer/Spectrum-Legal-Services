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

// Sparks rising through every shot: positions are a function of the frame, so they render the same everywhere.
const EMBERS = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: r(1), y: r(2), speed: 0.04 + r(3) * 0.08, size: 2 + r(4) * 5, sway: r(5) * 0.04, phase: r(6), near: r(7) > 0.82 };
});

export const Embers: React.FC<{ color: string }> = ({ color }) => {
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
