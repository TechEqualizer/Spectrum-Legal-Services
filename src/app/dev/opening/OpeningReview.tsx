"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import OpeningBackdrop from "@/components/OpeningBackdrop";
import { titleFontClass } from "@/components/lookFonts";
import type { LookFont } from "@/lib/look";
import { parseOpening, type OpeningRecipe } from "@/lib/opening";
import { OpeningScene, openingFrames } from "@/remotion/OpeningScene";

type Review = { src: string; recipe: unknown; font?: LookFont; accent?: string; title?: string; tagline?: string; frames?: boolean };
type Ready = { src: string; recipe: OpeningRecipe; font?: LookFont; accent: string; title: string; tagline: string; frames: boolean };

const FPS = 30;

/**
 * The opening as a fan sees it on a phone, with a stand-in title over the
 * hold. In frames mode the player stays paused and the review script steps it
 * one frame at a time (window.__opening), so a slow machine never drops one.
 */
export default function OpeningReview() {
  const [review, setReview] = useState<Ready | null>(null);
  const [problem, setProblem] = useState("");
  const [held, setHeld] = useState(false);
  useEffect(() => {
    // The script hands the flyer and recipe over in sessionStorage, checked like any recipe.
    try {
      const r = JSON.parse(sessionStorage.getItem("opening-review") ?? "null") as Review | null;
      const recipe = r && parseOpening(r.recipe);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser on mount
      if (!r || !recipe) setProblem("No recipe, or not a valid one.");
      else setReview({ src: r.src, recipe, font: r.font, accent: r.accent ?? "#ffffff", title: r.title ?? "", tagline: r.tagline ?? "", frames: Boolean(r.frames) });
    } catch {
      setProblem("No recipe, or not a valid one.");
    }
  }, []);
  if (problem) return <main className="p-6 text-white">{problem}</main>;
  if (!review) return null;
  const font = titleFontClass(review.font);
  const caps = review.font === "regal" || review.font === "bold";
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white" style={{ "--sky-accent": review.accent } as React.CSSProperties}>
      {review.frames ? (
        <Frames review={review} fontClass={font} caps={caps} onHold={setHeld} />
      ) : (
        <OpeningBackdrop src={review.src} recipe={review.recipe} fontClass={font} caps={caps} paused={false} skip={false} onHold={() => setHeld(true)} />
      )}
      {held && (
        <div className={`absolute inset-x-0 bottom-0 px-6 pb-14 ${review.frames ? "" : "cine-reveal"}`} data-held>
          <h1 className={`text-5xl leading-[0.95] text-white ${font}`}>{review.title}</h1>
          <p className="mt-3 text-[15px] text-white/85">{review.tagline}</p>
          <span className="mt-5 inline-flex min-h-12 items-center rounded-full px-6 text-sm font-bold text-black" style={{ backgroundColor: review.accent }}>Get tickets</span>
        </div>
      )}
    </main>
  );
}

/** The scene itself, paused, for the script to step through. */
function Frames({ review, fontClass, caps, onHold }: { review: Ready; fontClass: string; caps: boolean; onHold: (held: boolean) => void }) {
  const ref = useRef<PlayerRef>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const { holdStart, total } = openingFrames(review.recipe, FPS);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = review.src;
  }, [review.src]);
  useEffect(() => {
    if (!size) return;
    const w = window as unknown as { __opening?: unknown };
    w.__opening = {
      total,
      holdStart,
      seek: (f: number) => {
        ref.current?.seekTo(f);
        onHold(f >= holdStart + 10);
      },
    };
  }, [size, total, holdStart, onHold]);
  if (!size) return null;
  // About 720 pixels on the short side, as on a phone (see OpeningBackdrop).
  const k = 720 / Math.min(window.innerWidth, window.innerHeight);
  return (
    <Player
      ref={ref}
      component={OpeningScene}
      inputProps={{ src: review.src, width: size.w, height: size.h, recipe: review.recipe, fontClass, caps, accent: "var(--sky-accent, #ffffff)" }}
      durationInFrames={total}
      compositionWidth={Math.round((window.innerWidth * k) / 2) * 2}
      compositionHeight={Math.round((window.innerHeight * k) / 2) * 2}
      fps={FPS}
      controls={false}
      clickToPlay={false}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
