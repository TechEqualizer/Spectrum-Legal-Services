"use client";

import Link from "next/link";
import { useMaybeAdminBusiness } from "@/admin/AdminBusiness";
import { START_CORE_HREF, usePlan } from "@/admin/plan";
import { hasCore, TRIAL_DAYS, type Plan } from "@/lib/plans";

const DAY = 864e5;
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

type Nudge = { eyebrow: string; title: string; text: string; action: string; urgent: boolean; daysLeft?: number; used?: number };

/**
 * What to say about Core, or nothing: on a trial without a card yet, the
 * days left and that keeping Core now costs nothing until the trial ends
 * (sooner is never more expensive, so there's no reason to wait); on Free,
 * what Core adds; with a declined card, update it. Nothing once they pay or
 * are comped. (docs/plans/03-billing.md, "Upgrade nudges".)
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
      text: left > 2 ? `Keep Core now. You won't be charged until ${ends}.` : `Core ends ${ends}: Follow past 100 fans, presales and fans-only reels stop.`,
      action: "Keep Core",
      urgent: left <= 3,
      daysLeft: left,
      used: Math.min(1, Math.max(0, 1 - left / TRIAL_DAYS)),
    };
  }
  if (plan.status === "past_due" && core) {
    return { eyebrow: "Core", title: "Card declined", text: "Update it to keep Core.", action: "Update card", urgent: true };
  }
  if (!core && plan.status !== "comped") {
    return { eyebrow: "You're on Free", title: "Get Core", text: "Unlimited fans, presales and reels only your followers can watch.", action: "Get Core", urgent: false };
  }
  return null;
}

/** The nudge in the sidebar (desktop), or folded to a badge when the sidebar is. */
export default function CoreNudge({ collapsed }: { collapsed: boolean }) {
  const slug = useMaybeAdminBusiness()?.funnel.slug;
  const nudge = nudgeFor(usePlan(slug));
  if (!nudge) return null;
  if (collapsed) {
    return (
      <Link
        href={START_CORE_HREF}
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
      <p className={`mt-2 text-xs leading-snug ${nudge.urgent ? "text-deep-navy/85" : "text-white/80"}`}>{nudge.text}</p>
      <Link
        href={START_CORE_HREF}
        className={`mt-3 flex min-h-11 items-center justify-center rounded-lg text-sm font-bold ${nudge.urgent ? "bg-deep-navy text-white hover:bg-royal-blue" : "bg-[#e8be5a] text-deep-navy hover:brightness-110"}`}
      >
        {nudge.action}
      </Link>
    </section>
  );
}

/** Phones (no sidebar): the same nudge as a chip beside the account button. */
export function CoreNudgeChip() {
  const slug = useMaybeAdminBusiness()?.funnel.slug;
  const nudge = nudgeFor(usePlan(slug));
  if (!nudge) return null;
  return (
    <Link
      href={START_CORE_HREF}
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
