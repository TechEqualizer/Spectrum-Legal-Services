"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import MotionScene, { type MotionRecipe } from "@/components/MotionScene";

// Recipes as Claude would write them for Big Love's flyer (1054×1492).
const RECIPES: Record<string, MotionRecipe> = {
  runway: { focus: { x: 0.33, y: 0.53, w: 0.34, h: 0.33 }, camera: "push", effects: ["smoke", "embers", "sweep", "pulse"], glow: "#E07A1F", spark: "#F5B65A", seconds: 5 },
  mask: { focus: { x: 0.69, y: 0.02, w: 0.31, h: 0.42 }, camera: "drift", effects: ["glitter", "bokeh", "sweep"], glow: "#7B3FB0", spark: "#E8C36A", seconds: 4 },
};

function Lab() {
  const q = useSearchParams();
  const recipe = RECIPES[q.get("r") ?? "runway"] ?? RECIPES.runway;
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <MotionScene src="/clients/masquerade/flyer.jpg" recipe={recipe} />
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
