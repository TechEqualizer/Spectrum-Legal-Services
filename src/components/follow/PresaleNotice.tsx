"use client";

import { useEffect, useState } from "react";
import FollowSheet from "@/components/follow/FollowSheet";
import { useFollowTarget, useIsFollowing } from "@/components/follow/follow";
import type { Funnel } from "@/data/funnel-types";
import { eventDate, eventTime } from "@/lib/event-time";
import { formatEventDate, openPresale } from "@/lib/events";
import { isPreviewMode } from "@/lib/reel-tracking";

/**
 * A presale for followers, while one is open: a follower gets the presale
 * button (its link fetched for them alone, /api/fans/presale); anyone else,
 * "Fans get tickets first", which opens Follow. Nothing where the organizer
 * doesn't have Follow on, or without Core.
 */
export default function PresaleNotice({ funnel, now }: { funnel: Funnel; now: number }) {
  const target = useFollowTarget();
  const isFollowing = useIsFollowing(target?.organizer);
  // Presales for followers are part of Core.
  const event = target && target.core !== false ? openPresale(funnel, now) : undefined;
  const [links, setLinks] = useState<Record<string, string> | null>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!event || !isFollowing || isPreviewMode()) return;
    let live = true;
    fetch(`/api/fans/presale?slug=${encodeURIComponent(funnel.slug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { dates?: Record<string, string> } | null) => live && setLinks(d?.dates ?? {}))
      .catch(() => live && setLinks({}));
    return () => {
      live = false;
    };
  }, [event, isFollowing, funnel.slug]);

  if (!target || !event?.presale) return null;
  const ends = { startsAt: event.presale.endsAt, timeZone: event.timeZone };
  const until = `Until ${eventDate(ends, { weekday: "short", month: "short", day: "numeric" })}, ${eventTime(ends)}`;
  const link = links?.[event.id];

  return (
    <div className="mb-3 rounded-2xl border border-white/20 bg-black/35 px-4 py-3 text-white backdrop-blur-md">
      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-accent">Presale for fans &middot; {formatEventDate(event)}</p>
      {isFollowing ? (
        link ? (
          <>
            <a
              href={link}
              target="_blank"
              rel="noopener"
              className="mt-2 flex min-h-12 items-center justify-center rounded-full bg-teal-accent px-5 font-semibold text-on-accent shadow-md hover:brightness-110"
            >
              Get presale tickets
            </a>
            <p className="mt-1.5 text-center text-xs text-white/75">{until}. Just for you, as a follower.</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-white/85">{links ? "The presale link isn't ready yet. Check back soon." : "Loading your presale..."}</p>
        )
      ) : (
        <>
          <p className="mt-1 text-sm text-white/85">Fans get tickets first. {until}.</p>
          <button
            type="button"
            onClick={() => setFollowing(true)}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 font-semibold text-white hover:bg-white/20"
          >
            Follow for presale
          </button>
        </>
      )}
      {following && <FollowSheet target={target} fixed onClose={() => setFollowing(false)} />}
    </div>
  );
}
