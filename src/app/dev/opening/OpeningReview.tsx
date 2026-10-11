"use client";

import { useEffect, useState } from "react";
import OpeningBackdrop from "@/components/OpeningBackdrop";
import { titleFontClass } from "@/components/lookFonts";
import type { LookFont } from "@/lib/look";
import { parseOpening, type OpeningRecipe } from "@/lib/opening";

type Review = { src: string; recipe: unknown; font?: LookFont; accent?: string; title?: string; tagline?: string };

/** The opening as a fan sees it on a phone, with a stand-in title over the hold. */
export default function OpeningReview() {
  const [review, setReview] = useState<{ src: string; recipe: OpeningRecipe; font?: LookFont; accent: string; title: string; tagline: string } | null>(null);
  const [problem, setProblem] = useState("");
  const [held, setHeld] = useState(false);
  useEffect(() => {
    // The script hands the flyer and recipe over in sessionStorage, checked like any recipe.
    try {
      const r = JSON.parse(sessionStorage.getItem("opening-review") ?? "null") as Review | null;
      const recipe = r && parseOpening(r.recipe);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser on mount
      if (!r || !recipe) setProblem("No recipe, or not a valid one.");
      else setReview({ src: r.src, recipe, font: r.font, accent: r.accent ?? "#ffffff", title: r.title ?? "", tagline: r.tagline ?? "" });
    } catch {
      setProblem("No recipe, or not a valid one.");
    }
  }, []);
  if (problem) return <main className="p-6 text-white">{problem}</main>;
  if (!review) return null;
  const font = titleFontClass(review.font);
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white" style={{ "--sky-accent": review.accent } as React.CSSProperties}>
      <OpeningBackdrop src={review.src} recipe={review.recipe} fontClass={font} caps={review.font === "regal" || review.font === "bold"} paused={false} skip={false} onHold={() => setHeld(true)} />
      {held && (
        <div className="cine-reveal absolute inset-x-0 bottom-0 px-6 pb-14" data-held>
          <h1 className={`text-5xl leading-[0.95] text-white ${font}`}>{review.title}</h1>
          <p className="mt-3 text-[15px] text-white/85">{review.tagline}</p>
          <span className="mt-5 inline-flex min-h-12 items-center rounded-full px-6 text-sm font-bold text-black" style={{ backgroundColor: review.accent }}>Get tickets</span>
        </div>
      )}
    </main>
  );
}
