"use client";

import { useId, useState } from "react";
import { REEL_DRIVERS, REEL_ROLES, type FunnelDraft, type ReelRole } from "@/lib/funnel-draft";
import { SCREEN_LIMITS } from "@/lib/publication";
import { nightName, reelId, reelsOf, type StartDraft } from "@/lib/start-draft";


/** Why each part sells, in a line: what the visitor gets from it. */
const SELLS: Record<"opening" | ReelRole, string> = {
  opening: "The first thing fans see: your night, its dates and Tickets.",
  the_night: "Makes them want it.",
  your_people: "Shows them it's for people like them.",
  last_call: "Gives them a reason to buy now.",
};

/**
 * Step 2 of the sign-up wizard: watch your night. The phone plays the story
 * drafted from the flyer (the opening, then The Night, Your People and Last
 * Call, ending on Tickets); each part is named here with why it sells, and a
 * tap plays it. The words can be changed, folded away under "Change the
 * words"; the next step claims the link. Building is free; going live comes
 * after the claim.
 */
export default function ReelsStep({
  draft,
  drafting,
  building = false,
  onChange,
  facts,
  onShow,
  onNext,
}: {
  draft: StartDraft;
  /** The reels are still being written. */
  drafting: boolean;
  /** The night isn't whole yet (the phone is scanning the flyer): it can't be claimed half-made. */
  building?: boolean;
  onChange: (reels: FunnelDraft) => void;
  /** What the flyer said and what it's becoming, under the heading. */
  facts?: React.ReactNode;
  /** Start the phone over, at this reel (or the opening). */
  onShow: (reelId?: string) => void;
  onNext: () => void;
}) {
  const id = useId();
  const reels = reelsOf(draft);
  // The reels were cut from the flyer (not just shown over it).
  const cut = reels.reels.some((r) => r.cut);
  // The part last played in the phone; it starts at the opening.
  const [playing, setPlaying] = useState<"opening" | ReelRole>("opening");
  const setScreen = (key: keyof FunnelDraft["screen"], value: string) => onChange({ ...reels, screen: { ...reels.screen, [key]: value } });
  const setReel = (role: ReelRole, key: "title" | "summary", value: string) =>
    onChange({ ...reels, reels: reels.reels.map((r) => (r.role === role ? { ...r, [key]: value } : r)) });
  const play = (part: "opening" | ReelRole) => {
    setPlaying(part);
    onShow(part === "opening" ? undefined : reelId(part));
  };
  const parts: { part: "opening" | ReelRole; label: string; title: string }[] = [
    { part: "opening", label: "Opening", title: reels.screen.title },
    ...reels.reels.map((r) => ({ part: r.role, label: REEL_ROLES[r.role], title: r.title })),
  ];

  return (
    <section aria-labelledby={`${id}-title`} className="mt-10">
      <p className="text-sm font-semibold text-[var(--sl-gold)]">Step 2 of 3</p>
      <h1 id={`${id}-title`} className="sl-display mt-2 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.92]">
        Watch your night.
      </h1>
      <p className="mt-4 max-w-[34rem] text-lg text-[var(--sl-text)]/80">
        {cut ? "One flyer in. An opening and three reels out, each cut from your flyer" : "Your flyer, made into the story fans watch"} to sell {nightName(draft)}, ending on Tickets.
      </p>

      {facts}
      {/* Never a wait: the story plays from the flyer's basics at once, and gets better in place as it's written (the list above says how far it's got). */}
      {!drafting && !draft.reels && (
        <p className="mt-6 text-sm text-[var(--sl-muted)]">
          {draft.reelsFailed ? "We couldn't write these from your flyer just now, so they" : "These"} start from your flyer&apos;s basics. Make them yours under Change the words.
        </p>
      )}
      <>
          <ol aria-label="Your story" className="mt-8 grid gap-2">
            {parts.map((x, i) => {
              const on = playing === x.part;
              return (
                <li key={x.part}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`Play ${x.label} in the phone`}
                    onClick={() => play(x.part)}
                    className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors motion-reduce:transition-none ${
                      on ? "border-[var(--sl-gold)] bg-[var(--sl-gold)]/[0.08]" : "border-[var(--sl-line)] bg-[var(--sl-night-2)] hover:border-[var(--sl-gold)]/60"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${on ? "bg-[var(--sl-gold)] text-[var(--sl-ink)]" : "border border-[var(--sl-line)] text-[var(--sl-text)]/80"}`}
                    >
                      {on ? <PlayIcon /> : i || "▸"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--sl-gold)]">{x.label}</span>
                      <span className="mt-0.5 block truncate font-semibold text-[var(--sl-text)]">{x.title || "Untitled"}</span>
                      <span className="block text-sm text-[var(--sl-muted)]">{SELLS[x.part]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm text-[var(--sl-muted)]">
            {cut
              ? "Every shot is your flyer, directed like a trailer. Got videos? Add them after you claim your link, and they take a reel's place."
              : "Until your videos come, each reel plays over your flyer. You add them after you claim your link."}
          </p>

          {/* Words to change once they're written, not the basics they're about to replace. */}
          {!(drafting && !draft.reels) && (
          <details className="group mt-6 rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night-2)]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold text-[var(--sl-text)] [&::-webkit-details-marker]:hidden">
              Change the words
              <svg aria-hidden="true" className="size-4 text-[var(--sl-muted)] transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="grid gap-6 border-t border-[var(--sl-line)] px-5 pb-5 pt-1">
              <fieldset>
                <legend className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--sl-gold)]">Opening</legend>
                <Field label="Title" value={reels.screen.title} max={SCREEN_LIMITS.title} onChange={(v) => setScreen("title", v)} />
                <Field label="Line under it" value={reels.screen.tagline} max={SCREEN_LIMITS.tagline} long onChange={(v) => setScreen("tagline", v)} />
              </fieldset>
              {reels.reels.map((r, i) => (
                <fieldset key={r.role}>
                  <legend className="text-xs font-semibold uppercase tracking-wider text-[var(--sl-gold)]">
                    {i + 1} · {REEL_ROLES[r.role]} <span className="font-normal normal-case tracking-normal text-[var(--sl-muted)]">{REEL_DRIVERS[r.role].question}</span>
                  </legend>
                  <Field label="Title" value={r.title} max={80} onChange={(v) => setReel(r.role, "title", v)} />
                  <Field label="Words" value={r.summary} max={280} long onChange={(v) => setReel(r.role, "summary", v)} />
                </fieldset>
              ))}
            </div>
          </details>
          )}
      </>

      {/* Phones: the next step stays in reach at the bottom while they watch. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--sl-line)] bg-[var(--sl-night)]/95 px-5 py-3 backdrop-blur lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <button
          type="button"
          onClick={onNext}
          disabled={building}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--sl-gold)] px-8 text-base font-bold text-[var(--sl-ink)] hover:bg-[var(--sl-gold-deep)] disabled:cursor-wait disabled:opacity-60 lg:flex-none"
        >
          {building ? "Building your night…" : "Claim this link"}
        </button>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
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
