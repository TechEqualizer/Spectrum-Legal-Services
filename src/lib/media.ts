// Reel media helpers shared by the funnel and the admin: reading pasted
// links, and picking a thumbnail.

import type { ReelMedia } from "@/data/funnel-types";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id in a YouTube link (watch, Shorts, youtu.be, embed or live), or null. */
export function parseYouTube(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    id = first === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live", "v"].includes(first) ? second : null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

const VIDEO_EXT = /\.(mp4|m4v|webm|mov|ogv)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/** Media for a pasted link, or a message saying why it can't be used. */
export function mediaFromLink(input: string): ReelMedia | string {
  const text = input.trim();
  if (!text) return "Paste a link first.";
  const youtube = parseYouTube(text);
  if (youtube) return { kind: "youtube", id: youtube };
  if (/(^|\.)(tiktok|instagram|facebook)\.com\//i.test(text)) {
    return "TikTok, Instagram and Facebook don't allow their videos to be embedded. Download the video and upload it instead.";
  }
  let path: string;
  try {
    const url = new URL(text, "https://placeholder.invalid");
    if (url.protocol !== "https:" && !text.startsWith("/")) {
      return "Links must start with https://.";
    }
    path = url.pathname;
  } catch {
    return "That doesn't look like a link.";
  }
  if (VIDEO_EXT.test(path)) return { kind: "video", src: text };
  if (IMAGE_EXT.test(path)) return { kind: "image", src: text };
  return "Paste a YouTube link, or a link to a video (.mp4, .webm, .mov) or photo (.jpg, .png, .webp).";
}

/** A still image for tiles and the admin list, if the media has one. */
export function thumbnailOf(media: ReelMedia | undefined): string | undefined {
  if (!media) return undefined;
  if (media.kind === "youtube") return `https://i.ytimg.com/vi/${media.id}/hqdefault.jpg`;
  if (media.kind === "image") return media.src;
  return media.poster;
}

/** The privacy-enhanced YouTube player, set up to be driven by the reel viewer. */
export function youtubeEmbedUrl(id: string, origin: string, { loop = false } = {}) {
  const params = new URLSearchParams({
    enablejsapi: "1",
    autoplay: "1",
    mute: "1",
    playsinline: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    origin,
    // A background loop: play the one video over and over, without YouTube's extras.
    ...(loop ? { loop: "1", playlist: id, disablekb: "1", fs: "0", iv_load_policy: "3" } : {}),
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

export const UPLOAD_LIMITS = {
  /** Bytes. Long reels are better trimmed than uploaded whole. */
  video: 500 * 1024 * 1024,
  image: 25 * 1024 * 1024,
  captions: 2 * 1024 * 1024,
};
