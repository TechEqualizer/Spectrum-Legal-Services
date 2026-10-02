"use client";

import { useEffect, useRef, useState } from "react";
import {
  funnelReel,
  nextReelId,
  type Funnel,
  type FunnelBrand,
  type FunnelTrigger,
  type Reel,
} from "@/data/reels";
import type { ReelMedia } from "@/data/funnel-types";
import { thumbnailOf, youtubeEmbedUrl } from "@/lib/media";
import FunnelLeadSheet from "@/components/FunnelLeadSheet";
import type { LeadIntent } from "@/lib/leads";
import { trackReelEvent } from "@/lib/reel-tracking";

type ReelViewerProps = {
  funnel: Funnel;
  /** The entry reel the visitor tapped. Mount a fresh viewer for each visit. */
  startReelId: string;
  /**
   * "modal" opens over the website; "page" is the whole screen of a
   * shareable funnel link, where closing goes back to its topic choices.
   */
  variant?: "modal" | "page";
  onClose: () => void;
};

// Two taps closer together than this count as a double-tap.
const DOUBLE_TAP_MS = 260;

// Icon paths (24x24, stroked).
const HEART =
  "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";
const CALENDAR = "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM8 12h3v3H8z";
const PHONE =
  "M5 4h3l2 5-2.5 1.5a11 11 0 006 6L15 14l5 2v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z";
const MESSAGE = "M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z";
const SHARE = "M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13";

