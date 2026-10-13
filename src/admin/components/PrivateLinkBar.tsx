"use client";

import Link from "next/link";
import { useEffect } from "react";
import { setPreviewMode } from "@/lib/reel-tracking";
import { goLiveHref } from "@/admin/go-live";

/**
 * Over the organizer's own link before it's live (/admin/link/<slug>): only
 * they can see it, and Go live (its sheet, in the admin). Their own taps aren't counted as visits.
 * Rendered before the link, so tracking is off before the link starts.
 */
export default function PrivateLinkBar({ organizer }: { organizer: string }) {
  useEffect(() => setPreviewMode(true), []);
  return (
    // Phones: the top right, clear of the logo. Wider screens: the top left, beside the link's column.
    <div className="pointer-events-none fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] max-w-[calc(100%-1.5rem)] md:left-4 md:right-auto md:top-4">
      <div role="status" className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full bg-black/80 py-1 pl-3.5 pr-1 text-[13px] font-semibold text-white shadow-lg ring-1 ring-white/15 backdrop-blur">
        {/* Phones: short, so it covers as little of the link as it can. */}
        <span className="md:hidden">Private</span>
        <span className="hidden truncate md:inline">Only you can see this</span>
        <Link href={goLiveHref(organizer)} className="flex min-h-9 flex-shrink-0 items-center rounded-full bg-[#e8be5a] px-4 text-[13px] font-bold text-[#1a1208] hover:brightness-110">
          Go live
        </Link>
      </div>
    </div>
  );
}
