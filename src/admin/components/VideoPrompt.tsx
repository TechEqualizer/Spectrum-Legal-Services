"use client";

import { useEffect, useId, useState } from "react";

/**
 * A drafted video prompt, ready to copy into a video tool. Closed by
 * default: one line saying it's there, with Copy always in reach.
 */
export default function VideoPrompt({ prompt, what = "this reel" }: { prompt: string; what?: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      // No clipboard access: select the text so it can be copied by hand.
      const el = document.getElementById(`${id}-text`);
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <details className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 text-sm">
        <span className="font-semibold text-deep-navy">Video prompt</span>
        <span className="min-w-0 flex-1 truncate text-gray-600">For a video tool, to make {what}</span>
        <svg className="h-4 w-4 flex-shrink-0 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9l-7 7-7-7" /></svg>
      </summary>
      <div className="border-t border-gray-100 px-4 pb-4 pt-3">
        <p id={`${id}-text`} className="max-h-48 overflow-y-auto whitespace-pre-line text-sm text-charcoal">{prompt}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={copy}
            className="min-h-10 rounded-md bg-deep-navy px-4 text-sm font-semibold text-white hover:bg-royal-blue"
          >
            {copied ? "Copied ✓" : "Copy prompt"}
          </button>
          <p className="min-w-0 flex-1 text-xs text-gray-600">Paste it into a video tool, then upload the clip here.</p>
        </div>
        <span role="status" className="sr-only">{copied ? "Prompt copied" : ""}</span>
      </div>
    </details>
  );
}
