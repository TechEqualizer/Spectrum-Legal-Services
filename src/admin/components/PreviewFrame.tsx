"use client";

import { useEffect, useState } from "react";
import FunnelExperience from "@/components/FunnelExperience";
import type { Publication } from "@/lib/publication";
import { setPreviewMode } from "@/lib/reel-tracking";

/** What the studio sends the preview. */
export type PreviewMessage =
  | { type: "preview:state"; publication: Publication }
  /** Back to the opening screen, or straight into a reel. */
  | { type: "preview:go"; reelId?: string };

/**
 * The funnel as visitors get it, with the editor's edits: the studio posts
 * the draft publication in, and where to start. Nothing here is tracked.
 */
export default function PreviewFrame({ slug }: { slug: string }) {
  const [publication, setPublication] = useState<Publication | null>(null);
  const [go, setGo] = useState<{ reelId?: string; key: number }>({ key: 0 });

  useEffect(() => {
    setPreviewMode(true);
    const onMessage = (e: MessageEvent<PreviewMessage>) => {
      // Only the admin page on this site may drive the preview.
      if (e.origin !== window.location.origin || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "preview:state") setPublication(e.data.publication);
      if (e.data.type === "preview:go") {
        const reelId = e.data.reelId;
        setGo((g) => ({ reelId, key: g.key + 1 }));
      }
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "preview:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!publication) return <div className="min-h-dvh bg-deep-navy" />;
  return <FunnelExperience key={go.key} slug={slug} publication={publication} startReelId={go.reelId} />;
}
