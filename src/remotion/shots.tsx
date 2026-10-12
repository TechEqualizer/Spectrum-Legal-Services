import { lightLeak } from "@remotion/effects/light-leak";
import { useState } from "react";
import { AbsoluteFill, Img, Solid, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DepthFlyer } from "@/remotion/depth";
import type { Box, OpeningMove } from "@/lib/opening";

// The pieces the opening scene is made of (src/remotion/OpeningScene.tsx):
// one camera over the flyer, light leaks, what floats in the air, and grain.
// Every motion is driven by the frame, never CSS animation, so it plays the
// same in the Player and in a render (.claude/skills/remotion-best-practices).

/** Where the camera looks: the point on the flyer at the frame's center (fractions), and how far in (the log of its scale). */
export type Cam = { x: number; y: number; z: number };
type Frame = { W: number; H: number; fw: number; fh: number };

/**
 * How far the camera may enlarge the flyer: 4 composition pixels per flyer
 * pixel at a 720-pixel short side. Only the smallest shots reach it; past it
 * a flyer goes visibly soft, so such a shot shows a little more around it.
 * (Tighter caps were tried: they brought the flyer's own lettering into
 * shots, which is worse than a little softness.)
 */
const MAX_ENLARGE = 4;

/**
 * The camera on a box: the box covers the frame, so nothing outside it (the
 * flyer's own lettering, which Claude keeps the boxes clear of) comes into
 * view, and the frame is always filled; never enlarged past the flyer's own
 * detail.
 */
export const camOn = (b: Box, { W, H, fw, fh }: Frame): Cam => ({
  x: b.x + b.w / 2,
  y: b.y + b.h / 2,
  z: Math.log(Math.max(Math.min(Math.max(W / (b.w * fw), H / (b.h * fh)), (MAX_ENLARGE * Math.min(W, H)) / 720), W / fw, H / fh)),
});

/** The whole flyer, a little inside the frame. */
export const camOnPoster = ({ W, H, fw, fh }: Frame): Cam => ({ x: 0.5, y: 0.5, z: Math.log(Math.min(W / fw, H / fh) * 0.94) });

export const mix = (a: Cam, b: Cam, t: number): Cam => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

/** Where the flyer sits on screen for a camera: kept covering the frame when it's big enough to, centered when it isn't. */
export function place(c: Cam, { W, H, fw, fh }: Frame) {
  const s = Math.exp(c.z);
  const halfW = W / (2 * fw * s);
  const halfH = H / (2 * fh * s);
  const x = halfW >= 0.5 ? 0.5 : Math.min(1 - halfW, Math.max(halfW, c.x));
  const y = halfH >= 0.5 ? 0.5 : Math.min(1 - halfH, Math.max(halfH, c.y));
  return { left: W / 2 - x * fw * s, top: H / 2 - y * fh * s, width: fw * s, height: fh * s };
}

/**
 * The camera's move while it rests on a shot: in, out, up or across. The
 * sideways moves ride a little closer in, so they stay inside the box; across
 * a box wider (or taller) than the frame shows, a pan (or tilt) travels its
 * whole width (or height), so a wide crowd is seen from one end to the other.
 */
export function drift(base: Cam, move: OpeningMove, f: Frame, box?: Box): [Cam, Cam] {
  const s = Math.exp(base.z);
  const seenW = f.W / (f.fw * s);
  const seenH = f.H / (f.fh * s);
  const z = (k: number) => base.z + Math.log(k);
  // How far the camera can travel inside the box, at the moves' slightly closer zoom.
  const spanX = box ? Math.max(0.05 * seenW, (box.w - seenW / 1.08) / 2) : 0.05 * seenW;
  const spanY = box ? Math.max(0.04 * seenH, (box.h - seenH / 1.08) / 2) : 0.04 * seenH;
  switch (move) {
    case "push":
      return [base, { ...base, z: z(1.14) }];
    case "pull":
      return [{ ...base, z: z(1.14) }, base];
    case "tilt-up":
      return [{ ...base, y: base.y + spanY, z: z(1.08) }, { ...base, y: base.y - spanY, z: z(1.11) }];
    case "pan-left":
      return [{ ...base, x: base.x + spanX, z: z(1.08) }, { ...base, x: base.x - spanX, z: z(1.11) }];
    case "pan-right":
      return [{ ...base, x: base.x - spanX, z: z(1.08) }, { ...base, x: base.x + spanX, z: z(1.11) }];
  }
}

/**
 * The flyer as the camera sees it, over a blurred, darker copy of itself that
 * fills anything the flyer doesn't (the whole poster on a tall screen). The
 * camera only ever transforms the flyer (never lays it out again), so phones
 * move it on the GPU. On top: the mood's grade, a glow around its highlights
 * (bloom), and a light that can sweep across the print (0 to 1; outside that,
 * none). `tilt` turns the frame a fraction of a degree, like a hand-held camera.
 */
