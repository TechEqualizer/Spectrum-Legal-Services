// The plans (docs/plans/03-billing.md): Core per organizer, which puts their
// links live ("Pay to go live"); without it they show Coming soon. Shared by
// the server's gates and the admin's Plan card.

export const CORE_PRICE = { month: 29, year: 290 } as const;
/** The fans add-on, on top of Core (same cadence as the organizer's Core). */
export const FANS_PRICE = { month: 15, year: 150 } as const;
export const TRIAL_DAYS = 14;
/** Days Core stays on while Stripe retries a declined card. */
export const GRACE_DAYS = 7;

export type PlanStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "comped";

export type Plan = {
  status: PlanStatus;
  interval?: "month" | "year";
  trialEndsAt?: string;
  periodEnd?: string;
  compedUntil?: string;
  /** The fans add-on is on the subscription. */
  fans?: boolean;
};

export const FREE: Plan = { status: "free" };

const DAY = 864e5;
const before = (iso: string | undefined, now: number, slack = 0) => Boolean(iso) && now < Date.parse(iso!) + slack;

/** Whether the organizer has Core's features right now. */
export function hasCore(plan: Plan, now = Date.now()): boolean {
  switch (plan.status) {
    case "comped":
      return !plan.compedUntil || before(plan.compedUntil, now);
    case "active":
      return true;
    case "trialing":
      return before(plan.trialEndsAt, now);
    case "past_due":
      return before(plan.periodEnd, now, GRACE_DAYS * DAY);
    default:
      return false;
  }
}

/**
 * Whether the organizer has the fans add-on's features right now: Follow,
 * presales for followers, fans-only reels and the fan calendar. It needs
 * Core; comped organizers (and trials from before "Pay to go live") have it.
 */
export function hasFans(plan: Plan, now = Date.now()): boolean {
  return hasCore(plan, now) && (plan.status === "comped" || plan.status === "trialing" || Boolean(plan.fans));
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const daysLeft = (iso: string, now: number) => Math.max(0, Math.ceil((Date.parse(iso) - now) / DAY));

/** The plan in words, for the Plan card: a title and one line under it. */
export function planSummary(plan: Plan, now = Date.now()): { title: string; detail: string } {
  const core = hasCore(plan, now);
  switch (plan.status) {
    case "comped":
      return core
        ? { title: "Core, on Showlnk", detail: plan.compedUntil ? `Free until ${day(plan.compedUntil)}.` : "Every Core feature, free." }
        : { title: "Not live", detail: `Your free Core ended ${day(plan.compedUntil!)}. Fans see Coming soon.` };
    case "trialing": {
      if (!core) return { title: "Not live", detail: "Your Core trial ended. Fans see Coming soon." };
      // Paid during the trial before checkout charged at once: the first charge waits for the trial's end.
      if (plan.interval) return { title: "Core", detail: `Your first charge is ${day(plan.trialEndsAt!)}.` };
      const n = daysLeft(plan.trialEndsAt!, now);
      return { title: "Core trial", detail: `${n === 1 ? "1 day" : `${n} days`} left, until ${day(plan.trialEndsAt!)}.` };
    }
    case "active":
      return { title: "Core", detail: plan.periodEnd ? `Renews ${day(plan.periodEnd)}.` : "Active." };
    case "past_due":
      return core
        ? { title: "Core", detail: `Your card was declined. Update it by ${day(new Date(Date.parse(plan.periodEnd!) + GRACE_DAYS * DAY).toISOString())} to keep Core.` }
        : { title: "Not live", detail: "Core ended after the card was declined. Fans see Coming soon." };
    case "canceled":
      return { title: "Not live", detail: "Core was canceled. Fans see Coming soon." };
    default:
      return { title: "Not live yet", detail: "Fans see Coming soon until you go live." };
  }
}
