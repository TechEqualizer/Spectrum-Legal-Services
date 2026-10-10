"use client";

import { useEffect, useId, useRef, useState } from "react";
import { markUnfollowed, useIsFollowing, type FollowTarget } from "@/components/follow/follow";
import { followConsent } from "@/lib/fans";
import { getSourceTag, isPreviewMode } from "@/lib/reel-tracking";

/**
 * Follow an organizer: one email field, the words they agree to, and a
 * single-use link sent to confirm. A follower sees that they follow, and can
 * unfollow here.
 */
export default function FollowSheet({
  target,
  onClose,
  fixed = false,
}: {
  target: FollowTarget;
  onClose: () => void;
  /** Over the whole screen (a page), instead of over the reel it opens from. */
  fixed?: boolean;
}) {
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  const isFollowing = useIsFollowing(target.organizer);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"form" | "sending" | "sent" | "unfollowed">("form");
  const [error, setError] = useState("");
  // The admin's preview sends nothing.
  const simulated = isPreviewMode();

  useEffect(() => {
    field.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (simulated) {
      setState("sent");
      return;
    }
    setState("sending");
    const res = await fetch("/api/fans/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), organizer: target.organizer, sourceTag: getSourceTag(), funnelId: target.funnelId }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    setError(body?.error ?? "Couldn't send the email. Try again.");
    setState("form");
  };

  const unfollow = async () => {
    setError("");
    const res = await fetch("/api/fans/unfollow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizer: target.organizer }),
    }).catch(() => null);
    if (res?.ok) {
      markUnfollowed(target.organizer);
      setState("unfollowed");
    } else setError("Couldn't unfollow. Try again.");
  };

  const heading =
    state === "sent" ? "Check your email" : state === "unfollowed" ? "You've unfollowed" : isFollowing ? "You're following" : `Follow ${target.name}`;
  const DONE = "min-h-12 w-full rounded-md bg-teal-accent px-4 font-semibold text-on-accent shadow-md hover:brightness-110";

  return (
    <div className={`${fixed ? "fixed" : "absolute"} inset-0 z-40 flex items-end`} role="presentation">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-black/60" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        className="relative max-h-full w-full overflow-y-auto rounded-t-2xl bg-white px-5 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-5 text-charcoal shadow-2xl"
      >
        <div className="mx-auto max-w-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-accent">{target.name}</p>
              <h2 id={`${id}-heading`} className="mt-1 text-xl font-bold text-deep-navy">
                {heading}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-soft-gray hover:text-deep-navy"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {state === "sent" ? (
            <div role="status" className="mt-3 space-y-4">
              <p className="text-sm text-gray-700">
                {simulated
                  ? "Preview: nothing was sent. On the live link, a confirm link goes to this email."
                  : `We sent a link to ${email.trim()}. Tap it within 20 minutes to follow ${target.name}.`}
              </p>
              <button type="button" onClick={onClose} className={DONE}>
                Keep watching
              </button>
            </div>
          ) : state === "unfollowed" ? (
            <div role="status" className="mt-3 space-y-4">
              <p className="text-sm text-gray-700">You won&apos;t hear from {target.name} through Showlnk anymore.</p>
              <button type="button" onClick={onClose} className={DONE}>
                Keep watching
              </button>
            </div>
          ) : isFollowing ? (
            <div className="mt-3 space-y-4">
              <p className="text-sm text-gray-700">You&apos;ll hear about their next nights first: presales, reveals and fans-only reels.</p>
              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}
              <button type="button" onClick={onClose} className={DONE}>
                Keep watching
              </button>
              <button
                type="button"
                onClick={unfollow}
                className="min-h-11 w-full rounded-md px-4 text-sm font-semibold text-gray-600 underline underline-offset-4 hover:text-deep-navy"
              >
                Unfollow {target.name}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-1 space-y-3">
              <p className="text-sm text-gray-600">Hear about their next nights first: presales, reveals and fans-only reels.</p>
              <div>
                <label htmlFor={`${id}-email`} className="mb-1 block text-sm font-semibold text-deep-navy">
                  Email
                </label>
                <input
                  ref={field}
                  id={`${id}-email`}
                  className="form-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}
              <button type="submit" disabled={state === "sending"} className={`${DONE} disabled:opacity-60`}>
                {state === "sending" ? "Sending..." : "Follow"}
              </button>
              <p className="text-[11px] leading-snug text-gray-500">
                {followConsent(target.name)} We&apos;ll email a link to confirm. <a href="/privacy" className="underline underline-offset-2">Privacy</a>
                {simulated && " Preview: nothing you enter is sent."}
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
