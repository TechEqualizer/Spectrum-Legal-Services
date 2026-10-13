"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAdminEvents, useMaybeAdminBusiness, type AdminEvent } from "@/admin/AdminBusiness";
import { closeGoLive, openGoLive, useGoLive } from "@/admin/go-live";
import { usePlanInfo } from "@/admin/plan";
import { titleFontClass } from "@/components/lookFonts";
import type { Funnel } from "@/data/funnel-types";
import { upcomingEvents } from "@/lib/events";
import { sceneMediaOf, thumbnailOf } from "@/lib/media";
import type { OpeningRecipe } from "@/lib/opening";
import { CORE_PRICE, FANS_PRICE, hasCore, REFUND_DAYS } from "@/lib/plans";

// The opening's player loads only when the sheet opens on a flyer with one.
const OpeningBackdrop = dynamic(() => import("@/components/OpeningBackdrop"), { ssr: false });

const DAY = 864e5;

/** What going live gives them, as what it does for their night. */
const CORE_GETS = ["Your link live, with Tickets one tap away", "A link for every post, and what each one sold", "Ticket sales from Eventbrite"];
const FANS_GETS = ["Everyone watching can follow you", "Presales and fans-only reels for followers", "Your nights in their calendars"];

/** "Your next night is in 12 days.", from their own dates; nothing when there's no date soon. */
function countdown(funnel: Funnel, now: number): string {
  const next = upcomingEvents(funnel, now)[0];
  if (!next) return "";
  const start = new Date(next.startsAt);
  const days = Math.round((new Date(start).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY);
  if (days <= 0) return "Your night is tonight. Go live and fans can still get tickets.";
  if (days === 1) return "Your night is tomorrow. Go live tonight and it sells while they scroll.";
  if (days > 90) return "";
  return `Your next night is in ${days} days. Every day it's live is a day it sells.`;
}

/**
 * Going live, in one sheet: their own opening playing as fans will see it,
 * what's at stake (their next night, counted down from their own dates), and
 * two plans side by side, Core and Core with the Fans add-on, yearly first.
 * Nothing is chosen for them beyond Core: the add-on is a plan they pick,
 * never a box ticked in advance. One button to Stripe; "Keep building
 * privately" closes it. Opens from the end of the welcome tour and every Go
 * live in the admin, or a link with ?golive=<organizer>.
 */
export default function GoLiveSheet() {
  const open = useGoLive();
  const pathname = usePathname();
  const events = useAdminEvents();
  const business = useMaybeAdminBusiness();

  // ?golive=<organizer>: open it (once), for that organizer's link.
  useEffect(() => {
    const url = new URL(window.location.href);
    const wanted = url.searchParams.get("golive");
    if (wanted === null) return;
    url.searchParams.delete("golive");
    window.history.replaceState(window.history.state, "", url);
    openGoLive(wanted);
  }, [pathname]);

  const organizer = open?.organizer;
  const event =
    (organizer && events.find((e) => e.organizer.slug === organizer)) || events.find((e) => e.funnel.slug === business?.funnel.slug) || events[0];
  if (!open || !event) return null;
  return <Sheet key={event.funnel.slug} event={event} />;
}

function Sheet({ event }: { event: AdminEvent }) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const info = usePlanInfo(event.funnel.slug);
  const [cadence, setCadence] = useState<"month" | "year">("year");
  const [fans, setFans] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [now] = useState(() => Date.now());
  const live = Boolean(info && (hasCore(info.plan) || info.plan.status === "past_due"));

  useEffect(() => {
    const dialog = ref.current;
    if (live) closeGoLive();
    else if (dialog && !dialog.open) dialog.showModal();
  }, [live]);

  const funnel = event.live;
  const night = funnel.cover.hero?.title ?? funnel.brand.name;
  const soon = countdown(funnel, now);
  const price = CORE_PRICE[cadence] + (fans ? FANS_PRICE[cadence] : 0);
  const per = cadence === "year" ? "year" : "month";

  const checkout = async () => {
    setBusy(true);
    setProblem("");
    const res = await fetch("/api/admin/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: event.funnel.slug, interval: cadence, fans }),
    }).catch(() => null);
    const out = await res?.json().catch(() => null);
    if (res?.ok && out?.url) {
      window.location.assign(out.url);
      return;
    }
    setBusy(false);
    setProblem(out?.error ?? "Couldn't reach the server. Try again.");
  };

  if (live) return null;
  return (
    <dialog
      ref={ref}
      onClose={closeGoLive}
      onCancel={(e) => busy && e.preventDefault()}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-why`}
      data-testid="go-live"
      className="m-auto max-h-[94dvh] w-[min(46rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-white p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/70"
    >
      {/* Phones: the phone small beside the heading, the rest below. Wider: the phone in its own column. */}
      <div className="grid grid-cols-[6rem_1fr] items-start gap-x-4 gap-y-4 p-5 sm:grid-cols-[7rem_1fr] sm:p-6 md:grid-cols-[13rem_1fr] md:gap-x-7 md:gap-y-0">
        <div className="col-start-1 row-start-1 md:row-span-2">
          <Phone funnel={funnel} />
          <p className="mt-3 hidden text-center text-xs text-gray-600 md:block">What fans see once you&apos;re live</p>
        </div>
        <h2
          id={`${id}-title`}
          tabIndex={-1}
          autoFocus
          className="col-start-2 row-start-1 self-center text-balance text-xl font-black leading-tight tracking-tight text-deep-navy outline-none sm:text-2xl md:self-start"
        >
          Put {night} in front of fans.
        </h2>

        <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2">
          <p id={`${id}-why`} className="text-sm leading-relaxed text-gray-700 md:mt-2">
            Right now anyone who opens your link sees Coming soon. {soon}
          </p>

          <div role="radiogroup" aria-label="Billing" className="mt-4 grid w-full grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1 sm:inline-grid sm:w-auto">
            {(["year", "month"] as const).map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={cadence === i}
                onClick={() => setCadence(i)}
                className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition sm:px-4 ${cadence === i ? "bg-white text-deep-navy shadow-sm" : "text-gray-600 hover:text-deep-navy"}`}
              >
                {i === "year" ? (
                  <>
                    Yearly <span className={`block text-xs font-normal sm:inline sm:text-sm ${cadence === i ? "text-accent-ink" : ""}`}><span className="hidden sm:inline">· </span>2 months free</span>
                  </>
                ) : (
                  "Monthly"
                )}
              </button>
            ))}
          </div>

          <fieldset className="mt-3 grid gap-2.5">
            <legend className="sr-only">Plan</legend>
            <PlanCard
              name={`${id}-plan`}
              checked={!fans}
              onChoose={() => setFans(false)}
              title="Core"
              price={CORE_PRICE[cadence]}
              cadence={cadence}
              gets={CORE_GETS}
            />
            <PlanCard
              name={`${id}-plan`}
              checked={fans}
              onChoose={() => setFans(true)}
              title="Core + Fans"
              tag="For nights you run again"
              price={CORE_PRICE[cadence] + FANS_PRICE[cadence]}
              cadence={cadence}
              lead="Everything in Core, and the people watching become a list you own:"
              gets={FANS_GETS}
              featured
            />
          </fieldset>

          {/* On a phone the plans scroll under it: Go live and what it charges stay in reach. */}
          <div className="sticky bottom-0 -mx-5 mt-4 border-t border-gray-100 bg-white/95 px-5 pb-1 pt-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            {info && !info.billing ? (
              <p role="status" className="rounded-lg bg-soft-gray px-3 py-2.5 text-sm text-deep-navy">
                Going live isn&apos;t switched on here yet. Message Showlnk and we&apos;ll put your link live.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || !info}
                  onClick={checkout}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#e8be5a] px-5 text-base font-bold text-[#1a1208] shadow-[0_6px_18px_-6px_rgb(232_190_90/0.7)] transition hover:brightness-105 disabled:opacity-50"
                >
                  {busy ? "Opening checkout…" : `Go live · $${price} today`}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Charged today, then ${price} every {per} until you cancel, any time in Settings. Full refund in your first {REFUND_DAYS} days: just ask. You pay on Stripe&apos;s
                  secure page.
                </p>
              </>
            )}
            {problem && (
              <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
                {problem}
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => ref.current?.close()}
              className="mt-1 min-h-11 w-full rounded-lg text-sm font-semibold text-gray-600 hover:bg-soft-gray hover:text-deep-navy disabled:opacity-40"
            >
              Keep building privately
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function PlanCard({
  name,
  checked,
  onChoose,
  title,
  tag,
  price,
  cadence,
  lead,
  gets,
  featured = false,
}: {
  name: string;
  checked: boolean;
  onChoose: () => void;
  title: string;
  tag?: string;
  price: number;
  cadence: "month" | "year";
  lead?: string;
  gets: string[];
  featured?: boolean;
}) {
  return (
    <label
      className={`relative flex cursor-pointer gap-3 rounded-xl border px-4 py-3.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-deep-navy/40 ${
        checked ? "border-deep-navy bg-white shadow-[0_8px_20px_-12px_rgb(14_26_43/0.45)] ring-1 ring-deep-navy" : featured ? "border-[#e8be5a] bg-amber-50/40 hover:border-[#d4a63e]" : "border-gray-200 bg-white hover:border-gray-400"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChoose} className="mt-1 size-5 shrink-0 accent-[#0E1A2B]" />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-base font-bold text-deep-navy">{title}</span>
            {tag && <span className="mt-1 inline-block rounded-full bg-[#e8be5a]/30 px-2 py-0.5 text-xs font-semibold text-[#5c4410]">{tag}</span>}
          </span>
          <span className="shrink-0 text-right text-sm text-gray-700">
            <span className="text-base font-bold tabular-nums text-deep-navy">${price}</span>/{cadence === "year" ? "year" : "month"}
            {cadence === "year" && <span className="block text-xs tabular-nums text-gray-600">${Math.floor(price / 12)} a month</span>}
          </span>
        </span>
        {lead && <span className="mt-1 block text-sm text-gray-700">{lead}</span>}
        <span role="list" className="mt-1.5 grid gap-1">
          {gets.map((g) => (
            <span role="listitem" key={g} className="flex gap-2 text-sm text-gray-700">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-deep-navy" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {g}
            </span>
          ))}
        </span>
      </span>
    </label>
  );
}

/** Their link's opening, playing in a phone, as fans will see it once it's live. */
function Phone({ funnel }: { funnel: Funnel }) {
  const media = sceneMediaOf(funnel);
  const opening = media?.kind === "image" && media.fit === "poster" ? (media.opening as OpeningRecipe | undefined) : undefined;
  const still = thumbnailOf(media);
  const font = funnel.cover.titleFont;
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.1rem] bg-deep-navy shadow-[0_18px_40px_-16px_rgb(14_26_43/0.65)] ring-1 ring-black/10 md:rounded-[1.6rem]"
      style={{ background: `radial-gradient(120% 80% at 50% 20%, ${funnel.brand.theme?.["--teal-accent"] ?? "#28719A"}, ${funnel.brand.theme?.["--deep-navy"] ?? "#0E1A2B"})` }}
    >
      {opening && media?.kind === "image" ? (
        <OpeningBackdrop src={media.src} recipe={opening} depth={media.depth} fontClass={titleFontClass(font)} caps={font === "regal" || font === "bold"} paused={false} skip={false} onHold={noop} />
      ) : still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still} alt="" className="absolute inset-0 size-full object-cover" />
      ) : null}
    </div>
  );
}

function noop() {}
