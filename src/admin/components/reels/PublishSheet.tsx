"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon } from "@/admin/components/ui/icons";

/**
 * Publishing, with the care it deserves: it rewrites the link in their bio
 * and on printed QR codes. First what's about to change and Publish now;
 * then the link, updated, with View live, Copy link and Share, so the next
 * thing they do is post it. When the link isn't live yet (not paid), it says
 * the edits are saved to it and only they can see them.
 */
export default function PublishSheet({
  step,
  changes,
  link,
  live,
  publishing,
  error,
  onConfirm,
  onClose,
}: {
  step: "confirm" | "done";
  /** What differs from the live link, in plain words. */
  changes: string[];
  /** The public link's path, like /f/masquerade. */
  link: string;
  /** Whether the link is public (Core). */
  live: boolean;
  /** Progress while publishing ("Uploading 1 of 2…"), or empty. */
  publishing: string;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => ref.current?.showModal(), []);
  const url = typeof window === "undefined" ? link : `${window.location.origin}${link}`;
  const shown = url.replace(/^https?:\/\/(www\.)?/, "");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link stays on screen to copy by hand.
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => publishing && e.preventDefault()}
      aria-labelledby={`${id}-title`}
      aria-busy={Boolean(publishing)}
      className="m-auto max-h-[92dvh] w-[min(28rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      {step === "confirm" ? (
        <div className="p-5">
          <h2 id={`${id}-title`} className="text-xl font-bold text-deep-navy">Publish your edits?</h2>
          <p className="mt-1 text-sm text-gray-600">
            {live ? <>Everyone who opens <span className="font-semibold text-deep-navy">{shown}</span> sees these right away.</> : <>They go on <span className="font-semibold text-deep-navy">{shown}</span>, which stays private until you go live.</>}
          </p>
          <ul role="list" aria-label="What changes" className="mt-4 divide-y divide-gray-100 rounded-xl bg-white">
            {changes.map((c) => (
              <li key={c} className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm text-deep-navy">
                <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-deep-navy" />
                {c}
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button type="button" disabled={Boolean(publishing)} onClick={() => ref.current?.close()} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white disabled:opacity-40">
              Not yet
            </button>
            <button
              type="button"
              disabled={Boolean(publishing)}
              onClick={onConfirm}
              className="min-h-11 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue disabled:opacity-60"
            >
              {publishing || "Publish now"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-deep-navy text-white" aria-hidden="true">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h2 id={`${id}-title`} className="mt-3 text-xl font-bold text-deep-navy">{live ? "Your link is updated" : "Saved to your link"}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {live ? "Post it, or share it where your fans are." : "Only you can see it until you go live. Go live from Settings, then share it."}
          </p>
          <p className="mt-4 break-all rounded-xl bg-white px-4 py-3 text-sm font-semibold text-deep-navy">{shown}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={copy} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
              <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
            </button>
            <a href={link} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
              View {live ? "live" : "your link"}
            </a>
            {canShare && live && (
              <button
                type="button"
                onClick={() => navigator.share({ url, title: "Get tickets" }).catch(() => {})}
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray sm:col-span-2"
              >
                Share
              </button>
            )}
          </div>
          <button type="button" onClick={() => ref.current?.close()} className="mt-4 min-h-11 w-full rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
            Done
          </button>
        </div>
      )}
    </dialog>
  );
}
