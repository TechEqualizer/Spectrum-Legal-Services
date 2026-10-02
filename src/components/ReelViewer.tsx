"use client";

import { useEffect, useRef, useState } from "react";
import {
  getReel,
  nextReelId,
  type Funnel,
  type FunnelTrigger,
  type Reel,
} from "@/data/reels";
import { trackReelEvent } from "@/lib/reel-tracking";

type ReelViewerProps = {
  funnel: Funnel;
  /** The entry reel the visitor tapped. Mount a fresh viewer for each visit. */
  startReelId: string;
  onClose: () => void;
  onBook: (reel: Reel) => void;
};

// How long a reel without a video stays on screen.
const TEXT_SLIDE_DURATION = 8000;
const TICK = 50;
const SWIPE_THRESHOLD = 50;

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ReelViewer({
  funnel,
  startReelId,
  onClose,
  onBook,
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
  // Progress of the reel on screen, from 0 to 1, tagged with its step so a
  // new step starts empty without a reset.
  const [progress, setProgress] = useState({ step: -1, fraction: 0 });

  const step = path.length - 1;
  const reel = getReel(path[step]);

  // Log a view each time a reel comes on screen. The ref stops React's
  // development double-run of effects from logging it twice.
  const lastViewed = useRef("");
  useEffect(() => {
    if (ended || !reel) return;
    const key = `${step}:${reel.id}`;
    if (lastViewed.current === key) return;
    lastViewed.current = key;
    trackReelEvent(reel.id, "viewed");
  }, [ended, reel, step]);

  const advance = (trigger: FunnelTrigger) => {
    if (!reel) return;
    trackReelEvent(reel.id, trigger);
    const next = nextReelId(funnel, reel.id, trigger);
    if (next && getReel(next)) setPath((p) => [...p, next]);
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
    if (!ended && reel) trackReelEvent(reel.id, "exited");
    onClose();
  };

  const book = () => {
    if (!reel) return;
    trackReelEvent(reel.id, "cta_clicked");
    onBook(reel);
  };

  // Latest handlers for listeners registered once per visit.
  const handlers = useRef({ goNext, goPrev, close });
  useEffect(() => {
    handlers.current = { goNext, goPrev, close };
  });

  // Lock page scroll, move focus into the dialog, and restore both on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handlers.current.close();
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
    touchStartY.current = e.touches[0].clientY;
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ended ? "Talk to an attorney" : `Video: ${reel.title}`}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col overflow-hidden bg-deep-navy outline-none tall:h-[85vh] tall:max-w-md tall:rounded-2xl tall:border tall:border-white/10 tall:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {ended ? (
          <EndCard reel={reel} onBook={book} onClose={close} />
        ) : (
          <ReelSlide
            key={`${step}:${reel.id}`}
            reel={reel}
            isPaused={isPaused}
            isMuted={isMuted}
            onProgress={(fraction) => setProgress({ step, fraction })}
            onFinished={() => advance("completed")}
          />
        )}

        {/* Top bar: progress and controls */}
        <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/60 to-transparent p-3 pb-8 short:pb-2">
          <div
            className="h-1 overflow-hidden rounded-full bg-white/25"
            aria-hidden="true"
          >
            <div
              data-testid="reel-progress"
              className="h-full bg-white"
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-medium text-white/80">
              Know Your Rights
            </span>
            <div className="flex items-center gap-1">
              {reel.video && !ended && (
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
              <IconButton label="Close" onClick={close}>
                <path d="M6 18L18 6M6 6l12 12" />
              </IconButton>
            </div>
          </div>
        </div>

        {/* Desktop previous/next */}
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0 && !ended}
          aria-label="Previous video"
          className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-0 tall:flex"
        >
          <Chevron d="M15 19l-7-7 7-7" />
        </button>
        {!ended && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Skip to next video"
            className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 tall:flex"
          >
            <Chevron d="M9 5l7 7-7 7" />
          </button>
        )}

        {/* Caption and call to action */}
        {!ended && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-5 pt-16 short:px-5 short:pb-3 short:pt-10">
            <div className="mx-auto max-w-lg">
              <span className="inline-block rounded-sm bg-teal-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                {reel.practiceArea}
              </span>
              <h2 className="mt-2 text-xl font-bold text-white short:mt-1 short:text-base">
                {reel.title}
              </h2>
              <p className="mt-1 text-sm text-gray-200 short:hidden">
                {reel.summary}
              </p>
              <button
                type="button"
                onClick={book}
                className="mt-4 w-full rounded-md short:mt-2 short:py-2.5 bg-teal-accent px-5 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
              >
                Book a Consultation
              </button>
              <Disclaimer />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Shown when the funnel runs out of reels: the conversion step.
function EndCard({
  reel,
  onBook,
  onClose,
}: {
  reel: Reel;
  onBook: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-br from-deep-navy via-deep-navy to-royal-blue px-6 py-16 text-center short:py-12">
      <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center">
        <span className="mx-auto inline-block rounded-sm bg-teal-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
          {reel.practiceArea}
        </span>
        <h2 className="mt-4 text-2xl font-bold text-white short:mt-2 short:text-xl">
          Have a question about your situation?
        </h2>
        <p className="mt-3 text-gray-200 short:mt-1 short:text-sm">
          Every case is different. Talk it through with one of our attorneys.
        </p>
        <div className="mt-8 flex flex-col gap-3 short:mt-4 short:flex-row">
          <button
            type="button"
            onClick={onBook}
            className="w-full rounded-md bg-teal-accent px-5 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
          >
            Book a Consultation
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-white/30 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to the site
          </button>
        </div>
        <Disclaimer />
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="mt-3 text-[11px] leading-snug text-gray-400">
      General information only, not legal advice. Watching this video does not
      create an attorney-client relationship.
    </p>
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
function ReelSlide({
  reel,
  isPaused,
  isMuted,
  onProgress,
  onFinished,
}: ReelSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Survives pausing, so resuming picks up where the timer stopped.
  const elapsed = useRef(0);
  const callbacks = useRef({ onProgress, onFinished });
  useEffect(() => {
    callbacks.current = { onProgress, onFinished };
  });

  // Text-only reels advance on a timer; video reels advance when the video ends.
  useEffect(() => {
    if (reel.video || isPaused) return;
    const timer = setInterval(() => {
      elapsed.current += TICK;
      callbacks.current.onProgress(elapsed.current / TEXT_SLIDE_DURATION);
      if (elapsed.current >= TEXT_SLIDE_DURATION) {
        clearInterval(timer);
        callbacks.current.onFinished();
      }
    }, TICK);
    return () => clearInterval(timer);
  }, [reel.video, isPaused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPaused) video.pause();
    else video.play().catch(() => {});
  }, [isPaused]);

  if (reel.video) {
    return (
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-cover"
        src={reel.video.src}
        poster={reel.video.poster}
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
        {reel.video.captions && (
          <track
            kind="captions"
            src={reel.video.captions}
            srcLang="en"
            label="English"
            default
          />
        )}
      </video>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-deep-navy via-deep-navy to-royal-blue px-8 pb-48 text-center">
      <div className="short:hidden">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <svg
            className="h-8 w-8 text-teal-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-accent">
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
