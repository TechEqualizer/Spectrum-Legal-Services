"use client";

import { useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { titleFontClass } from "@/components/lookFonts";
import type { Funnel, ReelMedia } from "@/data/funnel-types";
import { sceneMediaOf, thumbnailOf, youtubeEmbedUrl } from "@/lib/media";

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
  onSwipeUp,
}: {
  funnel: Funnel;
  revealed: boolean;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pauses the background video, e.g. while a reel plays on top. */
  paused?: boolean;
  /** A full scene: swiping up steps inside, like moving to the next reel. */
  onSwipeUp?: () => void;
}) {
  const { brand, cover } = funnel;
  const hero = cover.hero;
  const media = sceneMediaOf(funnel);
  const full = Boolean(hero);
  const title = hero?.title ?? cover.heading;
  const tagline = hero?.tagline ?? cover.intro;
  const touch = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className={`relative isolate flex flex-col overflow-hidden ${
        full ? "flex-1" : "cine-hero-short short:min-h-0"
      }`}
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const from = touch.current;
        touch.current = null;
        if (!from || !onSwipeUp) return;
        const dx = e.changedTouches[0].clientX - from.x;
        const dy = e.changedTouches[0].clientY - from.y;
        // Only a deliberate upward swipe, and only when the page has nowhere further to scroll.
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (dy < -60 && Math.abs(dx) < Math.abs(dy) / 2 && atBottom) onSwipeUp();
      }}
    >
      <Scene media={media} paused={paused} live={revealed} zoom={hero?.zoom} />

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

        <div className={`mt-auto ${full ? "pb-4 pt-10" : "pb-6 pt-12"} ${revealed ? "" : "invisible"}`}>
          {eyebrow && (
            <p className="cine-reveal mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-accent max-[400px]:tracking-[0.16em]" style={{ animationDelay: "0.55s" }}>
              {eyebrow}
            </p>
          )}
          <h1
            className={`cine-title ${titleFontClass(cover.titleFont)} text-balance leading-[0.95] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] ${
              full
                ? "text-[2.85rem] tall:text-6xl [@media(max-height:680px)]:text-[2.4rem]"
                : "text-5xl tall:text-6xl"
            }`}
            style={{ animationDelay: "0.7s" }}
          >
            {title}
          </h1>
          {tagline && (
            <p
              className={`cine-reveal mt-3 max-w-sm text-pretty text-[15px] leading-relaxed text-white/85 ${full ? "[@media(max-height:640px)]:hidden" : ""}`}
              style={{ animationDelay: "1.05s" }}
            >
              {tagline}
            </p>
          )}
          {actions && (
            <div className="cine-reveal mt-5" style={{ animationDelay: "1.3s" }}>
              {actions}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function Scene({ media, paused, live, zoom }: { media?: ReelMedia; paused: boolean; live: boolean; zoom?: number }) {
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
      ) : media?.kind === "youtube" ? (
        // The server-rendered splash shows the thumbnail; the player starts in the browser.
        live ? (
          <YouTubeScene id={media.id} paused={paused} zoom={zoom} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail
          <img src={thumbnailOf(media)} alt="" className="cine-kenburns absolute inset-0 h-full w-full object-cover" />
        )
      ) : media?.kind === "image" && media.fit === "poster" ? (
        <PosterScene src={media.src} />
      ) : media?.kind === "image" && media.fit === "blur" ? (
        // eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer, as color only
        <img src={media.src} alt="" className="cine-kenburns absolute inset-0 h-full w-full scale-125 object-cover blur-3xl brightness-[0.6] saturate-150" />
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
      {/* Footage is dimmed a little so bright shots never wash out the words. */}
      {media && !(media.kind === "image" && media.fit) && <div className="absolute inset-0 bg-black/30" />}
      {/* Grain, vignette, and a fade into the page so the words always read. */}
      <div className="cine-grain absolute -inset-1/2 opacity-[0.14]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/75 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-deep-navy from-10% via-deep-navy/75 to-transparent" />
    </div>
  );
}

/**
 * A flyer behind the title: the whole poster, sharp, under the logo, over a
 * blurred and darkened copy of itself that fills the screen in its colors.
 * Its lower part fades into the page, where the title and buttons sit.
 */
function PosterScene({ src }: { src: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-[0.55] saturate-150" />
      {/* Between the logo and the words: the words take about 500px at the bottom on a phone. */}
      <div className="absolute inset-x-0 top-[104px] flex h-[clamp(140px,calc(100%-104px-510px),62%)] justify-center px-6 [mask-image:linear-gradient(to_bottom,black_75%,transparent)] lg:h-[clamp(140px,calc(100%-104px-470px),62%)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer */}
        <img src={src} alt="" className="cine-kenburns h-full w-auto max-w-full rounded-lg object-contain shadow-2xl shadow-black/60" />
      </div>
    </>
  );
}

const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";

/**
 * A YouTube video or Short as the backdrop: muted, looping, cropped to fill
 * the scene like a video file. Its thumbnail shows until the player reports
 * that it's playing, so YouTube's loading screen and title never show. If
 * the phone won't autoplay (low power mode) or asks for less motion, the
 * thumbnail stays.
 */
function YouTubeScene({ id, paused, zoom = 1.2 }: { id: string; paused: boolean; zoom?: number }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  // Read once in the browser; the player needs to know which page is talking to it.
  const [src] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? null
      : youtubeEmbedUrl(id, window.location.origin, { loop: true })
  );

  const command = (func: string) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), YOUTUBE_ORIGIN);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== YOUTUBE_ORIGIN || e.source !== frame.current?.contentWindow) return;
      let data: { event?: string; info?: { playerState?: number } | number };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      // Player state 1 means playing.
      const state = typeof data.info === "object" ? data.info?.playerState : data.event === "onStateChange" ? data.info : undefined;
      if (state === 1) setPlaying(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Commands sent before the player is ready are ignored; onLoad resends them.
  const sync = () => {
    command("mute");
    command(paused ? "pauseVideo" : "playVideo");
  };
  useEffect(sync);

  return (
    <div className="absolute inset-0 [container-type:size]">
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
      <img src={thumbnailOf({ kind: "youtube", id })} alt="" className="cine-kenburns absolute inset-0 h-full w-full object-cover" />
      {src && (
        <iframe
          ref={frame}
          src={src}
          title="Background video"
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          // Sized to cover the scene at 9:16 (a Short), then zoomed so YouTube's edges, and any black bars in the video, stay out of view.
          className={`absolute left-1/2 top-1/2 h-[max(100cqh,177.78cqw)] w-[max(100cqw,56.25cqh)] -translate-x-1/2 -translate-y-1/2 border-0 transition-opacity duration-1000 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          style={{ scale: String(zoom) }}
          onLoad={() => {
            // Ask the player to start sending its state.
            frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YOUTUBE_ORIGIN);
            sync();
          }}
        />
      )}
    </div>
  );
}
