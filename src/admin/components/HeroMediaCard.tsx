"use client";

import { useEffect, useId, useRef, useState } from "react";
import MediaPicker from "@/admin/components/MediaPicker";
import VideoPrompt from "@/admin/components/VideoPrompt";
import StyleSheet from "@/admin/components/StyleSheet";
import type { HeroMediaEdit } from "@/admin/drafts";
import { titleFontClass } from "@/components/lookFonts";
import type { Funnel, ReelMedia } from "@/data/funnel-types";
import { thumbnailOf } from "@/lib/media";
import { LOOK_FONTS, LOOK_ROLES, themeOf, type Look } from "@/lib/look";
import { SCREEN_LIMITS, type ScreenCopy } from "@/lib/publication";

const KIND_LABELS: Record<ReelMedia["kind"], string> = {
  video: "Video",
  youtube: "YouTube video",
  image: "Photo",
};

type Field = { key: keyof ScreenCopy; label: string; help?: string; multiline?: boolean };

/** The words a funnel's opening screen shows, in the order visitors read them. */
function fieldsFor(funnel: Funnel): Field[] {
  return funnel.cover.hero
    ? [
        { key: "title", label: "Title", help: "The big line over the video." },
        { key: "tagline", label: "Tagline", multiline: true },
        { key: "watchLabel", label: "Main button" },
        { key: "heading", label: "Dates heading", help: "Above the dates, like “Which Sunday?”" },
      ]
    : [
        { key: "heading", label: "Heading", help: "The big line over the video." },
        { key: "intro", label: "Intro", multiline: true },
      ];
}

/** The built-in words, before any edits. */
function builtInCopy(funnel: Funnel): Required<ScreenCopy> {
  return {
    title: funnel.cover.hero?.title ?? funnel.cover.heading,
    tagline: funnel.cover.hero?.tagline ?? funnel.cover.intro,
    watchLabel: funnel.cover.hero?.watchLabel ?? "Watch",
    heading: funnel.cover.heading,
    intro: funnel.cover.intro,
  };
}

/**
 * The opening screen at the top of the Reels page: its words and what plays
 * behind them. Edit opens one sheet for both, with a live preview.
 */
