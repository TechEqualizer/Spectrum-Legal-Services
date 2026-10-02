"use client";

import { useEffect, useRef, useState } from "react";

export type Reel = {
  id: string;
  /** Must match one of the contact form's case types. */
  practiceArea: string;
  title: string;
  summary: string;
  duration?: string;
  /** Self-hosted MP4 (e.g. /reels/criminal-defense.mp4). Omit until the video exists. */
  video?: {
    src: string;
    poster?: string;
    /** WebVTT captions file. */
    captions?: string;
  };
};

type ReelViewerProps = {
  reels: Reel[];
  /** Index of the open reel, or null when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
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
  reels,
  index,
  onIndexChange,
  onClose,
  onBook,
}: ReelViewerProps) {
  const isOpen = index !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  // Reduced-motion users start paused, so nothing advances until they press play.
  const [isPaused, setIsPaused] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [isMuted, setIsMuted] = useState(true);
  // Progress of the reel on screen, from 0 to 1. Tagged with the reel id so a
  // newly opened reel starts empty without a reset.
  const [progress, setProgress] = useState({ id: "", fraction: 0 });

  const goNext = () => {
    if (index === null) return;
    if (index < reels.length - 1) onIndexChange(index + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index === null) return;
    if (index > 0) onIndexChange(index - 1);
  };

  // Latest handlers for listeners registered once per open.
  const handlers = useRef({ goNext, goPrev, onClose });
  useEffect(() => {
    handlers.current = { goNext, goPrev, onClose };
  });

  // Lock page scroll, move focus into the dialog, and restore both on close.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handlers.current.onClose();
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
  }, [isOpen]);

  if (index === null) return null;
  const reel = reels[index];

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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Video: ${reel.title}`}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col overflow-hidden bg-deep-navy outline-none md:h-[85vh] md:max-w-md md:rounded-2xl md:border md:border-white/10 md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <ReelSlide
          key={reel.id}
          reel={reel}
          isPaused={isPaused}
          isMuted={isMuted}
          onProgress={(fraction) => setProgress({ id: reel.id, fraction })}
          onFinished={goNext}
        />

        {/* Top bar: progress segments and controls */}
        <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/60 to-transparent p-3 pb-8">
          <div className="flex gap-1" aria-hidden="true">
            {reels.map((r, i) => (
              <div
                key={r.id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <div
                  className="h-full bg-white"
                  style={{
                    width:
                      i < index
                        ? "100%"
                        : i === index && progress.id === r.id
                          ? `${Math.min(progress.fraction, 1) * 100}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-medium text-white/80">
              {index + 1} of {reels.length}
            </span>
            <div className="flex items-center gap-1">
              {reel.video && (
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
              <IconButton label="Close" onClick={onClose}>
                <path d="M6 18L18 6M6 6l12 12" />
              </IconButton>
            </div>
          </div>
        </div>

        {/* Desktop previous/next */}
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous video"
          className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-0 md:flex"
        >
          <Chevron d="M15 19l-7-7 7-7" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label={index === reels.length - 1 ? "Close videos" : "Next video"}
          className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:flex"
        >
          <Chevron d="M9 5l7 7-7 7" />
        </button>

        {/* Caption and call to action */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-5 pt-16">
          <span className="inline-block rounded-sm bg-teal-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
            {reel.practiceArea}
          </span>
          <h2 className="mt-2 text-xl font-bold text-white">{reel.title}</h2>
          <p className="mt-1 text-sm text-gray-200">{reel.summary}</p>
          <button
            type="button"
            onClick={() => onBook(reel)}
            className="mt-4 w-full rounded-md bg-teal-accent px-5 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
          >
            Book a Consultation
          </button>
          <p className="mt-3 text-[11px] leading-snug text-gray-400">
            General information only, not legal advice. Watching this video
            does not create an attorney-client relationship.
          </p>
        </div>
      </div>
    </div>
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
      <div>
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
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