// How long a reel without a video stays on screen.
const TEXT_SLIDE_DURATION = 8000;
const TICK = 50;
const SWIPE_THRESHOLD = 50;

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ReelViewer({
  funnel,
  startReelId,
  variant = "modal",
  onClose,
}: ReelViewerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  // Reels visited this visit, in order. Previous walks back along this path.
  const [path, setPath] = useState<string[]>([startReelId]);
  // True once the funnel runs out of reels and shows the consultation card.
  const [ended, setEnded] = useState(false);
  // Reduced-motion users start paused, so nothing advances until they press play.
  const [isPaused, setIsPaused] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [isMuted, setIsMuted] = useState(true);
  // The booking or "text me later" form, open over the reel.
  const [sheet, setSheet] = useState<LeadIntent | null>(null);
  const isModal = variant === "modal";
  const closeLabel = isModal ? "Back to the site" : "Pick another topic";
  const brand = funnel.brand;
  // Progress of the reel on screen, from 0 to 1, tagged with its step so a
  // new step starts empty without a reset.
  const [progress, setProgress] = useState({ step: -1, fraction: 0 });

  const step = path.length - 1;
  const reel = funnelReel(funnel, path[step]);

  // Log a view each time a reel comes on screen. The ref stops React's
  // development double-run of effects from logging it twice.
  const lastViewed = useRef("");
  useEffect(() => {
    if (ended || !reel) return;
    const key = `${step}:${reel.id}`;
    if (lastViewed.current === key) return;
    lastViewed.current = key;
    trackReelEvent(funnel, reel.id, "viewed");
  }, [ended, funnel, reel, step]);

  const advance = (trigger: FunnelTrigger) => {
    if (!reel) return;
    trackReelEvent(funnel, reel.id, trigger);
    const next = nextReelId(funnel, reel.id, trigger);
    if (next && funnelReel(funnel, next)) setPath((p) => [...p, next]);
    else setEnded(true);
  };

  const goNext = () => {
    if (ended) onClose();
    else advance("skipped");
  };

  const goPrev = () => {
    if (ended) setEnded(false);
    else if (path.length > 1) setPath((p) => p.slice(0, -1));
  };

  const close = () => {
    if (!ended && reel) trackReelEvent(funnel, reel.id, "exited");
    onClose();
  };

  const ctas: CtaHandlers = {
    onCall: () => reel && trackReelEvent(funnel, reel.id, "call_clicked"),
    onBook: () => {
      if (!reel) return;
      trackReelEvent(funnel, reel.id, "cta_clicked");
      setSheet("book");
    },
    onTextLater: () => {
      if (!reel) return;
      trackReelEvent(funnel, reel.id, "text_later_clicked");
      setSheet("text_later");
    },
  };

  // Likes this visit. Double-tapping an already-liked reel replays the heart.
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [burst, setBurst] = useState(0);
  const liked = reel ? likedIds.has(reel.id) : false;
  const like = (on: boolean) => {
    if (!reel) return;
    if (on && !likedIds.has(reel.id)) trackReelEvent(funnel, reel.id, "liked");
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(reel.id);
      else next.delete(reel.id);
      return next;
    });
  };
  const toggleLike = () => like(!liked);

  // One tap pauses or plays; two quick taps like the reel.
  const tapTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
  }, []);
  const onMediaTap = () => {
    if (tapTimer.current !== null) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      like(true);
      setBurst((b) => b + 1);
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      setIsPaused((p) => !p);
    }, DOUBLE_TAP_MS);
  };

  const { copied, share: shareLink } = useShareLink(funnel);
  const share = () => reel && shareLink(reel.id);

  // Progress segments: the reels seen so far, this one, and the ones ahead
  // if the visitor keeps watching to the end.
  let ahead = 0;
  if (reel && !ended) {
    const seen = new Set(path);
    for (let id = reel.id; ; ) {
      const next = nextReelId(funnel, id, "completed");
      if (!next || seen.has(next)) break;
      seen.add(next);
      ahead++;
      id = next;
    }
  }
  const segments = path.length + ahead;

  // Latest handlers for listeners registered once per visit.
  const handlers = useRef({ goNext, goPrev, close, sheet });
  useEffect(() => {
    handlers.current = { goNext, goPrev, close, sheet };
  });

  // Lock page scroll, move focus into the dialog, and restore both on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      const formOpen = handlers.current.sheet !== null;
      if (e.key === "Escape") {
        e.preventDefault();
        if (formOpen) setSheet(null);
        else handlers.current.close();
      } else if (formOpen && e.key !== "Tab") {
        // Arrow keys belong to the form's fields while it is open.
        return;
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handlers.current.goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlers.current.goPrev();
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  if (!reel) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = sheet ? null : e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const distance = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    if (distance > SWIPE_THRESHOLD) goNext();
    else if (distance < -SWIPE_THRESHOLD) goPrev();
  };

  const barWidth = ended
    ? 100
    : progress.step === step
      ? Math.min(progress.fraction, 1) * 100
      : 0;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${
        isModal ? "bg-black/95" : "bg-deep-navy tall:bg-black"
      }`}
      onClick={isModal ? close : undefined}
    >
      <div
        ref={dialogRef}
        role={isModal ? "dialog" : "region"}
        aria-modal={isModal ? "true" : undefined}
        aria-label={ended ? brand.copy.endHeading : `Video: ${reel.title}`}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col overflow-hidden bg-deep-navy outline-none tall:h-[85vh] tall:max-w-md tall:rounded-2xl tall:border tall:border-white/10 tall:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Everything behind the form is inert while it is open. */}
        <div className="contents" inert={sheet !== null}>
          {ended ? (
            <EndCard
              funnel={funnel}
              reel={reel}
              ctas={ctas}
              closeLabel={closeLabel}
              onClose={close}
            />
          ) : (
            <ReelSlide
              key={`${step}:${reel.id}`}
              reel={reel}
              isPaused={isPaused || sheet !== null}
              isMuted={isMuted}
              onProgress={(fraction) => setProgress({ step, fraction })}
              onFinished={() => advance("completed")}
            />
          )}

          {/* Tap to pause, double-tap to like, as in the social apps. */}
          {!ended && (
            <div
              className="absolute inset-0 z-10"
              onClick={onMediaTap}
              aria-hidden="true"
              data-testid="reel-tap-area"
            />
          )}
          {burst > 0 && (
            <svg
              key={burst}
              className="animate-heart-pop pointer-events-none absolute left-1/2 top-1/2 z-30 -ml-12 -mt-12 h-24 w-24 text-white drop-shadow-lg"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d={HEART} />
            </svg>
          )}

          {/* Top: one segment per reel on this path, then the account row */}
          <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-2 short:pb-2">
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: segments }, (_, i) => (
                <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    data-testid={i === step && !ended ? "reel-progress" : undefined}
                    className="h-full bg-white"
                    style={{
                      width: `${ended || i < step ? 100 : i === step ? barWidth : 0}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-accent text-sm font-bold text-white ring-2 ring-white/70"
                  aria-hidden="true"
                >
                  {brand.name.replace(/^The\s+/i, "").charAt(0)}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-semibold text-white">{brand.name}</span>
                  <span className="block truncate text-[11px] text-white/75">{brand.seriesLabel}</span>
                </span>
              </div>
              <div className="flex flex-shrink-0 items-center">
                {(reel.media?.kind === "video" || reel.media?.kind === "youtube") && !ended && (
                  <IconButton
                    label={isMuted ? "Unmute" : "Mute"}
                    onClick={() => setIsMuted((m) => !m)}
                  >
                    {isMuted ? (
                      <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                    ) : (
                      <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                    )}
                  </IconButton>
                )}
                {!ended && (
                  <IconButton
                    label={isPaused ? "Play" : "Pause"}
                    onClick={() => setIsPaused((p) => !p)}
                  >
                    {isPaused ? (
                      <path d="M6 4l14 8-14 8V4z" />
                    ) : (
                      <path d="M7 4h3v16H7zM14 4h3v16h-3z" />
                    )}
                  </IconButton>
                )}
                {isModal ? (
                  <IconButton label="Close" onClick={close}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </IconButton>
                ) : (
                  <IconButton label="Back to topics" onClick={close}>
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                  </IconButton>
                )}
              </div>
            </div>
          </div>

          {/* Paused: a big play button, as in the apps */}
          {isPaused && !ended && sheet === null && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -ml-9 -mt-9 flex h-18 w-18 items-center justify-center rounded-full bg-black/40" aria-hidden="true">
              <svg className="ml-1 h-9 w-9 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" /></svg>
            </span>
          )}

          {!ended && (
            <>
              {/* Action rail */}
              <div className="absolute bottom-40 right-2 z-30 flex flex-col items-center gap-3 short:bottom-24 short:gap-1">
                <RailButton label={liked ? "Liked" : "Like"} pressed={liked} onClick={toggleLike}>
                  <path d={HEART} fill={liked ? "currentColor" : "none"} />
                </RailButton>
                {funnel.primaryCta === "book" ? (
                  <>
                    <RailButton label="Book" highlight onClick={ctas.onBook}>
                      <path d={CALENDAR} />
                    </RailButton>
                    <RailButton label="Call" href={brand.phone.href} onClick={ctas.onCall}>
                      <path d={PHONE} />
                    </RailButton>
                  </>
                ) : (
                  <>
                    <RailButton label="Call" highlight href={brand.phone.href} onClick={ctas.onCall}>
                      <path d={PHONE} />
                    </RailButton>
                    <RailButton label="Call back" onClick={ctas.onBook}>
                      <path d={CALENDAR} />
                    </RailButton>
                  </>
                )}
                <RailButton label="Text me" onClick={ctas.onTextLater}>
                  <path d={MESSAGE} />
                </RailButton>
                <RailButton label={copied ? "Copied" : "Share"} onClick={share}>
                  <path d={SHARE} />
                </RailButton>
              </div>

              {/* Caption, then the main action as a slim bar */}
              <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-16 short:pb-2 short:pt-8">
                <div className="pr-16">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-sm bg-teal-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      {reel.practiceArea}
                    </span>
                    {reel.badge && (
                      <span className="rounded-sm bg-black/50 px-2 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/20">
                        {reel.badge}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-bold leading-snug text-white short:mt-1 short:text-base">
                    {reel.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-200 short:hidden">
                    {reel.summary}
                  </p>
                </div>
                <PrimaryBar brand={brand} primary={funnel.primaryCta} {...ctas} />
                <Disclaimer text={brand.disclaimer} />
              </div>
            </>
          )}
        </div>

        {sheet && (
          <FunnelLeadSheet
            key={sheet}
            funnel={funnel}
            intent={sheet}
            reel={reel}
            onClose={() => {
              setSheet(null);
              dialogRef.current?.focus();
            }}
          />
        )}
      </div>

      {/* Desktop: up and down beside the video, as on TikTok's site */}
      <div
        className="absolute right-6 top-1/2 z-[101] hidden -translate-y-1/2 flex-col gap-3 tall:flex"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0 && !ended}
          aria-label="Previous video"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          <Chevron d="M5 15l7-7 7 7" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label={ended ? closeLabel : "Skip to next video"}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <Chevron d="M19 9l-7 7-7-7" />
        </button>
      </div>
    </div>
  );
}

