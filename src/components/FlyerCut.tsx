"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import type { OpeningRecipe } from "@/lib/opening";
import { OpeningScene, cutFrames } from "@/remotion/OpeningScene";

const FPS = 30;

/**
 * A reel cut from the flyer (src/lib/opening.ts), playing in the reel until
 * the organizer adds a video: shots on the flyer with the reel's own words,
 * then the whole flyer under the reel's title and Tickets button. Reports
 * its progress like a video, and says when it's done so the reel moves on.
 *
 * Loaded only for reels that have a cut (see ReelViewer), so others never
 * download the player. Reels whose flyer can't load, or visitors who ask for
 * less motion, get the still flyer (`onCantPlay`).
 */
export default function FlyerCut({
  src,
  recipe,
  fontClass,
  caps,
  paused,
  onProgress,
  onFinished,
  onCantPlay,
}: {
  src: string;
  recipe: OpeningRecipe;
  fontClass: string;
  caps: boolean;
  paused: boolean;
  onProgress: (fraction: number) => void;
  onFinished: () => void;
  onCantPlay: () => void;
}) {
  const ref = useRef<PlayerRef>(null);
  const box = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const total = cutFrames(recipe, FPS);
  const ready = Boolean(size && frame);
  const callbacks = useRef({ onProgress, onFinished, onCantPlay });
  useEffect(() => {
    callbacks.current = { onProgress, onFinished, onCantPlay };
  });

  // The flyer's size frames each shot. (Loaded here: a cached image can finish before React listens.)
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => live && setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => live && callbacks.current.onCantPlay();
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);

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

  useEffect(() => {
    const player = ref.current;
    if (!ready || !player) return;
    const onFrame = (e: { detail: { frame: number } }) => callbacks.current.onProgress(e.detail.frame / (total - 1));
    const onEnded = () => callbacks.current.onFinished();
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("ended", onEnded);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("ended", onEnded);
    };
  }, [ready, total]);

  useEffect(() => {
    const player = ref.current;
    if (!ready || !player) return;
    if (paused) player.pause();
    else player.play();
  }, [ready, paused]);

  return (
    <div ref={box} className="absolute inset-0 bg-black" data-testid="flyer-cut">
      {size && frame && (
        <Player
          ref={ref}
          component={OpeningScene}
          inputProps={{ src, width: size.w, height: size.h, recipe, fontClass, caps, accent: "var(--sky-accent, #ffffff)", reel: true }}
          durationInFrames={total}
          compositionWidth={frame.w}
          compositionHeight={frame.h}
          fps={FPS}
          autoPlay={!paused}
          loop={false}
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
