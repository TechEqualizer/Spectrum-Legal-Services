"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import OpeningBackdrop from "@/components/OpeningBackdrop";
import { titleFontClass } from "@/components/lookFonts";
import type { LookFont } from "@/lib/look";
import { parseCut, parseOpening, type OpeningMood, type OpeningRecipe } from "@/lib/opening";
import { OpeningScene, cutFrames, openingFrames } from "@/remotion/OpeningScene";

type Review = { src: string; recipe: unknown; font?: LookFont; accent?: string; title?: string; tagline?: string; frames?: boolean; exporting?: boolean; reel?: boolean; role?: "the_night" | "your_people" | "last_call"; depth?: string };
/** reel: a reel's flyer cut (.claude/skills/flyer-cuts), under a stand-in of the reel's title and Tickets. */
type Ready = { src: string; depth?: string; recipe: OpeningRecipe; font?: LookFont; accent: string; title: string; tagline: string; frames: boolean; exporting: boolean; reel: boolean };

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
      const recipe = r && (r.reel ? parseCut(r.recipe, (r.recipe as { mood?: OpeningMood } | null)?.mood, r.role) : parseOpening(r.recipe));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser on mount
      if (!r || !recipe) setProblem("No recipe, or not a valid one.");
      else setReview({ src: r.src, ...(r.depth ? { depth: r.depth } : {}), recipe, font: r.font, accent: r.accent ?? "#ffffff", title: r.title ?? "", tagline: r.tagline ?? "", frames: Boolean(r.frames), exporting: Boolean(r.exporting), reel: Boolean(r.reel) });
    } catch {
      setProblem("No recipe, or not a valid one.");
    }
  }, []);
  if (problem) return <main className="p-6 text-white">{problem}</main>;
  if (!review) return null;
  const font = titleFontClass(review.font);
  const caps = review.font === "regal" || review.font === "bold";
  if (review.exporting) return <Exporting review={review} fontClass={font} caps={caps} />;
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white" style={{ "--sky-accent": review.accent } as React.CSSProperties}>
      {review.frames ? (
        <Frames review={review} fontClass={font} caps={caps} onHold={setHeld} />
      ) : (
        <OpeningBackdrop src={review.src} recipe={review.recipe} fontClass={font} caps={caps} paused={false} skip={false} onHold={() => setHeld(true)} />
      )}
      {review.reel && <ReelChrome title={review.title} accent={review.accent} />}
      {held && !review.reel && (
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
  // A reel's cut has no hold: it ends when the whole flyer has had its moment.
  const cut = review.reel ? cutFrames(review.recipe, FPS) : 0;
  const { holdStart, total } = review.reel ? { holdStart: cut - 1, total: cut } : openingFrames(review.recipe, FPS);
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
      inputProps={{ src: review.src, width: size.w, height: size.h, recipe: review.recipe, fontClass, caps, accent: "var(--sky-accent, #ffffff)", reel: review.reel, depth: review.depth }}
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

/**
 * Renders the opening to a Stories MP4 in this browser (Remotion's web
 * renderer), for the review script to save: window.__exportOpening().
 */
function Exporting({ review, fontClass, caps }: { review: Ready; fontClass: string; caps: boolean }) {
  const [state, setState] = useState("ready");
  useEffect(() => {
    const w = window as unknown as { __exportOpening?: unknown };
    // With frames, draws just those frames as JPEGs (a quick look at what the video will show).
    w.__exportOpening = async (frames?: number[]) => {
      const { renderMediaOnWeb, renderStillOnWeb, getEncodableVideoCodecs } = await import("@remotion/web-renderer");
      const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = review.src;
      });
      const codecs = await getEncodableVideoCodecs("mp4");
      const story = { title: review.title, when: review.tagline, link: "showlnk.com/f/your-event", holdSeconds: 3.5 };
      const { total } = openingFrames(review.recipe, FPS, story.holdSeconds);
      const started = Date.now();
      const props = { src: review.src, width: size.w, height: size.h, recipe: review.recipe, fontClass, caps, accent: review.accent, story };
      if (frames) {
        const composition = { component: OpeningScene, id: "opening", width: 1080, height: 1920, fps: FPS, durationInFrames: total, defaultProps: props };
        const stills: string[] = [];
        for (const frame of frames) {
          const still = await renderStillOnWeb({ composition, inputProps: props, frame, licenseKey: "free-license" });
          const bytes = new Uint8Array(await (await still.blob({ format: "jpeg", quality: 0.85 })).arrayBuffer());
          let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          stills.push(btoa(bin));
        }
        return { stills };
      }
      const result = await renderMediaOnWeb({
        composition: { component: OpeningScene, id: "opening", width: 1080, height: 1920, fps: FPS, durationInFrames: total, defaultProps: props },
        inputProps: props,
        container: "mp4",
        videoCodec: codecs.includes("h264") ? "h264" : codecs[0],
        muted: true,
        licenseKey: "free-license",
        onProgress: (p) => setState(`rendering ${Math.round(p.progress * 100)}%`),
      });
      const blob = await result.getBlob();
      setState("done");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { codecs, seconds: (Date.now() - started) / 1000, type: blob.type, base64: btoa(bin) };
    };
  }, [review, fontClass, caps]);
  return <main className="p-6 text-white" data-export-state={state}>{state}</main>;
}

/** A stand-in for the reel's own bottom: its organizer, title and Tickets, where a cut's words must not go. */
function ReelChrome({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pb-4 pl-3 pr-[76px] pt-24">
      <div className="flex items-center gap-2">
        <span className="h-8 w-8 rounded-full ring-1 ring-white/70" style={{ backgroundColor: accent }} />
        <span className="text-[15px] font-semibold">@organizer</span>
        <span className="flex h-7 items-center rounded-full px-3 text-sm font-semibold text-black" style={{ backgroundColor: accent }}>Tickets</span>
      </div>
      <p className="mt-2.5 line-clamp-1 text-[15px]">{title}</p>
    </div>
  );
}