type CtaHandlers = {
  onCall: () => void;
  onBook: () => void;
  onTextLater: () => void;
};

const primaryClass =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-accent px-5 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110 short:min-h-11";
const secondaryClass =
  "flex min-h-11 flex-1 items-center justify-center rounded-md border border-white/30 bg-white/5 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/15";

/**
 * Call, Book and Text me later on every reel: the funnel's main action as a
 * big button, the other two beside each other under it.
 */
function CtaButtons({
  brand,
  primary,
  onCall,
  onBook,
  onTextLater,
}: CtaHandlers & { brand: FunnelBrand; primary: Funnel["primaryCta"] }) {
  const call = (className: string, label: string) => (
    <a href={brand.phone.href} onClick={onCall} className={className}>
      {label}
    </a>
  );
  const book = (className: string, label: string) => (
    <button type="button" onClick={onBook} className={className}>
      {label}
    </button>
  );
  return (
    <div className="mt-4 space-y-2 short:mt-2">
      {primary === "call"
        ? call(primaryClass, `${brand.copy.callNow}: ${brand.phone.display}`)
        : book(primaryClass, brand.copy.bookPrimary)}
      <div className="flex gap-2">
        {primary === "call"
          ? book(secondaryClass, brand.copy.callBack)
          : call(secondaryClass, brand.copy.callNow)}
        <button type="button" onClick={onTextLater} className={secondaryClass}>
          Text me later
        </button>
      </div>
    </div>
  );
}

