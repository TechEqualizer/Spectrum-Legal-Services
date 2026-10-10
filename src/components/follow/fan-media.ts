"use client";

import { useEffect, useMemo, useState } from "react";
import { useFollowTarget, useIsFollowing } from "@/components/follow/follow";
import type { Funnel, ReelMedia } from "@/data/funnel-types";
import { fanRefsOf, isFansReel, swapFanRefs } from "@/lib/fan-reels";
import { isPreviewMode } from "@/lib/reel-tracking";

/**
 * The funnel with its fans-only reels playable where this viewer may watch
 * them: a follower of the organizer (signed addresses from /api/fans/media),
 * or the event's admins in the studio's preview. Everyone else keeps the
 * locked reels as they came (no media).
 */
export function useFanMedia(funnel: Funnel): Funnel {
  const follow = useFollowTarget();
  const isFollowing = useIsFollowing(follow?.organizer);
  const [media, setMedia] = useState<Record<string, ReelMedia>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});

  const fansReels = funnel.reels.filter(isFansReel);
  // In the preview: the private files the editor's reels name.
  const refs = fansReels.flatMap((r) => fanRefsOf(r.media)).sort().join(" ");
  const needsFollow = fansReels.some((r) => !r.media);

  useEffect(() => {
    if (!refs || !isPreviewMode()) return;
    let live = true;
    fetch("/api/admin/fan-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: funnel.slug, refs: refs.split(" ") }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { urls?: Record<string, string> } | null) => live && d?.urls && setUrls(d.urls))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [refs, funnel.slug]);

  useEffect(() => {
    if (!needsFollow || !isFollowing || isPreviewMode()) return;
    let live = true;
    fetch(`/api/fans/media?slug=${encodeURIComponent(funnel.slug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reels?: Record<string, ReelMedia> } | null) => live && d?.reels && setMedia(d.reels))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [needsFollow, isFollowing, funnel.slug]);

  return useMemo(() => {
    if (!fansReels.length) return funnel;
    return {
      ...funnel,
      reels: funnel.reels.map((r) => {
        if (!isFansReel(r)) return r;
        if (!r.media) return media[r.id] && isFollowing ? { ...r, media: media[r.id] } : r;
        return fanRefsOf(r.media).length ? { ...r, media: swapFanRefs(r.media, urls) } : r;
      }),
    };
    // fansReels follows funnel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel, media, urls, isFollowing]);
}
