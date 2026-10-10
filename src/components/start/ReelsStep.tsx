"use client";

import { useId } from "react";
import { REEL_DRIVERS, REEL_ROLES, type FunnelDraft, type ReelRole } from "@/lib/funnel-draft";
import { SCREEN_LIMITS } from "@/lib/publication";
import { FANS_REEL_ID, nightName, reelId, reelsOf, type StartDraft } from "@/lib/start-draft";

const GOLD_LINK = "min-h-11 text-sm font-semibold text-[var(--sl-gold)] underline underline-offset-4";
const SHOW = "min-h-11 shrink-0 rounded-full border border-[var(--sl-line)] px-4 text-sm font-semibold text-[var(--sl-text)] hover:border-[var(--sl-gold)]";

/** What Core adds, shown working in the phone during the trial. */
const CORE: { title: string; text: string; reel?: string }[] = [
  // Follow sits beside every reel.
  { title: "Follow", text: "Fans follow you in one tap and hear about every night you put on.", reel: reelId("the_night") },
  { title: "Presale for fans", text: "Your followers get tickets first, before everyone else." },
  { title: "Just for followers", text: "A reel only your followers can watch. Everyone else sees it locked.", reel: FANS_REEL_ID },
];

/**
 * Step 2 of the sign-up wizard: the opening scene and three reels drafted
 * from the flyer, playing in the phone. Every word can be changed here and
 * the phone keeps up; Core's features show working, with the trial.
 */
export default function ReelsStep({
  draft,
  drafting,
  onChange,
  onShow,
  onBack,
  onNext,
}: {
  draft: StartDraft;
  /** The reels are still being written. */
  drafting: boolean;
  onChange: (reels: FunnelDraft) => void;
  /** Start the phone over, at this reel (or the opening). */
  onShow: (reelId?: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const id = useId();
  const reels = reelsOf(draft);
  const setScreen = (key: keyof FunnelDraft["screen"], value: string) => onChange({ ...reels, screen: { ...reels.screen, [key]: value } });
  const setReel = (role: ReelRole, key: "title" | "summary", value: string) =>
    onChange({ ...reels, reels: reels.reels.map((r) => (r.role === role ? { ...r, [key]: value } : r)) });

  return (
    <section aria-labelledby={`${id}-title`} className="mt-10">
      <p className="text-sm font-semibold text-[var(--sl-gold)]">Step 2 of 3</p>
      <h1 id={`${id}-title`} className="sl-display mt-2 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.92]">
        Your night, in reels.
      </h1>
      <p className="mt-4 max-w-[34rem] text-lg text-[var(--sl-text)]/80">
        An opening scene and three reels for {nightName(draft)}, each answering what fans ask before they buy. Change any words; the phone keeps up.
      </p>

      {drafting && !draft.reels ? (
        <div role="status" className="mt-8 flex items-center gap-4 rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night-2)] p-5">
          <span aria-hidden="true" className="start-spinner size-6 shrink-0 rounded-full border-2 border-[var(--sl-gold)]/30 border-t-[var(--sl-gold)]" />
          <div>
            <p className="font-semibold text-[var(--sl-text)]">Writing your reels…</p>
            <p className="text-sm text-[var(--sl-muted)]">From your flyer: who fans get to be that night, who they&apos;ll be with, and why to buy now.</p>
          </div>
        </div>
      ) : (
        <>
          {!draft.reels && (
            <p className="mt-6 text-sm text-[var(--sl-muted)]">
              {draft.reelsFailed ? "We couldn't write these from your flyer just now, so they" : "These"} start from your flyer&apos;s basics. Make them yours.
            </p>
          )}
          <ol className="mt-8 grid gap-4">
            <li className="rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night-2)] p-5">
              <Head n={0} label="Opening" question="The first thing fans see" onShow={() => onShow()} />
              <Field label="Title" value={reels.screen.title} max={SCREEN_LIMITS.title} onChange={(v) => setScreen("title", v)} />
              <Field label="Line under it" value={reels.screen.tagline} max={SCREEN_LIMITS.tagline} long onChange={(v) => setScreen("tagline", v)} />
            </li>
            {reels.reels.map((r, i) => (
              <li key={r.role} className="rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night-2)] p-5">
                <Head n={i + 1} label={REEL_ROLES[r.role]} question={REEL_DRIVERS[r.role].question} onShow={() => onShow(reelId(r.role))} />
                <Field label="Title" value={r.title} max={80} onChange={(v) => setReel(r.role, "title", v)} />
                <Field label="Words" value={r.summary} max={280} long onChange={(v) => setReel(r.role, "summary", v)} />
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-[var(--sl-muted)]">
            Your videos come after you claim your link. Until then, each reel plays over your flyer.
          </p>
        </>
      )}

      <section aria-labelledby={`${id}-core`} className="mt-10 rounded-2xl border border-[var(--sl-gold)]/45 bg-[var(--sl-gold)]/[0.06] p-5 sm:p-6">
        <p className="text-sm font-semibold text-[var(--sl-gold)]">Core · free for 14 days</p>
        <h2 id={`${id}-core`} className="mt-1 text-xl font-bold text-[var(--sl-text)]">
          Already on your link
        </h2>
        <ul className="mt-4 grid gap-4">
          {CORE.map((c) => (
            <li key={c.title} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--sl-text)]">{c.title}</p>
                <p className="text-sm text-[var(--sl-text)]/75">{c.text}</p>
              </div>
              <button type="button" className={SHOW} aria-label={`See ${c.title} in the phone`} onClick={() => onShow(c.reel)}>
                See it
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-[var(--sl-muted)]">Free for 14 days from when you claim your link. No card needed.</p>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex min-h-12 items-center rounded-full bg-[var(--sl-gold)] px-8 text-base font-bold text-[var(--sl-ink)] hover:bg-[var(--sl-gold-deep)]"
        >
          Continue
        </button>
        <button type="button" onClick={onBack} className={GOLD_LINK}>
          Back to your flyer
        </button>
      </div>
    </section>
  );
}

function Head({ n, label, question, onShow }: { n: number; label: string; question: string; onShow: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sl-gold)]">
          {n ? `${n} · ` : ""}
          {label}
        </p>
        <p className="mt-0.5 text-sm text-[var(--sl-muted)]">{question}</p>
      </div>
      <button type="button" className={SHOW} aria-label={`Play ${label} in the phone`} onClick={onShow}>
        Play
      </button>
    </div>
  );
}

function Field({ label, value, max, long, onChange }: { label: string; value: string; max: number; long?: boolean; onChange: (v: string) => void }) {
  const id = useId();
  const cls =
    "mt-1.5 w-full rounded-xl border border-[var(--sl-line)] bg-[var(--sl-night)] px-3.5 py-2.5 text-base text-[var(--sl-text)] outline-none focus:border-[var(--sl-gold)] focus-visible:ring-2 focus-visible:ring-[var(--sl-gold)]/40";
  return (
    <div className="mt-4">
      <label htmlFor={id} className="text-sm font-semibold text-[var(--sl-text)]/85">
        {label}
      </label>
      {long ? (
        <textarea id={id} rows={2} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} resize-none`} />
      ) : (
        <input id={id} type="text" maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
