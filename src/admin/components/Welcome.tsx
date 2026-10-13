"use client";

import { useLinkOrigin } from "@/admin/link-origin";
import type { AdminEvent } from "@/admin/AdminBusiness";
import CopyButton from "@/admin/components/ui/CopyButton";
import { openGoLive } from "@/admin/go-live";
import { usePlan } from "@/admin/plan";
import { startTour } from "@/admin/tour";
import { CORE_PRICE, hasCore } from "@/lib/plans";

/**
 * Home, right after an organizer claims their link in the sign-up wizard
 * (/admin/home?welcome=<event>): their link, private until they go live (it
 * opens their own preview), and what to do next. The welcome tour starts
 * over it first, comes back to it when it ends and opens Go live over it.
 */
export default function Welcome({ event, onOpen, onClose }: { event: AdminEvent; onOpen: (slug: string) => void; onClose: () => void }) {
  const origin = useLinkOrigin();
  const link = `${origin}/f/${event.organizer.slug}`;
  const plan = usePlan(event.funnel.slug);
  const live = Boolean(plan && hasCore(plan));
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
    live
      ? {
          title: "Put it in your bio",
          text: "One link for every night you put on. It always opens on your next one.",
          action: <CopyButton text={link} label="Copy link" announce="Link copied" className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:border-deep-navy" />,
        }
      : {
          title: "Go live",
          text: `Fans see Coming soon until you do. $${CORE_PRICE.month} a month or $${CORE_PRICE.year} a year.`,
          action: (
            <button type="button" onClick={() => openGoLive()} className="inline-flex min-h-11 items-center rounded-lg bg-[#e8be5a] px-4 text-sm font-bold text-[#1a1208] hover:brightness-105">
              Go live
            </button>
          ),
        },
    {
      title: "Find your way around",
      text: "A walk through Home, your reels, your links and your fans, any time.",
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
          <p className="text-xs font-bold uppercase tracking-wider text-accent-ink">{live ? "Live" : "Private until you go live"}</p>
          <h2 id="welcome-title" className="mt-1 text-2xl font-black tracking-tight text-deep-navy">
            Your link is ready
          </h2>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-semibold text-gray-600 hover:text-deep-navy">
          Done
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {/* Before it's live, the address opens their own preview (the public sees Coming soon). */}
        <a href={live ? link : `/admin/link/${event.organizer.slug}`} target="_blank" rel="noopener" className="break-all text-lg font-bold text-royal-blue underline-offset-4 hover:underline">
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
