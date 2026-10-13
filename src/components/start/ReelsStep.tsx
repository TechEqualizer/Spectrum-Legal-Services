"use client";

import { useId, useState } from "react";
import { REEL_ROLES, type ReelRole } from "@/lib/funnel-draft";
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
 * tap plays it. Nothing to edit here: the wizard is for watching, and the
 * words and videos are changed in the admin once the link is theirs. The
 * next step claims the link. Building is free; going live comes after the
 * claim.
 */
export default function ReelsStep({
  draft,
  drafting,
  building = false,
  facts,
  onShow,
  onNext,
}: {
  draft: StartDraft;
  /** The reels are still being written. */
  drafting: boolean;
  /** The night isn't whole yet (the phone is scanning the flyer): it can't be claimed half-made. */
  building?: boolean;
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
      {!drafting && !draft.reels && <p className="mt-6 text-sm text-[var(--sl-muted)]">Your reels start from your flyer&apos;s basics.</p>}
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

