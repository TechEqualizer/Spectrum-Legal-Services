"use client";

import { REEL_ROLES } from "@/lib/funnel-draft";
import type { StartDraft } from "@/lib/start-draft";

/** Where the flyer's depth map is: being made, made, or not made on this device (then the line isn't shown). */
export type DepthState = "making" | "done" | "none";

type State = "done" | "working" | "fallback";

/**
 * What one flyer is turning into, ticked off line by line as each piece
 * really lands: the night and its dates, its colors, three reels, the
 * opening and cuts, the flyer in 3D. Shown right after the scan, while the
 * phone beside it builds the same things, so the organizer watches the work
 * being done for them (people value a result more when they see the effort:
 * docs/plans/09-flyer-to-video.md, "The wizard waited on everything").
 */
export default function BuildList({ draft, drafting, depth }: { draft: StartDraft; drafting: boolean; depth: DepthState }) {
  const reels = draft.reels?.reels ?? [];
  const cuts = reels.filter((r) => r.cut).length;
  const swatches = draft.look?.palette?.slice(0, 5) ?? [];
  const opening = Boolean(draft.reels?.opening);
  const shot = [opening && "The opening", cuts && `${cuts} ${cuts === 1 ? "reel" : "reels"}`].filter(Boolean).join(" and ");
  const lines: { key: string; state: State; title: string; detail?: React.ReactNode }[] = [
    { key: "night", state: "done", title: "Your night, its dates and venue", detail: "Read from your flyer" },
    ...(draft.look
      ? [
          {
            key: "look",
            state: "done" as State,
            title: "Your colors and type",
            detail: swatches.length ? (
              <span className="flex gap-1.5" aria-label="Your flyer's colors">
                {swatches.map((c) => (
                  <span key={c} className="size-3.5 rounded-full border border-white/15" style={{ backgroundColor: c }} />
                ))}
              </span>
            ) : (
              "Taken from your flyer"
            ),
          },
        ]
      : []),
    {
      key: "reels",
      state: reels.length ? "done" : drafting ? "working" : "fallback",
      title: "Three reels that sell your night",
      detail: reels.length
        ? reels.map((r) => r.title).join(" · ")
        : drafting
          ? `Writing ${Object.values(REEL_ROLES).join(", ")}…`
          : "They start from your flyer's basics",
    },
    {
      key: "shots",
      state: shot ? "done" : drafting ? "working" : "fallback",
      title: "An opening and every reel, cut from your flyer",
      detail: shot ? `${shot}, shot by shot like a trailer` : drafting ? "Choosing the shots on your flyer…" : "They play over your flyer",
    },
    ...(depth === "none" ? [] : [{ key: "depth", state: (depth === "done" ? "done" : "working") as State, title: "Your flyer, in 3D", detail: depth === "done" ? "Near things move more than far ones" : "Finding what's near and far…" }]),
  ];
  const left = lines.filter((l) => l.state === "working").length;
  const basics = lines.some((l) => l.state === "fallback");

  return (
    <div className="mt-5 border-t border-[var(--sl-line)] pt-4">
      <p className="text-sm font-semibold text-[var(--sl-text)]">{left ? "Building your link…" : basics ? "Your link is ready, from your flyer's basics." : "Your link is built."}</p>
      <ul aria-live="polite" className="mt-3 grid gap-3">
        {lines.map((l) => (
          <li key={l.key} className="flex items-start gap-3">
            <Mark state={l.state} />
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${l.state === "fallback" ? "text-[var(--sl-text)]/60" : "text-[var(--sl-text)]"}`}>
                {l.title}
                <span className="sr-only">{l.state === "done" ? ", done" : l.state === "working" ? ", in progress" : ""}</span>
              </span>
              {l.detail && <span className="mt-0.5 block text-sm text-[var(--sl-muted)]">{l.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mark({ state }: { state: State }) {
  if (state === "working") return <span aria-hidden="true" className="start-spinner mt-0.5 size-5 shrink-0 rounded-full border-2 border-[var(--sl-gold)]/30 border-t-[var(--sl-gold)]" />;
  if (state === "fallback") return <span aria-hidden="true" className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-[var(--sl-line)]" />;
  return (
    <span aria-hidden="true" className="start-tick mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--sl-gold)] text-[var(--sl-ink)]">
      <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
