"use client";

import { useEffect, useId, useRef, useState } from "react";
import MediaPicker from "@/admin/components/MediaPicker";
import type { HeroMediaEdit } from "@/admin/drafts";
import { wordmarkFont } from "@/components/BrandLogo";
import type { ReelMedia } from "@/data/funnel-types";
import { thumbnailOf } from "@/lib/media";

const KIND_LABELS: Record<ReelMedia["kind"], string> = {
  video: "Video",
  youtube: "YouTube video",
  image: "Photo",
};

/**
 * The opening screen's background, at the top of the Reels page: what plays
 * behind the title when someone opens the link. Attach, swap or remove it.
 */
export default function HeroMediaCard({
  title,
  live,
  value,
  edited = false,
  onChange,
}: {
  /** The opening screen's title, for the preview. */
  title: string;
  /** What the live link shows now. */
  live: ReelMedia | undefined;
  value: HeroMediaEdit;
  /** Differs from what's live. */
  edited?: boolean;
  onChange: (media: HeroMediaEdit, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // What was there before a removal, for Undo.
  const [removed, setRemoved] = useState<{ before: HeroMediaEdit } | null>(null);
  const shown = value === undefined ? live : value ?? undefined;

  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 8000);
    return () => clearTimeout(t);
  }, [removed]);

  return (
    <section aria-labelledby="hero-media-title" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <ScenePreview media={shown} title={title} small />
      <div className="min-w-0 flex-1">
        <h2 id="hero-media-title" className="font-bold text-deep-navy">Opening screen</h2>
        <p className="text-sm text-gray-600">
          {shown ? KIND_LABELS[shown.kind] : "No background: your brand colors"}
          {edited && <span className="font-semibold text-amber-800"> &middot; not published</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
          >
            {shown ? "Change" : "Add video or photo"}
          </button>
          {shown && (
            <button
              type="button"
              onClick={() => {
                setRemoved({ before: value });
                onChange(null, "Background removed");
              }}
              className="min-h-10 text-sm font-semibold text-red-700 hover:underline"
            >
              Remove
            </button>
          )}
          {removed && !shown && (
            <button
              type="button"
              onClick={() => {
                onChange(removed.before, "Background restored");
                setRemoved(null);
              }}
              className="min-h-10 text-sm font-semibold text-deep-navy underline"
            >
              Undo
            </button>
          )}
        </div>
      </div>
      {open && (
        <HeroMediaDialog
          title={title}
          initial={shown}
          onSave={(media) => {
            setRemoved(null);
            onChange(media ?? null, media ? "Background saved" : "Background removed");
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}

function HeroMediaDialog({
  title,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  initial: ReelMedia | undefined;
  onSave: (media: ReelMedia | undefined) => void;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [media, setMedia] = useState(initial);
  useEffect(() => ref.current?.showModal(), []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto max-h-[92dvh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-white p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <form
        className="space-y-5 p-5 md:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(media);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-black uppercase tracking-tight text-deep-navy">Opening screen</h2>
            <p className="text-sm text-gray-600">Plays behind your title, muted and on a loop, when someone opens your link.</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-soft-gray hover:text-deep-navy"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row">
          {/* Phones use the picker's own thumbnail, so Save stays in view. */}
          <div className="hidden sm:block">
            <ScenePreview media={media} title={title} />
          </div>
          <div className="min-w-0 flex-1">
            <MediaPicker value={media} onChange={setMedia} />
            <p className="mt-3 text-xs text-gray-600">
              Tip: a vertical clip of the crowd or the room works best. Nobody hears it, so music doesn&apos;t matter.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button type="button" onClick={() => ref.current?.close()} className="min-h-11 rounded-md border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
            Cancel
          </button>
          <button type="submit" className="min-h-11 rounded-md bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
            Save background
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** A small phone-shaped picture of the opening screen: the background, darkened, with the title over it. */
function ScenePreview({ media, title, small = false }: { media: ReelMedia | undefined; title: string; small?: boolean }) {
  const poster = thumbnailOf(media);
  return (
    <div
      aria-hidden="true"
      className={`relative aspect-[9/16] flex-shrink-0 overflow-hidden rounded-lg bg-deep-navy ${small ? "w-14" : "w-40"}`}
    >
      {media?.kind === "video" && !media.poster ? (
        <video src={media.src} muted loop playsInline autoPlay={!small} preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- any file or link the admin adds
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,var(--sky-accent),var(--teal-accent)_30%,transparent_62%)] opacity-80" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-deep-navy via-deep-navy/40 to-black/30" />
      {!small && (
        <div className="absolute inset-x-3 bottom-4">
          <p className={`${wordmarkFont.className} text-2xl leading-none text-white`}>{title}</p>
          <span className="mt-3 block h-7 rounded-full bg-teal-accent" />
        </div>
      )}
    </div>
  );
}
