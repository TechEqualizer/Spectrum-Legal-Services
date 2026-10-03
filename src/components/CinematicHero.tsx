"use client";

import { useEffect, useRef } from "react";
import BrandLogo, { wordmarkFont } from "@/components/BrandLogo";
import type { Funnel, ReelMedia } from "@/data/funnel-types";

type SceneMedia = Extract<ReelMedia, { kind: "video" | "image" }>;

// Specks of light drifting up through the glow: left %, bottom %, size px, seconds, delay.
const MOTES: [number, number, number, number, number][] = [
  [12, 8, 3, 14, 0],
  [28, 22, 2, 18, 4],
  [46, 4, 4, 16, 7],
  [63, 18, 2, 20, 2],
  [78, 10, 3, 15, 9],
  [88, 30, 2, 19, 5],
  [36, 34, 2, 17, 11],
];

/** What plays behind the title: the hero's own media, else the first reel with a video or photo. */
function sceneMedia(funnel: Funnel): SceneMedia | undefined {
  if (funnel.cover.hero?.media) return funnel.cover.hero.media;
  const media = funnel.reels.map((r) => r.media).filter(Boolean) as ReelMedia[];
  return (media.find((m) => m.kind === "video") ?? media.find((m) => m.kind === "image")) as
    | SceneMedia
    | undefined;
}

/**
 * The opening scene of a funnel link, like the first seconds of a trailer:
 * footage (or a moving glow in the brand's colors) under film grain and a
 * vignette fades up from black, then the title card comes up. With a cover.hero it
 * fills most of the screen and carries the buttons; without one it is a
 * shorter scene over the heading, and the choices follow right after.
 *
 * `revealed` is false for the server-rendered splash, which holds the scene
 * before the words come up, so they animate once, when the page is ready.
 */
export default function CinematicHero({
  funnel,
  revealed,
  eyebrow,
  actions,
  paused = false,
}: {
  funnel: Funnel;
  revealed: boolean;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pauses the background video, e.g. while a reel plays on top. */
  paused?: boolean;
}) {
  const { brand, cover } = funnel;
  const hero = cover.hero;
  const media = sceneMedia(funnel);
  const full = Boolean(hero);
  const title = hero?.title ?? cover.heading;
  const tagline = hero?.tagline ?? cover.intro;

  return (
    <div
      className={`relative isolate flex flex-col overflow-hidden ${
        full ? "cine-hero-full short:min-h-0" : "cine-hero-short short:min-h-0"
      }`}
    >
      <Scene media={media} paused={paused} />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <BrandLogo brand={brand} size="sm" eager />
          </div>
          {brand.byline && (
            <p className="text-right text-xs leading-snug text-white/80">
              {brand.byline[0]}
              <br />
              {brand.byline[1]}
            </p>
          )}
        </div>

        <div className={`mt-auto ${full ? "pb-8 pt-16" : "pb-6 pt-12"} ${revealed ? "" : "invisible"}`}>
          {eyebrow && (
            <p className="cine-reveal mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-accent" style={{ animationDelay: "0.55s" }}>
              {eyebrow}
            </p>
          )}
          <h1
            className={`cine-title ${wordmarkFont.className} text-balance leading-[0.95] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] ${
              full ? "text-[3.25rem] tall:text-7xl" : "text-5xl tall:text-6xl"
            }`}
            style={{ animationDelay: "0.7s" }}
          >
            {title}
          </h1>
          {tagline && (
            <p className="cine-reveal mt-3 max-w-sm text-pretty text-[15px] leading-relaxed text-white/85" style={{ animationDelay: "1.05s" }}>
              {tagline}
            </p>
          )}
          {actions && (
            <div className="cine-reveal mt-6 flex flex-wrap gap-2.5" style={{ animationDelay: "1.3s" }}>
              {actions}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function Scene({ media, paused }: { media?: SceneMedia; paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null);

  // Plays muted behind the title; holds still for reduced motion and while a reel is open.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || still) el.pause();
    else el.play().catch(() => {});
  }, [paused]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-deep-navy">
      <div className="cine-fade-in absolute inset-0">
      {media?.kind === "video" ? (
        <video
          ref={video}
          className="cine-kenburns absolute inset-0 h-full w-full object-cover"
          src={media.src}
          poster={media.poster}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
      ) : media?.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- any uploaded photo, sized by CSS
        <img className="cine-kenburns absolute inset-0 h-full w-full object-cover" src={media.src} alt="" />
      ) : (
        <>
          {/* No footage yet: low sun, haze and light in the brand's colors. */}
          <div className="cine-wash absolute -left-1/4 top-1/3 h-[70%] w-[90%]" />
          <div className="absolute left-1/2 top-[36%] aspect-square w-[min(110vw,680px)] -translate-x-1/2 -translate-y-1/2">
            <div className="cine-sink h-full w-full">
              <div className="cine-glow h-full w-full rounded-full" />
            </div>
          </div>
          <div className="cine-flare absolute left-1/2 top-[36%] h-[2px] w-[min(160vw,1100px)] -translate-x-1/2" />
          {/* Below the horizon line is darker, so the sun looks like it's setting behind it. */}
          <div className="absolute inset-x-0 bottom-0 top-[36%] bg-gradient-to-b from-black/40 via-black/10 to-transparent" />
          <div className="cine-leak absolute inset-0" />
          {MOTES.map(([left, bottom, size, seconds, delay], i) => (
            <span
              key={i}
              className="cine-mote absolute rounded-full"
              style={{ left: `${left}%`, bottom: `${bottom}%`, width: size, height: size, animationDuration: `${seconds}s`, animationDelay: `${delay}s` }}
            />
          ))}
        </>
      )}
      </div>
      {/* Grain, vignette, and a fade into the page so the words always read. */}
      <div className="cine-grain absolute -inset-1/2 opacity-[0.14]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-deep-navy from-10% via-deep-navy/75 to-transparent" />
    </div>
  );
}
