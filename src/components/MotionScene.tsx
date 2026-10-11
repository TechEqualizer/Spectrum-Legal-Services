"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A moving opening scene made from a still flyer, directed by Claude and
 * drawn live in the browser: no video file, nothing to wait for, and the
 * flyer's words never warp because only its artwork moves.
 *
 * Layers, back to front: the whole flyer as a soft field of its colors, a
 * glow behind the subject, the subject itself (the part of the flyer Claude
 * picked, clear of lettering) with a slow camera move, then light and
 * particles. Every motion repeats exactly once per `seconds`, so the scene
 * loops without a seam. Still for visitors who ask for less motion.
 */
export type MotionEffect = "smoke" | "embers" | "glitter" | "bokeh" | "sweep" | "pulse" | "rain";

export type MotionRecipe = {
  /** The subject: a box on the flyer, 0 to 1 from its top left, clear of lettering. */
  focus: { x: number; y: number; w: number; h: number };
  /** How the camera moves: a slow push in and back, a drift, or a sway. */
  camera: "push" | "drift" | "sway";
  effects: MotionEffect[];
  /** Two colors from the flyer: the glow behind the subject, and the light in the air. */
  glow: string;
  spark: string;
  /** One loop, 3 to 6 seconds. */
  seconds: number;
};

