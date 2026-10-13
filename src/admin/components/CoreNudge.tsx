"use client";

import Link from "next/link";
import { useAdminEvents, useMaybeAdminBusiness } from "@/admin/AdminBusiness";
import { openGoLive } from "@/admin/go-live";
import { ADD_FANS_HREF, START_CORE_HREF, useFansSnooze, usePlan } from "@/admin/plan";
import { CORE_PRICE, FANS_PRICE, hasCore, TRIAL_DAYS, wantsFans, type Plan } from "@/lib/plans";

const DAY = 864e5;
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

type Nudge = {
  eyebrow: string;
  title: string;
  text: string;
  action: string;
  href: string;
  urgent: boolean;
  daysLeft?: number;
  used?: number;
  /** An offer, not something they must do: it has Not now, and no chip on phones. */
  offer?: boolean;
  /** Opens the Go live sheet where they are, rather than going to href. */
  goLive?: boolean;
};

/**
 * What to say about Core, or nothing: before they pay, that their link is
 * private and Go live; on a trial without a card yet (from before "Pay to go
 * live"), the days left; with a declined card, update it. Once live without
 * the fans add-on, the add-on (an offer they can put off). Nothing when comped
 * or with everything. (docs/plans/03-billing.md, "Upgrade nudges".)
 */
export function nudgeFor(plan: Plan | undefined, now = Date.now()): Nudge | null {
  if (!plan) return null;
  const core = hasCore(plan, now);
  if (plan.status === "trialing" && core && !plan.interval && plan.trialEndsAt) {
    const left = Math.max(1, Math.ceil((Date.parse(plan.trialEndsAt) - now) / DAY));
    const ends = day(plan.trialEndsAt);
    return {
      eyebrow: "Core trial",
      title: `${left === 1 ? "1 day" : `${left} days`} left`,
      text: left > 2 ? `Your trial ends ${ends}. Keep Core to keep your link live.` : `On ${ends} your link goes back to Coming soon.`,
      action: "Keep Core",
      href: START_CORE_HREF,
      urgent: left <= 3,
      daysLeft: left,
      used: Math.min(1, Math.max(0, 1 - left / TRIAL_DAYS)),
    };
  }
  if (plan.status === "past_due" && core) {
    return { eyebrow: "Core", title: "Card declined", text: "Update it to keep your link live.", action: "Update card", href: START_CORE_HREF, urgent: true };
  }
  if (!core && plan.status !== "comped") {
    return {
      eyebrow: "Your link is private",
      title: "Go live",
      text: `Fans see Coming soon until you do. $${CORE_PRICE.month} a month or $${CORE_PRICE.year} a year.`,
      action: "Go live",
      href: START_CORE_HREF,
      urgent: false,
      goLive: plan.status !== "past_due",
    };
  }
  if (wantsFans(plan, now)) {
    const per = plan.interval ?? "month";
    return {
      eyebrow: "Fans add-on",
      title: "Let fans follow you",
      text: `Follow, presales and fans-only reels, so your next night sells to people who asked. $${FANS_PRICE[per]} a ${per}.`,
      action: "Add Fans",
      href: ADD_FANS_HREF,
      urgent: false,
      offer: true,
    };
  }
  return null;
}

/** Go live opens its sheet right here (the link to Settings → Plan is the fallback). */
const goLiveHere = (nudge: Nudge) =>
  nudge.goLive
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        openGoLive();
      }
    : undefined;

/** The selected event's organizer's nudge, unless it's an offer they put off; and Not now. */
function useNudge(): [Nudge | null, () => void] {
  const slug = useMaybeAdminBusiness()?.funnel.slug;
  const organizer = useAdminEvents().find((e) => e.funnel.slug === slug)?.organizer.slug ?? slug;
  const nudge = nudgeFor(usePlan(slug));
  const [snoozed, snooze] = useFansSnooze(organizer);
  return [nudge?.offer && snoozed ? null : nudge, snooze];
}

/** The nudge in the sidebar (desktop), or folded to a badge when the sidebar is. */
export default function CoreNudge({ collapsed }: { collapsed: boolean }) {
  const [nudge, snooze] = useNudge();
  if (!nudge) return null;
  if (collapsed) {
    return (
      <Link
        href={nudge.href}
        onClick={goLiveHere(nudge)}
        title={`${nudge.eyebrow}: ${nudge.title}. ${nudge.action}`}
        aria-label={`${nudge.eyebrow}: ${nudge.title}. ${nudge.action}`}
        className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-[#e8be5a] text-xs font-black text-deep-navy hover:brightness-110"
      >
        {nudge.daysLeft !== undefined ? `${nudge.daysLeft}d` : <StarIcon />}
      </Link>
    );
  }
  return (
    <section aria-label={nudge.eyebrow} className={`mb-3 rounded-xl p-3.5 ${nudge.urgent ? "bg-[#e8be5a] text-deep-navy" : "bg-white/10 text-white"}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wider ${nudge.urgent ? "text-deep-navy/70" : "text-[#e8be5a]"}`}>{nudge.eyebrow}</p>
      <p className="mt-0.5 text-base font-black">{nudge.title}</p>
      {nudge.used !== undefined && (
        <div aria-hidden="true" className={`mt-2 h-1.5 overflow-hidden rounded-full ${nudge.urgent ? "bg-deep-navy/15" : "bg-white/15"}`}>
          <div className={`h-full rounded-full ${nudge.urgent ? "bg-deep-navy" : "bg-[#e8be5a]"}`} style={{ width: `${Math.round(nudge.used * 100)}%` }} />
        </div>
      )}
      {/* On a short window the days left say enough. */}
      <p className={`mt-2 text-xs leading-snug low:hidden ${nudge.urgent ? "text-deep-navy/85" : "text-white/80"}`}>{nudge.text}</p>
      <Link
        href={nudge.href}
        onClick={goLiveHere(nudge)}
        className={`mt-3 flex min-h-11 items-center justify-center rounded-lg text-sm font-bold ${nudge.urgent ? "bg-deep-navy text-white hover:bg-royal-blue" : "bg-[#e8be5a] text-deep-navy hover:brightness-110"}`}
      >
        {nudge.action}
      </Link>
      {nudge.offer && (
        <button type="button" onClick={snooze} className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white">
          Not now
        </button>
      )}
    </section>
  );
}

/** Phones (no sidebar): the same nudge as a chip beside the account button; offers stay on Home. */
export function CoreNudgeChip() {
  const [nudge] = useNudge();
  if (!nudge || nudge.offer) return null;
  return (
    <Link
      href={nudge.href}
      onClick={goLiveHere(nudge)}
      aria-label={`${nudge.eyebrow}: ${nudge.title}. ${nudge.action}`}
      className="group inline-flex min-h-11 items-center px-0.5"
    >
      {/* A small pill in a full-size tap target. */}
      <span className="whitespace-nowrap rounded-full bg-[#e8be5a] px-3 py-1.5 text-xs font-bold leading-none text-deep-navy group-hover:brightness-105">
        {nudge.daysLeft !== undefined ? `Core · ${nudge.daysLeft}d` : nudge.action}
      </span>
    </Link>
  );
}

function StarIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l2.9 6.9L22 9.6l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.6L2 9.6l7.1-.7z" />
    </svg>
  );
}
