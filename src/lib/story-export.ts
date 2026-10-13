"use client";

// The opening as a video for Instagram Stories and TikTok, made in the
// organizer's own browser with Remotion's web renderer (docs/plans/
// 07-story-export.md): 1080×1920, H.264 in an MP4, silent (music is added in
// the app they post from), ending on a card with the title, when, and where
// to get tickets. Free per event; the renderer is loaded only when asked for.

import type { OpeningRecipe } from "@/lib/opening";
import { OpeningScene, openingFrames } from "@/remotion/OpeningScene";

const FPS = 30;
/** How long the end card holds: long enough to read the link and add a sticker over it. */
const CARD_SECONDS = 3.5;

export type StoryInput = {
  /** The flyer (same-origin or a public link). */
  src: string;
  recipe: OpeningRecipe;
  /** The flyer's depth map, for parallax. */
  depth?: string;
  /** The look's title font class, and whether its big lines are capitals. */
  fontClass: string;
  caps: boolean;
  /** The look's highlight, as a hex color (the renderer draws outside the page's theme). */
  accent: string;
  title: string;
  /** "Sat, Oct 31 · 8 PM", or "". */
  when: string;
  /** "showlnk.com/f/masquerade" */
  link: string;
};

/** Says why this browser can't make the video, in words for the organizer, or null when it can. */
export async function storyProblem(): Promise<string | null> {
  if (typeof VideoEncoder === "undefined") return "This browser can't make videos. Try the latest Chrome or Safari.";
  const { getEncodableVideoCodecs } = await import("@remotion/web-renderer");
  const codecs: string[] = await getEncodableVideoCodecs("mp4").catch(() => []);
  // Instagram wants H.264; anything else may not post.
  return codecs.includes("h264") ? null : "This browser can't make an Instagram-ready video. Try the latest Chrome or Safari.";
}

/** Renders the Stories video. `onProgress` gets 0 to 1. */
export async function renderStory(input: StoryInput, onProgress: (p: number) => void, signal?: AbortSignal): Promise<Blob> {
  const problem = await storyProblem();
  if (problem) throw new Error(problem);
  const { renderMediaOnWeb } = await import("@remotion/web-renderer");
  const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("Couldn't open your flyer. Import it again, then try."));
    img.src = input.src;
  });
  // The title font has to be loaded before the first frame is drawn.
  await document.fonts.ready;
  const story = { title: input.title, when: input.when, link: input.link, holdSeconds: CARD_SECONDS };
  const props = { src: input.src, width: size.w, height: size.h, recipe: input.recipe, fontClass: input.fontClass, caps: input.caps, accent: input.accent, story, ...(input.depth ? { depth: input.depth } : {}) };
  const result = await renderMediaOnWeb({
    composition: { component: OpeningScene, id: "story", width: 1080, height: 1920, fps: FPS, durationInFrames: openingFrames(input.recipe, FPS, CARD_SECONDS).total, defaultProps: props },
    inputProps: props,
    container: "mp4",
    videoCodec: "h264",
    videoBitrate: "high",
    muted: true,
    // Showlnk qualifies for Remotion's free license (a company of up to three people).
    licenseKey: "free-license",
    signal: signal ?? null,
    onProgress: (p) => onProgress(p.progress),
  });
  return result.getBlob();
}
