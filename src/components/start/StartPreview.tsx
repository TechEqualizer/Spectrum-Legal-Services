"use client";

import { useEffect, useState } from "react";
import FunnelExperience from "@/components/FunnelExperience";
import { FollowProvider, type FollowTarget } from "@/components/follow/follow";
import type { Funnel } from "@/data/funnel-types";
import type { Publication } from "@/lib/publication";
import { setPreviewMode } from "@/lib/reel-tracking";

/** What the wizard sends: the link to show, and whether to start it over (at a reel). */
export type StartState = {
  type: "start:state";
  funnel: Funnel;
  publication: Publication;
  /** Show Follow, as on a Core organizer's link. */
  follow?: FollowTarget;
  /** Start the link over, so a change is seen; at this reel when given. */
  replay?: boolean;
  startReelId?: string;
};

type State = Omit<StartState, "type"> & { key: number };

/**
 * The phone beside the sign-up wizard: the real funnel player, showing the
 * link the organizer's draft makes. Only the wizard on this site drives it,
 * and nothing in it is a visit or sends anything (preview mode).
 */
export default function StartPreview() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    setPreviewMode(true);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "start:state") return;
      const { funnel, publication, follow, replay, startReelId } = e.data as StartState;
      // Words being typed change in place; a new flyer, look or step starts over.
      setState((s) => ({
        funnel,
        publication,
        follow,
        startReelId: replay ? startReelId : s?.startReelId,
        key: (s?.key ?? 0) + (replay || !s ? 1 : 0),
      }));
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "start:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!state) return <div className="min-h-dvh bg-[#0b0710]" />;
  return (
    <FollowProvider value={state.follow}>
      <FunnelExperience key={state.key} funnel={state.funnel} publication={state.publication} startReelId={state.startReelId} />
    </FollowProvider>
  );
}