export default function MotionScene({ src, recipe, paused = false }: { src: string; recipe: MotionRecipe; paused?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [art, setArt] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [still, setStill] = useState(false);
  const L = Math.min(6, Math.max(3, recipe.seconds));
  const has = (e: MotionEffect) => recipe.effects.includes(e);

  // The flyer's own size, to place the subject. (Loaded here: a cached image can finish before React listens.)
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => live && setArt({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const onMq = () => setStill(mq.matches);
    mq.addEventListener("change", onMq);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);

  // Particles and smoke on a canvas, each on a path that comes back to its start every loop.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !size) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const parts = particles(recipe.effects, size);
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = still || paused ? 0.15 : ((now - start) / 1000 / L) % 1;
      ctx.clearRect(0, 0, size.w, size.h);
      for (const p of parts) p.draw(ctx, t, size, recipe);
      if (!still && !paused) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [size, recipe, still, paused, L]);

  // The subject fills the scene: the focus box scaled to cover it, centered.
  const subject = (() => {
    if (!art || !size) return null;
    const { x, y, w, h } = recipe.focus;
    const s = Math.max(size.w / (w * art.w), size.h / (h * art.h));
    const width = art.w * s;
    const height = art.h * s;
    return {
      width,
      height,
      left: -x * width + (size.w - w * width) / 2,
      // When the subject is taller than the screen, keep its top (faces, heads) in view: crop mostly from below.
      top: -y * height + (size.h - h * height) * (h * height > size.h ? 0.12 : 0.5),
    };
  })();

  const vars = {
    "--ms-loop": `${L}s`,
    "--ms-glow": recipe.glow,
    "--ms-spark": recipe.spark,
  } as React.CSSProperties;
  const playState = still || paused ? "paused" : "running";

  return (
    <div ref={box} aria-hidden="true" className="absolute inset-0 overflow-hidden bg-black" style={vars}>
      {/* The flyer's colors, far back and out of focus. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- the organizer's flyer */}
      <img src={src} alt="" className="ms-field absolute inset-0 h-full w-full object-cover" style={{ animationPlayState: playState }} />
      {/* The light the subject stands in. */}
      <div className="ms-glow absolute inset-0" style={{ animationPlayState: has("pulse") ? playState : "paused" }} />
      {/* The subject, with the camera's move. Edges feathered into the field. */}
      <div className={`ms-cam ms-cam-${recipe.camera} absolute inset-0`} style={{ animationPlayState: playState }}>
        {subject && (
          // eslint-disable-next-line @next/next/no-img-element -- the organizer's flyer, cropped by CSS
          <img src={src} alt="" className="ms-subject absolute max-w-none" style={subject} />
        )}
      </div>
      {has("sweep") && <div className="ms-sweep absolute inset-0" style={{ animationPlayState: playState }} />}
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

type Particle = { draw: (ctx: CanvasRenderingContext2D, t: number, size: { w: number; h: number }, r: MotionRecipe) => void };

// A seeded random, so a scene looks the same every time it's opened.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TAU = Math.PI * 2;

function particles(effects: MotionEffect[], size: { w: number; h: number }): Particle[] {
  const rnd = seeded(7);
  const out: Particle[] = [];
  const area = (size.w * size.h) / (390 * 844);

  if (effects.includes("smoke")) {
    // Big soft clouds drifting on closed loops, lit by the glow color.
    for (let i = 0; i < 6; i++) {
      const cx = rnd(), cy = 0.45 + rnd() * 0.55, rx = 0.08 + rnd() * 0.12, ry = 0.03 + rnd() * 0.05, ph = rnd(), r = 0.35 + rnd() * 0.3;
      out.push({
        draw(ctx, t, s, rc) {
          const a = TAU * (t + ph);
          const x = (cx + Math.cos(a) * rx) * s.w, y = (cy + Math.sin(a) * ry) * s.h, rad = r * Math.max(s.w, s.h) * 0.5;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          g.addColorStop(0, withAlpha(rc.glow, 0.16));
          g.addColorStop(1, withAlpha(rc.glow, 0));
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = g;
          ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
          ctx.globalCompositeOperation = "source-over";
        },
      });
    }
  }
  if (effects.includes("bokeh")) {
    for (let i = 0; i < 10; i++) {
      const cx = rnd(), cy = rnd(), d = 0.02 + rnd() * 0.03, rad = 14 + rnd() * 34, ph = rnd(), k = 1 + Math.floor(rnd() * 2);
      out.push({
        draw(ctx, t, s, rc) {
          const a = TAU * (t * k + ph);
          const x = (cx + Math.cos(a) * d) * s.w, y = (cy + Math.sin(a) * d) * s.h;
          const g = ctx.createRadialGradient(x, y, rad * 0.6, x, y, rad);
          const alpha = 0.1 + 0.08 * Math.sin(a);
          g.addColorStop(0, withAlpha(rc.spark, alpha));
          g.addColorStop(1, withAlpha(rc.spark, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, TAU);
          ctx.fill();
        },
      });
    }
  }
  if (effects.includes("embers")) {
    // Sparks rising from below, swaying, each crossing the screen a whole number of times a loop.
    for (let i = 0; i < Math.round(38 * area); i++) {
      const x0 = rnd(), y0 = rnd(), k = 1 + Math.floor(rnd() * 2), sway = 0.01 + rnd() * 0.03, sw = 1 + Math.floor(rnd() * 3), ph = rnd(), r = 0.8 + rnd() * 1.8;
      out.push({
        draw(ctx, t, s, rc) {
          const y = (((y0 - t * k) % 1) + 1) % 1;
          const x = x0 + Math.sin(TAU * (t * sw + ph)) * sway;
          // Brightest low, fading as they rise.
          const life = Math.pow(y, 0.7);
          ctx.fillStyle = withAlpha(rc.spark, 0.9 * life);
          ctx.shadowColor = rc.spark;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x * s.w, (0.15 + y * 0.9) * s.h, r, 0, TAU);
          ctx.fill();
          ctx.shadowBlur = 0;
        },
      });
    }
  }
  if (effects.includes("glitter")) {
    // Flecks drifting down and catching the light.
    for (let i = 0; i < Math.round(60 * area); i++) {
      const x0 = rnd(), y0 = rnd(), k = 1, tw = 2 + Math.floor(rnd() * 3), ph = rnd(), r = 0.6 + rnd() * 1.6, sway = rnd() * 0.02;
      out.push({
        draw(ctx, t, s, rc) {
          const y = (y0 + t * k) % 1;
          const x = x0 + Math.sin(TAU * (t + ph)) * sway;
          const glint = Math.pow(Math.max(0, Math.sin(TAU * (t * tw + ph))), 6);
          ctx.fillStyle = withAlpha(rc.spark, 0.25 + 0.75 * glint);
          const px = x * s.w, py = y * s.h, rr = r * (1 + glint * 1.5);
          ctx.beginPath();
          ctx.arc(px, py, rr, 0, TAU);
          ctx.fill();
          if (glint > 0.5) {
            // A four-point star on the brightest flecks.
            ctx.strokeStyle = withAlpha("#ffffff", glint * 0.8);
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(px - rr * 4, py);
            ctx.lineTo(px + rr * 4, py);
            ctx.moveTo(px, py - rr * 4);
            ctx.lineTo(px, py + rr * 4);
            ctx.stroke();
          }
        },
      });
    }
  }
  if (effects.includes("rain")) {
    for (let i = 0; i < Math.round(70 * area); i++) {
      const x0 = rnd(), y0 = rnd(), k = 2 + Math.floor(rnd() * 2), len = 10 + rnd() * 16;
      out.push({
        draw(ctx, t, s, rc) {
          const y = ((y0 + t * k) % 1) * s.h;
          const x = (x0 * s.w + y * 0.12) % s.w;
          ctx.strokeStyle = withAlpha(rc.spark, 0.25);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len * 0.12, y + len);
          ctx.stroke();
        },
      });
    }
  }
  return out;
}

/** A #RRGGBB color at some opacity. */
function withAlpha(hex: string, a: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
