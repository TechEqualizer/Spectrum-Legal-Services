"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import type { OpeningRecipe } from "@/lib/opening";
import { OpeningScene, openingFrames } from "@/remotion/OpeningScene";

const FPS = 30;

/**
 * A link's opening, played from its flyer behind the opening screen: the cut
 * through the flyer with its own words, once, then the hold, looping. Tells
 * the screen when the hold begins (its title comes up then). Holds still on
 * the hold for visitors who ask for less motion, and jumps there on `skip`.
 *
 * Loaded only on links that have an opening (see CinematicHero), so others
 * never download the player.
 */
export default function OpeningBackdrop({
  src,
  recipe,
  fontClass,
  caps,
  paused,
  skip,
  onHold,
}: {
  src: string;
  recipe: OpeningRecipe;
  fontClass: string;
  caps: boolean;
  paused: boolean;
  /** The visitor tapped to get on with it. */
  skip: boolean;
  onHold: () => void;
}) {
  const ref = useRef<PlayerRef>(null);
  const box = useRef<HTMLDivElement>(null);
  // The composition takes the screen's own shape (a phone, or a wide desktop), so nothing is boxed in.
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [reached, setReached] = useState(false);
  const { holdStart, loopFrom, total } = openingFrames(recipe, FPS);
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ready = Boolean(size && frame);
  // At the hold: played through to it, or sent there (less motion, or a tap).
  const holding = reached || (ready && (still || skip));

  // The flyer's size frames each shot. (Loaded here: a cached image can finish before React listens.)
  // If it can't load, the screen doesn't wait for an opening that won't come.
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => live && setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => live && onHold();
    img.src = src;
    return () => {
      live = false;
    };
  }, [src, onHold]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      // About 720 pixels on the short side: sharp enough for the flyer's detail, light to draw.
      const k = 720 / Math.min(width, height);
      setFrame({ w: Math.round((width * k) / 2) * 2, h: Math.round((height * k) / 2) * 2 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The title comes up as the hold begins; from then on, only the hold repeats.
  useEffect(() => {
    const player = ref.current;
    if (!ready || !player || holding) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      if (e.detail.frame >= holdStart) setReached(true);
    };
    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [ready, holding, holdStart]);
  useEffect(() => {
    if (holding) onHold();
  }, [holding, onHold]);

  // Less motion, or a tap: straight to the hold.
  const sent = ready && (still || skip) && !reached;
  useEffect(() => {
    if (sent) ref.current?.seekTo(loopFrom);
  }, [sent, loopFrom]);

  useEffect(() => {
    const player = ref.current;
    if (!ready || !player) return;
    if (paused || still) player.pause();
    else player.play();
  }, [ready, paused, still]);

  return (
    <div ref={box} className="absolute inset-0">
      {size && frame && (
        <Player
          ref={ref}
          component={OpeningScene}
          inputProps={{ src, width: size.w, height: size.h, recipe, fontClass, caps, accent: "var(--sky-accent, #ffffff)" }}
          durationInFrames={total}
          compositionWidth={frame.w}
          compositionHeight={frame.h}
          fps={FPS}
          autoPlay={!paused && !still}
          loop
          inFrame={holding ? loopFrom : null}
          initialFrame={still ? loopFrom : 0}
          initiallyMuted
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
