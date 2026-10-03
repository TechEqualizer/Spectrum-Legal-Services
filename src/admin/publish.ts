// Publishing the editor's work to the live funnel link, through
// /api/admin/publish. Uploaded files go straight from the browser to
// storage first, so the published version only has public links.

import type { HeroMediaEdit } from "@/admin/drafts";
import type { EditorFunnel, EditorReel } from "@/admin/editor-model";
import type { FunnelEvent, ReelMedia } from "@/data/funnel-types";
import type { Look } from "@/lib/look";
import type { Publication, ScreenCopy } from "@/lib/publication";

export type EditorState = {
  reels: EditorReel[];
  funnels: EditorFunnel[];
  heroMedia: HeroMediaEdit;
  /** Only the words that differ from the built-in ones. */
  screen?: ScreenCopy;
  /** Event dates (undefined: the built-in ones). */
  events?: FunnelEvent[];
  /** Brand colors and title typeface (undefined: the built-in ones). */
  look?: Look;
};
export type LiveState = EditorState & { publishedAt: string | null; publishedBy: string | null };

/** The funnel that gets published: the default one. */
export const publishedFunnel = (funnels: EditorFunnel[]) => funnels.find((f) => f.isDefault) ?? funnels[0];

/** What a publish would store, from the editor's state. */
export function toPublication({ reels, funnels, heroMedia, screen, events, look }: EditorState): Publication {
  const f = publishedFunnel(funnels);
  const used = new Set(f.order);
  return {
    version: 1,
    reels: reels.filter((r) => used.has(r.id)),
    funnel: { order: f.order, topics: f.topics, paths: f.paths, primaryCta: f.primaryCta },
    ...(heroMedia !== undefined ? { backdrop: heroMedia } : {}),
    ...(screen && Object.keys(screen).length ? { screen } : {}),
    ...(look ? { look } : {}),
    ...(events
      ? {
          events: [...events]
            .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
            // A date can only open a reel that's in the published funnel.
            .map((e) => {
              if (!e.reelId || used.has(e.reelId)) return e;
              const unlinked = { ...e };
              delete unlinked.reelId;
              return unlinked;
            }),
        }
      : {}),
  };
}

/** JSON with object keys sorted, so the same content always gives the same text. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** For telling whether the editor differs from what's live: same content, same key. */
export function publicationKey(state: EditorState) {
  const publication = toPublication(state);
  // Reels in funnel order, so the library's own order doesn't count as a change.
  const order = publication.funnel.order;
  publication.reels = [...publication.reels].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return stableJson(publication);
}

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init).catch(() => null);
  if (!res) throw new Error("Couldn't reach the server. Check your connection and try again.");
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) throw new Error("Your sign-in expired. Sign in again, then publish.");
  if (!res.ok) throw new Error(body.error ?? "Something went wrong. Try again.");
  return body;
}

/** What's live for a business: its built-in editor state with the published edits on top. */
export async function fetchLive(slug: string, builtIn: EditorState): Promise<LiveState> {
  const { publication, publishedAt, publishedBy } = await call<{
    publication: Publication | null;
    publishedAt?: string;
    publishedBy?: string;
  }>(`/api/admin/publish?slug=${encodeURIComponent(slug)}`);
  if (!publication) return { ...builtIn, publishedAt: null, publishedBy: null };
  const published = new Set(publication.reels.map((r) => r.id));
  const funnelId = publishedFunnel(builtIn.funnels).id;
  return {
    // Published reels, plus built-in ones that aren't in it (so they can be added back).
    reels: [...publication.reels, ...builtIn.reels.filter((r) => !published.has(r.id))],
    funnels: builtIn.funnels.map((f) => (f.id === funnelId ? { ...f, ...publication.funnel } : f)),
    heroMedia: "backdrop" in publication ? publication.backdrop : undefined,
    screen: publication.screen,
    events: publication.events,
    look: publication.look,
    publishedAt: publishedAt ?? null,
    publishedBy: publishedBy ?? null,
  };
}

const EXT: Record<string, string> = {
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "image/jpeg": "jpg",
  "image/png": "png", "image/webp": "webp", "image/gif": "gif", "text/vtt": "vtt",
};

async function uploadOne(slug: string, blobUrl: string): Promise<string> {
  const blob = await fetch(blobUrl).then((r) => r.blob()).catch(() => null);
  if (!blob) throw new Error("An uploaded file is missing from this browser. Upload it again, then publish.");
  const type = blob.type === "text/plain" ? "text/vtt" : blob.type;
  const { uploadUrl, publicUrl } = await call<{ uploadUrl: string; publicUrl: string }>("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, name: `upload.${EXT[type] ?? "bin"}`, type, size: blob.size }),
  });
  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": type }, body: blob }).catch(() => null);
  if (!put?.ok) throw new Error("A file didn't upload. Check your connection and try again.");
  return publicUrl;
}

function swapMedia<T extends ReelMedia | null | undefined>(media: T, urls: Map<string, string>): T {
  if (!media || media.kind === "youtube") return media;
  const swap = (s: string | undefined) => (s && urls.get(s)) ?? s;
  return { ...media, src: swap(media.src), ...(media.kind === "video" ? { poster: swap(media.poster), captions: swap(media.captions) } : {}) } as T;
}

/**
 * Uploads any files that only exist in this browser, then publishes.
 * Returns the state with public links in place of uploads.
 */
export async function publish(
  slug: string,
  state: EditorState,
  onProgress: (message: string) => void
): Promise<{ state: EditorState; publishedAt: string }> {
  const uploads = new Set<string>();
  const collect = (m: ReelMedia | null | undefined) => {
    if (!m || m.kind === "youtube") return;
    for (const s of [m.src, m.kind === "video" ? m.poster : undefined, m.kind === "video" ? m.captions : undefined]) {
      if (s?.startsWith("blob:")) uploads.add(s);
    }
  };
  const used = new Set(publishedFunnel(state.funnels).order);
  state.reels.filter((r) => used.has(r.id)).forEach((r) => collect(r.media));
  collect(state.heroMedia);
  // The flyer kept with the look, so its background choices work after a reload.
  if (state.look?.flyer?.startsWith("blob:")) uploads.add(state.look.flyer);

  const urls = new Map<string, string>();
  let n = 0;
  for (const blobUrl of uploads) {
    onProgress(`Uploading ${++n} of ${uploads.size}...`);
    urls.set(blobUrl, await uploadOne(slug, blobUrl));
  }
  const next: EditorState = {
    reels: state.reels.map((r) => (r.media ? { ...r, media: swapMedia(r.media, urls) } : r)),
    funnels: state.funnels,
    heroMedia: swapMedia(state.heroMedia, urls),
    screen: state.screen,
    events: state.events,
    look: state.look?.flyer ? { ...state.look, flyer: urls.get(state.look.flyer) ?? state.look.flyer } : state.look,
  };

  onProgress("Publishing...");
  const { publishedAt } = await call<{ publishedAt: string }>("/api/admin/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, publication: toPublication(next) }),
  });
  return { state: next, publishedAt };
}

/** Takes published edits down; the link goes back to its built-in content. */
export async function takeDown(slug: string) {
  await call(`/api/admin/publish?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
}
