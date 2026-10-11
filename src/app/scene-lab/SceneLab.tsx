"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Player } from "@remotion/player";
import MotionScene, { type MotionRecipe } from "@/components/MotionScene";
import { FlyerTrailer, trailerFrames, type FlyerTrailerProps } from "@/remotion/FlyerTrailer";

// Shots as Claude would pick them on Big Love's flyer, clear of its lettering.
const TRAILER: FlyerTrailerProps = {
  src: "/clients/masquerade/flyer.jpg",
  width: 1054,
  height: 1492,
  spark: "#F5B65A",
  hue: 30,
  style: "luxe",
  words: ["Masks on.", "Sat · Oct 31", "Detroit"],
  // Wide enough to stay sharp (at least a third of the flyer), close to the phone's shape, then the poster.
  shots: [
    { box: { x: 0.69, y: 0.02, w: 0.31, h: 0.37 }, move: "pull", seconds: 1.6 },
    { box: { x: 0.35, y: 0.53, w: 0.3, h: 0.34 }, move: "tilt-up", seconds: 1.8 },
    { box: { x: 0.66, y: 0.18, w: 0.34, h: 0.32 }, move: "pan-left", seconds: 1.4 },
    { box: { x: 0, y: 0, w: 1, h: 1 }, move: "poster", seconds: 2.6 },
  ],
};

// Recipes as Claude would write them for Big Love's flyer (1054×1492).
const RECIPES: Record<string, MotionRecipe> = {
  runway: { focus: { x: 0.33, y: 0.51, w: 0.34, h: 0.35 }, camera: "dolly", effects: ["smoke", "embers", "rays", "flare", "pulse"], glow: "#E07A1F", spark: "#F5B65A", seconds: 5, light: { x: 0.42, y: 0.1 } },
  mask: { focus: { x: 0.69, y: 0.02, w: 0.31, h: 0.42 }, camera: "orbit", effects: ["glitter", "bokeh", "sweep", "rays"], glow: "#7B3FB0", spark: "#E8C36A", seconds: 5, light: { x: 0.7, y: 0.15 } },
};

function Lab() {
  const q = useSearchParams();
  const recipe = RECIPES[q.get("r") ?? "runway"] ?? RECIPES.runway;
  // ?depth=1 uses the flyer's depth map (made with Depth Anything V2 Small).
  const depth = q.get("depth") ? "/clients/masquerade/flyer-depth.png" : undefined;
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      {q.get("r") === "trailer" ? (() => {
        const props: FlyerTrailerProps = { ...TRAILER, style: (q.get("s") as FlyerTrailerProps["style"]) ?? "luxe" };
        // Club cuts faster: the same shots, about half as long each.
        if (props.style === "club") props.shots = [...props.shots.slice(0, 3), ...props.shots.slice(0, 3), props.shots[3]].map((s) => ({ ...s, seconds: s.move === "poster" ? 2 : 0.5 }));
        return (
        <Player
          component={FlyerTrailer}
          inputProps={props}
          durationInFrames={trailerFrames(props, 30)}
          compositionWidth={720}
          compositionHeight={1280}
          fps={30}
          autoPlay
          loop
          initiallyMuted
          controls={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        );
      })() : (
        <MotionScene src="/clients/masquerade/flyer.jpg" depth={depth} recipe={recipe} />
      )}
      <div className="cine-grain pointer-events-none absolute -inset-1/2 opacity-[0.14]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_40%,transparent_55%,rgba(0,0,0,0.65))]" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-6 pb-14 pt-40">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C8A2E7]">Big Love Productions presents</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight text-white">Masquerade on the Runway</h1>
        <p className="mt-2 text-sm text-white/80">Sat, Oct 31 · 8 PM · Detroit</p>
        <span className="mt-5 inline-flex min-h-12 items-center rounded-full bg-[#C8A2E7] px-6 text-sm font-bold text-black">Get tickets</span>
      </div>
    </main>
  );
}

export default function SceneLab() {
  return (
    <Suspense>
      <Lab />
    </Suspense>
  );
}