export const Flyer: React.FC<{
  src: string;
  frame: Frame;
  cam: Cam;
  blur?: number;
  sweep?: number;
  grade?: string;
  bloom?: number;
  tilt?: number;
  /** The flyer's depth map, and how it moves this frame: drawn with parallax (falls back to flat if it can't). */
  depth?: { src: string; shift: [number, number]; dolly: number; focus: [number, number] };
}> = ({ src, frame, cam, blur = 0, sweep = -1, grade = "contrast(1.12) saturate(1.15) brightness(1.03)", bloom = 0, tilt = 0, depth }) => {
  const [flat, setFlat] = useState(false);
  const deep = Boolean(depth) && !flat;
  const { W, H, fw, fh } = frame;
  const at = place(cam, frame);
  const k = at.width / fw;
  const layer: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: fw,
    height: fh,
    transformOrigin: "0 0",
    transform: `translate(${W / 2}px, ${H / 2}px) rotate(${tilt}deg) translate(${at.left - W / 2}px, ${at.top - H / 2}px) scale(${k})`,
  };
  const img: React.CSSProperties = { width: "100%", height: "100%", maxWidth: "none", display: "block" };
  // The blurred copy only where the flyer doesn't fill the frame (a few pixels' margin for the hand-held tilt).
  const covered = at.left <= -8 && at.top <= -8 && at.left + at.width >= W + 8 && at.top + at.height >= H + 8;
  // Motion blur in steps, so the filter (costly to redraw) changes only now and then, not every frame.
  const stepped = Math.round(blur / 1.5) * 1.5;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {!covered && <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.45) saturate(1.4)", scale: "1.2" }} />}
      {/* Blur is drawn before the scale, so it's divided by it to stay the same on screen. */}
      {deep && depth && (
        <DepthFlyer
          src={src}
          depth={depth.src}
          W={W}
          H={H}
          view={{ rect: at, roll: tilt, shift: depth.shift, dolly: depth.dolly, focus: depth.focus }}
          style={{ filter: `${stepped > 0 ? `blur(${stepped.toFixed(2)}px) ` : ""}${grade}` }}
          onFail={() => setFlat(true)}
        />
      )}
      <div style={{ ...layer, overflow: "hidden", filter: deep ? undefined : `${stepped > 0 ? `blur(${(stepped / k).toFixed(2)}px) ` : ""}${grade}` }}>
        {!deep && <Img src={src} style={img} />}
        {sweep >= 0 && sweep <= 1 && (
          // A band of light across the print, like a glossy poster catching a spotlight.
          <div
            style={{
              position: "absolute",
              inset: 0,
              mixBlendMode: "screen",
              background: `linear-gradient(115deg, transparent ${sweep * 170 - 45}%, rgba(255,255,255,0.12) ${sweep * 170 - 32}%, rgba(255,255,255,0.42) ${sweep * 170 - 27}%, rgba(255,255,255,0.12) ${sweep * 170 - 22}%, transparent ${sweep * 170 - 10}%)`,
            }}
          />
        )}
      </div>
      {bloom > 0 && (
        // The highlights spill a little light around themselves, as on film. Its filter never
        // changes, so the browser draws it once and only moves it.
        <div style={{ ...layer, opacity: bloom, mixBlendMode: "screen", filter: "blur(7px) brightness(1.45) contrast(1.5)" }}>
          <Img src={src} style={img} />
        </div>
      )}
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
export const Sparks: React.FC<{ kind: SparkKind; color: string; lite?: boolean }> = ({ kind, color, lite = false }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sec = frame / fps;
  // Lite (a modest phone): a dozen specks, with no glow or blur to redraw.
  const specks = (kind === "dust" ? SPECKS.slice(0, 14) : kind === "haze" || kind === "motes" ? SPECKS.slice(0, 10) : SPECKS).slice(0, lite ? 12 : undefined);
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
        // In quarter steps, so the glow (costly to redraw) changes only now and then.
        const glint = fall ? Math.round(Math.pow(Math.max(0, Math.sin((sec * 1.5 + e.phase) * Math.PI * 2)), 8) * 4) / 4 : 0;
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
              left: 0,
              top: 0,
              transform: `translate(${x * width}px, ${(0.05 + y * 0.95) * height}px)`,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: kind === "dust" ? "#f4efe6" : color,
              boxShadow: lite || big || kind === "dust" ? undefined : `0 0 ${size * (fall ? 2 + glint * 4 : 3)}px ${size}px ${color}`,
              // Near the lens: big and soft. Far: small and sharp.
              filter: lite ? undefined : big ? "blur(18px)" : e.near && kind === "embers" ? "blur(6px)" : undefined,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Film grain, a new pattern every two frames: one screen of a repeating tile, shifted, so it costs one layer. */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2) % 7;
  const offsets = ["0px 0px", "-61px 37px", "53px -71px", "-29px -43px", "71px 59px", "17px -89px", "-83px 11px"];
  return (
    <AbsoluteFill
      style={{
        opacity: 0.14,
        mixBlendMode: "overlay",
        backgroundPosition: offsets[step],
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
};
