"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

// Following an organizer on their links (docs/plans/02-fans.md, step 2).
// The page provides who can be followed, only for organizers with Follow
// switched on; without a provider (demos, the admin's preview) every
// button keeps its old "Text me later" job.

export type FollowTarget = {
  /** The organizer's slug. */
  organizer: string;
  /** Their name, as fans see it. */
  name: string;
  /** The event link it's followed from, if any. */
  funnelId?: string;
  /** The organizer has Core: presales and fans-only reels work for followers (else they stay closed). */
  core?: boolean;
};

const FollowContext = createContext<FollowTarget | null>(null);

export function FollowProvider({ value, children }: { value: FollowTarget | undefined; children: React.ReactNode }) {
  return <FollowContext.Provider value={value ?? null}>{children}</FollowContext.Provider>;
}

/** Who this link lets visitors follow, or null when Follow is off here. */
export const useFollowTarget = () => useContext(FollowContext);

// Who this browser follows, asked once per page and shared by every button.
let following: string[] | null = null;
let asked = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function ask() {
  if (asked) return;
  asked = true;
  fetch("/api/fans/me", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { following: [] }))
    .then((d: { following?: string[] }) => {
      following = Array.isArray(d.following) ? d.following : [];
      emit();
    })
    .catch(() => {
      following = [];
      emit();
    });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Whether this browser follows the organizer (false until known). */
export function useIsFollowing(organizer: string | undefined): boolean {
  useEffect(() => {
    if (organizer) ask();
  }, [organizer]);
  return useSyncExternalStore(
    subscribe,
    () => Boolean(organizer && following?.includes(organizer)),
    () => false
  );
}

/** Records an unfollow here, so every button updates at once. */
export function markUnfollowed(organizer: string) {
  following = (following ?? []).filter((o) => o !== organizer);
  emit();
}

/** The label a Follow button shows. */
export const followLabel = (isFollowing: boolean) => (isFollowing ? "Following ✓" : "Follow");
