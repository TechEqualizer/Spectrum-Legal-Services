"use client";

import { useSyncExternalStore } from "react";
import type { AdminEvent } from "@/admin/AdminBusiness";
import CopyButton from "@/admin/components/ui/CopyButton";
import { startTour } from "@/admin/tour";
import { TRIAL_DAYS } from "@/lib/plans";

const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );

/**
 * Home, right after an organizer claims their link in the sign-up wizard
 * (/admin/home?welcome=<event>): their link to copy, Core's trial, and what
 * to do next. The tour waits until this is closed.
 */
export default function Welcome({ event, onOpen, onClose }: { event: AdminEvent; onOpen: (slug: string) => void; onClose: () => void }) {
  const origin = useOrigin();
  const link = `${origin}/f/${event.organizer.slug}`;
  const steps: { title: string; text: string; action: React.ReactNode }[] = [
    {
      title: "Add your videos",
      text: `${event.funnel.cover.hero?.title ?? event.funnel.brand.seriesLabel} has its reels; give each one a video.`,
      action: (
        <button type="button" onClick={() => onOpen(event.funnel.slug)} className="min-h-11 rounded-lg bg-deep-navy px-4 text-sm font-bold text-white hover:bg-royal-blue">
          Open your reels
        </button>
      ),
    },
    {
      title: "Put it in your bio",
      text: "One link for every night you put on. It always opens on your next one.",
      action: <CopyButton text={link} label="Copy link" announce="Link copied" className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:border-deep-navy" />,
    },
    {
      title: "Find your way around",
      text: "A minute's tour of Home, your reels, your links and your fans.",
      action: (
        <button
          type="button"
          onClick={() => {
            onClose();
            startTour();
          }}
          className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:border-deep-navy"
        >
          Take the tour
        </button>
      ),
    },
  ];

  return (
    <section aria-labelledby="welcome-title" className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-accent">Core · free for {TRIAL_DAYS} days</p>
          <h2 id="welcome-title" className="mt-1 text-2xl font-black tracking-tight text-deep-navy">
            Your link is ready
          </h2>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-semibold text-gray-600 hover:text-deep-navy">
          Done
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a href={link} target="_blank" rel="noopener" className="break-all text-lg font-bold text-royal-blue underline-offset-4 hover:underline">
          {link.replace(/^https?:\/\//, "")}
        </a>
        <CopyButton text={link} label="Copy link" announce="Link copied" className="min-h-11 rounded-lg bg-deep-navy px-4 text-sm font-bold text-white hover:bg-royal-blue" />
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-bold text-deep-navy">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-sm text-gray-600">{s.text}</p>
            </div>
            <div>{s.action}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
