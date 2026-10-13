"use client";

import { useEffect, useRef, useState } from "react";
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
 * and nothing in it is a visit or sends anything (preview mode). No link in
 * it leaves the wizard: a tap on Tickets (or any link) says where it goes on
 * the live link instead.
 */
export default function StartPreview() {
  const [state, setState] = useState<State | null>(null);
  const [note, setNote] = useState("");
  const hide = useRef(0);

  // Links stay in the phone: say where they'd go, a moment, instead of leaving the wizard for them.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.getAttribute("href")?.startsWith("#")) return;
      e.preventDefault();
      const url = new URL(a.href, window.location.href);
      const where = url.origin === window.location.origin || !/^https?:$/.test(url.protocol) ? "" : url.hostname.replace(/^www\./, "");
      setNote(where ? `On your live link, this opens ${where}.` : "This works on your live link.");
      window.clearTimeout(hide.current);
      hide.current = window.setTimeout(() => setNote(""), 2600);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(hide.current);
    };
  }, []);

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
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-6">
        {note && (
          <p data-testid="preview-note" className="max-w-full rounded-full bg-black/85 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg ring-1 ring-white/15 backdrop-blur">
            {note}
          </p>
        )}
      </div>
    </FollowProvider>
  );
}
