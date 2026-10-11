"use client";

import { useState } from "react";
import type { LiveState } from "@/admin/publish";

/**
 * An event's settings: one link, one story. The link itself (copy, open),
 * where ticket links live (on each date), and taking published edits down,
 * which changes the public link at once and so asks first.
 */
export default function LinkSettings({ link, live, onTakeDown }: { link: string; live: LiveState | null; onTakeDown: () => void }) {
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? link : `${window.location.origin}${link}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="p-4 xl:p-0">
      <div className="divide-y divide-gray-100 rounded-xl bg-white">
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-deep-navy">Your link</p>
          <p className="mt-0.5 break-all text-sm text-gray-600">{url.replace(/^https?:\/\/(www\.)?/, "")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
              <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
            </button>
            <a href={link} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
              Open
            </a>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-deep-navy">Tickets</p>
          <p className="mt-0.5 text-sm text-gray-600">Every reel ends on Tickets. Each date has its own ticket link: set it on the date.</p>
        </div>
      </div>
      {live?.publishedAt && (
        <div className="mt-4 px-1">
          {asking ? (
            <div role="group" aria-label="Take down your published edits?" className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5">
              <p className="text-sm text-gray-800">
                Take down your published edits? Your link goes back to its original reels right away, for everyone. Your edits stay here.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setAsking(false);
                    onTakeDown();
                  }}
                  className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800"
                >
                  Take down
                </button>
                <button type="button" onClick={() => setAsking(false)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-deep-navy hover:bg-white">
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => setAsking(true)} className="min-h-11 text-sm font-semibold text-red-700 hover:underline">
                Take down published edits
              </button>
              <p className="text-xs text-gray-600">Your link goes back to its original reels. Your edits stay here.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