// Shown when the funnel runs out of reels: the conversion step.
function EndCard({
  funnel,
  reel,
  ctas,
  closeLabel,
  onClose,
}: {
  funnel: Funnel;
  reel: Reel;
  ctas: CtaHandlers;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-br from-deep-navy via-deep-navy to-royal-blue px-6 py-16 text-center short:py-12">
      <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center">
        <span className="mx-auto inline-block rounded-sm bg-teal-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
          {reel.practiceArea}
        </span>
        <h2 className="mt-4 text-2xl font-bold text-white short:mt-2 short:text-xl">
          {funnel.brand.copy.endHeading}
        </h2>
        <p className="mt-3 text-gray-200 short:mt-1 short:text-sm">
          {funnel.brand.copy.endBody}
        </p>
        <div className="mt-6 text-left short:mt-3">
          <CtaButtons brand={funnel.brand} primary={funnel.primaryCta} {...ctas} />
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 short:mt-3 short:flex-row short:pt-3">
          <ShareButton funnel={funnel} reel={reel} />
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-md px-5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {closeLabel}
          </button>
        </div>
        <Disclaimer text={funnel.brand.disclaimer} />
      </div>
    </div>
  );
}

/** Passes the funnel link on to someone else, tagged as a share. */
/** Shares the funnel link (tagged as a share), or copies it where sharing isn't available. */
function useShareLink(funnel: Funnel) {
  const [copied, setCopied] = useState(false);
  const share = async (reelId: string) => {
    const url = `${window.location.origin}/f/${funnel.slug}?src=share`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: funnel.brand.name,
          text: funnel.brand.copy.shareText,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
      trackReelEvent(funnel, reelId, "shared");
    } catch {
      // Closed the share sheet, or the clipboard is blocked: nothing to do.
    }
  };
  return { copied, share };
}

function ShareButton({ funnel, reel }: { funnel: Funnel; reel: Reel }) {
  const { copied, share } = useShareLink(funnel);
  return (
    <button
      type="button"
      onClick={() => share(reel.id)}
      className="min-h-11 w-full rounded-md border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
    >
      <span aria-live="polite">
        {copied ? "Link copied" : funnel.brand.copy.shareButton}
      </span>
    </button>
  );
}

