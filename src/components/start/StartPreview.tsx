"use client";

import { useEffect, useState } from "react";
import FunnelExperience from "@/components/FunnelExperience";
import type { Funnel } from "@/data/funnel-types";
import type { Publication } from "@/lib/publication";
import { setPreviewMode } from "@/lib/reel-tracking";

type State = { funnel: Funnel; publication: Publication; key: number };

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
      const { funnel, publication } = e.data as { funnel: Funnel; publication: Publication };
      // A new look or flyer replays the opening, so the change is seen.
      setState((s) => ({ funnel, publication, key: (s?.key ?? 0) + 1 }));
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "start:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!state) return <div className="min-h-dvh bg-[#0b0710]" />;
  return <FunnelExperience key={state.key} funnel={state.funnel} publication={state.publication} />;
}
