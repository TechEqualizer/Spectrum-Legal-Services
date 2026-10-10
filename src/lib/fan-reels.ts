// Fans-only reels (docs/plans/02-fans.md, step 3). Their files live in the
// private reel-media-fans bucket, named in the reel's media by a reference
// ("fans:<event slug>/<file>") instead of an address. Nothing that reaches
// visitors carries their media: resolveLink drops it, and followers get
// short-lived signed addresses from /api/fans/media.

import type { Funnel, Reel, ReelMedia } from "@/data/funnel-types";
import type { Publication } from "@/lib/publication";

export const FAN_REF_PREFIX = "fans:";
export const FAN_BUCKET = "reel-media-fans";

/** A reference to a file in the private bucket, in an event's own folder. */
const FAN_REF = /^fans:([a-z0-9-]{1,80})\/[a-z0-9][a-z0-9.-]{0,159}$/;

export const isFansReel = (reel: Pick<Reel, "visibility">) => reel.visibility === "fans";
export const isFanRef = (v: unknown): v is string => typeof v === "string" && FAN_REF.test(v);
/** The event folder a reference points into. */
export const fanRefFolder = (ref: string) => ref.match(FAN_REF)?.[1];
/** The file's path in the bucket. */
export const fanRefPath = (ref: string) => ref.slice(FAN_REF_PREFIX.length);

/** Every private reference in a reel's media (file, cover, captions). */
export function fanRefsOf(media: ReelMedia | undefined): string[] {
  if (!media || media.kind === "youtube") return [];
  const all = [media.src, media.kind === "video" ? media.poster : undefined, media.kind === "video" ? media.captions : undefined];
  return all.filter(isFanRef);
}

/** Swaps private references for addresses (e.g. signed ones); references without one are left as they are. */
export function swapFanRefs(media: ReelMedia, urls: Record<string, string>): ReelMedia {
  if (media.kind === "youtube") return media;
  const swap = (s: string | undefined) => (s && urls[s]) || s;
  return media.kind === "video"
    ? { ...media, src: swap(media.src)!, poster: swap(media.poster), captions: swap(media.captions) }
    : { ...media, src: swap(media.src)! };
}

const strip = <R extends Reel>(reel: R): R => {
  if (!isFansReel(reel) || !reel.media) return reel;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- left out on purpose
  const { media, ...rest } = reel;
  return rest as R;
};

/** The funnel with every fans-only reel's media left out: what visitors may see. */
export const withoutFanMedia = (funnel: Funnel): Funnel =>
  funnel.reels.some(isFansReel) ? { ...funnel, reels: funnel.reels.map(strip) } : funnel;

/** The same for a publication. */
export const publicationWithoutFanMedia = (publication: Publication | null): Publication | null =>
  publication && publication.reels.some(isFansReel) ? { ...publication, reels: publication.reels.map(strip) } : publication;