/** One button on the right-hand rail: a round icon with its label under it. */
function RailButton({
  label,
  children,
  onClick,
  href,
  highlight = false,
  pressed,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  href?: string;
  highlight?: boolean;
  pressed?: boolean;
}) {
  const inner = (
    <>
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-90 short:h-10 short:w-10 ${
          highlight ? "bg-teal-accent shadow-lg" : "bg-black/35 backdrop-blur-sm"
        } ${pressed ? "text-rose-500" : ""}`}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          {children}
        </svg>
      </span>
      <span className="text-[11px] font-semibold [text-shadow:0_1px_2px_rgb(0_0_0/0.6)] short:sr-only">
        {label}
      </span>
    </>
  );
  const className = "flex min-w-14 flex-col items-center gap-1 text-white";
  return href ? (
    <a href={href} onClick={onClick} className={className}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-pressed={pressed} className={className}>
      {inner}
    </button>
  );
}

/** The main action under the caption, like the call-to-action strip on a sponsored reel. */
function PrimaryBar({
  brand,
  primary,
  onCall,
  onBook,
}: CtaHandlers & { brand: FunnelBrand; primary: Funnel["primaryCta"] }) {
  const className =
    "mt-3 flex min-h-11 w-full items-center justify-between rounded-md bg-teal-accent px-4 text-sm font-semibold text-white shadow-md transition-all hover:brightness-110 short:mt-2 short:min-h-10";
  const arrow = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
  return primary === "call" ? (
    <a href={brand.phone.href} onClick={onCall} className={className}>
      {`${brand.copy.callNow}: ${brand.phone.display}`}
      {arrow}
    </a>
  ) : (
    <button type="button" onClick={onBook} className={className}>
      {brand.copy.bookPrimary}
      {arrow}
    </button>
  );
}

function Disclaimer({ text }: { text: string }) {
  return (
    <p className="mt-3 text-[11px] leading-snug text-gray-400">{text}</p>
  );
}

type ReelSlideProps = {
  reel: Reel;
  isPaused: boolean;
  isMuted: boolean;
  onProgress: (fraction: number) => void;
  onFinished: () => void;
};

// Keyed by reel id, so its timer and progress start fresh for every reel.
function ReelSlide(props: ReelSlideProps) {
  const { media } = props.reel;
  if (media?.kind === "video") return <VideoSlide {...props} media={media} />;
  if (media?.kind === "youtube") return <YouTubeSlide {...props} id={media.id} />;
  return <TimedSlide {...props} />;
}

/** Keeps the latest callbacks for listeners and timers set up once. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

function VideoSlide({
  media,
  isPaused,
  isMuted,
  onProgress,
  onFinished,
}: ReelSlideProps & { media: Extract<ReelMedia, { kind: "video" }> }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPaused) video.pause();
    else video.play().catch(() => {});
  }, [isPaused]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full bg-black object-cover"
      src={media.src}
      poster={media.poster}
      muted={isMuted}
      autoPlay={!isPaused}
      playsInline
      preload="metadata"
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (v.duration) onProgress(v.currentTime / v.duration);
      }}
      onEnded={onFinished}
    >
      {media.captions && (
        <track kind="captions" src={media.captions} srcLang="en" label="English" default />
      )}
    </video>
  );
}

const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";

/**
 * A YouTube video, driven through the player's postMessage interface (no
 * extra script): it pauses, mutes and reports progress like a video file.
 * Tap handling stays with the reel, so YouTube's own controls are hidden.
 */
function YouTubeSlide({
  id,
  isPaused,
  isMuted,
  onProgress,
  onFinished,
}: ReelSlideProps & { id: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const callbacks = useLatest({ onProgress, onFinished });
  const finished = useRef(false);
  // Read once on mount; the player needs to know which page is talking to it.
  const [src] = useState(() => youtubeEmbedUrl(id, window.location.origin));

  const command = (func: string) =>
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      YOUTUBE_ORIGIN
    );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== YOUTUBE_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      let data: { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } | number };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const info = typeof data.info === "object" ? data.info : undefined;
      if (info?.duration && typeof info.currentTime === "number") {
        callbacks.current.onProgress(info.currentTime / info.duration);
      }
      // Player state 0 means the video ended.
      const ended = info?.playerState === 0 || (data.event === "onStateChange" && data.info === 0);
      if (ended && !finished.current) {
        finished.current = true;
        callbacks.current.onFinished();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [callbacks]);

  // Commands sent before the player is ready are ignored; onLoad resends them.
  const sync = () => {
    command(isPaused ? "pauseVideo" : "playVideo");
    command(isMuted ? "mute" : "unMute");
  };
  useEffect(sync);

  return (
    <div className="absolute inset-0 bg-black">
      {/* The thumbnail shows until the player paints over it. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
      <img src={thumbnailOf({ kind: "youtube", id })} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <iframe
        ref={frameRef}
        src={src}
        title="YouTube video"
        allow="autoplay; encrypted-media; picture-in-picture"
        className="absolute left-1/2 top-1/2 aspect-video h-full w-auto max-w-none -translate-x-1/2 -translate-y-1/2 border-0"
        onLoad={() => {
          // Ask the player to start sending its state.
          frameRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
            YOUTUBE_ORIGIN
          );
          sync();
        }}
      />
    </div>
  );
}

/** A photo, or the "coming soon" card, shown for a few seconds like a story. */
function TimedSlide({ reel, isPaused, onProgress, onFinished }: ReelSlideProps) {
  // Survives pausing, so resuming picks up where the timer stopped.
  const elapsed = useRef(0);
  const callbacks = useLatest({ onProgress, onFinished });

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      elapsed.current += TICK;
      callbacks.current.onProgress(elapsed.current / TEXT_SLIDE_DURATION);
      if (elapsed.current >= TEXT_SLIDE_DURATION) {
        clearInterval(timer);
        callbacks.current.onFinished();
      }
    }, TICK);
    return () => clearInterval(timer);
  }, [isPaused, callbacks]);

  if (reel.media?.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- any photo the business adds
      <img src={reel.media.src} alt="" className="absolute inset-0 h-full w-full bg-black object-cover" />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-deep-navy via-deep-navy to-royal-blue px-8 pb-48 text-center">
      <div className="short:hidden">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <svg className="h-8 w-8 text-sky-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-accent">
          Video coming soon
        </p>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}