export default function HeroMediaCard({
  funnel,
  live,
  value,
  screen,
  look,
  edited = false,
  onChange,
  onStyle,
  inStudio = false,
  videoPrompt,
}: {
  /** The funnel as built in (for its default words). */
  funnel: Funnel;
  /** The background the built-in funnel shows. */
  live: ReelMedia | undefined;
  value: HeroMediaEdit;
  /** Words that differ from the built-in ones. */
  screen: ScreenCopy | undefined;
  /** Brand colors and title typeface, when changed from the built-in ones (e.g. matched to a flyer). */
  look?: Look;
  /** Differs from what's live. */
  edited?: boolean;
  onChange: (change: { media: HeroMediaEdit; screen: ScreenCopy | undefined }, message: string, undo?: () => void) => void;
  /** Done in the Style sheet: the look (undefined: the original) and the background. */
  onStyle: (look: Look | undefined, media: HeroMediaEdit) => void;
  /** In the studio: its story step names it, and Style is the Design tab. */
  inStudio?: boolean;
  /** A drafted prompt for making the opening scene's video. */
  videoPrompt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [styling, setStyling] = useState(false);
  const shown = value === undefined ? live : value ?? undefined;
  const copy = { ...builtInCopy(funnel), ...screen };
  const title = funnel.cover.hero ? copy.title : copy.heading;

  return (
    <section aria-labelledby="hero-media-title" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setOpen(true)} aria-label="Edit the opening screen" className="flex-shrink-0 rounded-lg focus-visible:outline-2">
          <ScenePreview media={shown} title={title} look={look} small />
        </button>
        <div className="min-w-0 flex-1">
          <h2 id="hero-media-title" className={inStudio ? "sr-only" : "font-bold text-deep-navy"}>Opening screen</h2>
          <p className="truncate text-sm text-deep-navy">&ldquo;{title}&rdquo;</p>
          <p className="text-sm text-gray-600">
            {shown ? KIND_LABELS[shown.kind] : "No background: your brand colors"}
            {edited && <span className="font-semibold text-amber-800"> &middot; not published</span>}
          </p>
          {look && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
              <Swatches look={look} />
              <span>{LOOK_FONTS[look.font].label}</span>
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="min-h-10 rounded-md border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
            >
              Edit
            </button>
            {!inStudio && (
              <button
                type="button"
                onClick={() => setStyling(true)}
                className="min-h-10 rounded-md border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
              >
                Style
              </button>
            )}
            {shown && (
              <button
                type="button"
                onClick={() => onChange({ media: null, screen }, "Background removed", () => onChange({ media: value, screen }, "Background restored"))}
                className="min-h-10 text-sm font-semibold text-red-700 hover:underline"
              >
                Remove background
              </button>
            )}
          </div>
        </div>
      </div>
      {videoPrompt && !(shown && shown.kind === "video") && <VideoPrompt prompt={videoPrompt} what="the opening scene" />}
      {styling && (
        <StyleSheet
          funnel={funnel}
          title={title}
          look={look}
          media={shown}
          onDone={(nextLook, media) => {
            onStyle(nextLook, media);
            setStyling(false);
          }}
          onClose={() => setStyling(false)}
        />
      )}
      {open && (
        <OpeningScreenSheet
          funnel={funnel}
          look={look}
          initialMedia={shown}
          initialCopy={copy}
          onSave={(media, words) => {
            // Keep only the words that differ from the built-in ones.
            const builtIn = builtInCopy(funnel);
            const diff: ScreenCopy = {};
            for (const f of fieldsFor(funnel)) {
              const v = words[f.key]?.trim();
              if (v && v !== builtIn[f.key]) diff[f.key] = v;
            }
            onChange({ media: media ?? null, screen: Object.keys(diff).length ? diff : undefined }, "Opening screen saved");
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}

function OpeningScreenSheet({
  funnel,
  look,
  initialMedia,
  initialCopy,
  onSave,
  onClose,
}: {
  funnel: Funnel;
  look?: Look;
  initialMedia: ReelMedia | undefined;
  initialCopy: Required<ScreenCopy>;
  onSave: (media: ReelMedia | undefined, words: ScreenCopy) => void;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [media, setMedia] = useState(initialMedia);
  const [words, setWords] = useState<ScreenCopy>(initialCopy);
  const builtIn = builtInCopy(funnel);
  const fields = fieldsFor(funnel);
  useEffect(() => ref.current?.showModal(), []);

  const hero = Boolean(funnel.cover.hero);
  const previewTitle = (hero ? words.title : words.heading)?.trim() || (hero ? builtIn.title : builtIn.heading);
  const previewTagline = (hero ? words.tagline : words.intro)?.trim() || (hero ? builtIn.tagline : builtIn.intro);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto max-h-[92dvh] w-[min(46rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(media, words);
        }}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 md:px-6">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-bold text-deep-navy">Opening screen</h2>
            <p className="text-sm text-gray-600">What people see first when they open your link.</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-deep-navy"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 pb-5 md:flex-row md:px-6">
          {/* Live preview: updates as you type. */}
          <div className="flex justify-center md:sticky md:top-0 md:self-start">
            <ScenePreview
              media={media}
              look={look}
              title={previewTitle}
              tagline={previewTagline}
              button={hero ? words.watchLabel?.trim() || builtIn.watchLabel : undefined}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-5">
            <fieldset>
              <legend className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Words</legend>
              <div className="divide-y divide-gray-100 rounded-xl bg-white">
                {fields.map((f) => {
                  const v = words[f.key] ?? "";
                  const max = SCREEN_LIMITS[f.key];
                  const props = {
                    id: `${id}-field-${f.key}`,
                    className: `mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-charcoal focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-accent ${f.multiline ? "min-h-20" : ""}`,
                    maxLength: max,
                    value: v,
                    placeholder: builtIn[f.key],
                    "aria-describedby": f.help ? `${id}-field-${f.key}-help` : undefined,
                    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setWords((w) => ({ ...w, [f.key]: e.target.value })),
                  };
                  return (
                    <div key={f.key} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <label htmlFor={`${id}-field-${f.key}`} className="text-sm font-semibold text-deep-navy">{f.label}</label>
                        <span className={`text-xs tabular-nums ${v.length > max - 10 ? "text-amber-800" : "text-gray-400"}`} aria-hidden="true">
                          {v.length}/{max}
                        </span>
                      </div>
                      {f.multiline ? <textarea {...props} /> : <input {...props} />}
                      {f.help && <p id={`${id}-field-${f.key}-help`} className="mt-1 text-xs text-gray-500">{f.help}</p>}
                    </div>
                  );
                })}
              </div>
              <p className="mt-1.5 px-1 text-xs text-gray-500">Leave a field empty to use the original words.</p>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Background</legend>
              <div className="rounded-xl bg-white p-4">
                <MediaPicker value={media} onChange={setMedia} />
                <p className="mt-3 text-xs text-gray-500">Plays muted and on a loop. A vertical clip of the crowd or the room works best.</p>
              </div>
            </fieldset>
          </div>
        </div>

        {/* Always in view, however far the sheet scrolls. */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-soft-gray/95 px-5 py-3 backdrop-blur md:px-6">
          <button type="button" onClick={() => ref.current?.close()} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white">
            Cancel
          </button>
          <button type="submit" className="min-h-11 rounded-lg bg-deep-navy px-6 text-sm font-bold text-white hover:bg-royal-blue">
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** A small phone-shaped picture of the opening screen: the background, darkened, with the words over it. */
/** The look's five colors, as small dots. */
export function Swatches({ look }: { look: Look }) {
  return (
    <span className="inline-flex -space-x-1" aria-hidden="true">
      {LOOK_ROLES.map((role) => (
        <span key={role} className="h-4 w-4 rounded-full ring-2 ring-white" style={{ background: look.colors[role] }} />
      ))}
    </span>
  );
}

export function ScenePreview({
  media,
  look,
  title,
  tagline,
  button,
  small = false,
}: {
  media: ReelMedia | undefined;
  /** Shown in these colors and typeface instead of the funnel's own. */
  look?: Look;
  title: string;
  tagline?: string;
  button?: string;
  small?: boolean;
}) {
  const poster = thumbnailOf(media);
  return (
    <div
      aria-hidden="true"
      style={look ? (themeOf(look) as React.CSSProperties) : undefined}
      className={`relative aspect-[9/16] flex-shrink-0 overflow-hidden rounded-xl bg-deep-navy ${small ? "w-14" : "w-36 md:w-48"}`}
    >
      {media?.kind === "image" && media.fit === "blur" ? (
        // eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer, as color only
        <img src={media.src} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-lg brightness-[0.6] saturate-150" />
      ) : media?.kind === "image" && media.fit === "poster" ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer */}
          <img src={media.src} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-md brightness-[0.55] saturate-150" />
          {/* eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer */}
          <img src={media.src} alt="" className={`absolute inset-x-0 mx-auto h-[52%] w-auto max-w-[80%] rounded object-contain [mask-image:linear-gradient(to_bottom,black_55%,transparent)] ${small ? "top-1.5" : "top-6"}`} />
        </>
      ) : media?.kind === "video" && !media.poster ? (
        <video src={media.src} muted loop playsInline autoPlay={!small} preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- any file or link the admin adds
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,var(--sky-accent),var(--teal-accent)_30%,transparent_62%)] opacity-80" />
      )}
      <div className={`absolute inset-0 bg-gradient-to-t from-deep-navy ${media?.kind === "image" && media.fit === "poster" ? "via-deep-navy/40 via-35% to-transparent to-60%" : "via-deep-navy/50 to-black/30"}`} />
      {!small && (
        <div className="absolute inset-x-3 bottom-4">
          <p className={`${titleFontClass(look?.font)} line-clamp-3 text-[1.35rem] leading-[1.05] text-white md:text-[1.6rem]`}>{title}</p>
          {tagline && <p className="mt-1.5 line-clamp-3 text-[9px] leading-snug text-white/80 md:text-[10px]">{tagline}</p>}
          {button && (
            <span className="mt-2.5 flex h-7 items-center justify-center truncate rounded-full bg-teal-accent px-2 text-[10px] font-semibold text-on-accent">
              {button}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
