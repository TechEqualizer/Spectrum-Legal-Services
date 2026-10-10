// The plans (docs/plans/03-billing.md): Free, and Core per organizer.
// Shared by the server's gates and the admin's Plan card.

export const CORE_PRICE = { month: 29, year: 290 } as const;
/** Fans an organizer can gain on Free; the list past it waits for Core. */
export const FREE_FAN_LIMIT = 100;
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

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const daysLeft = (iso: string, now: number) => Math.max(0, Math.ceil((Date.parse(iso) - now) / DAY));

/** The plan in words, for the Plan card: a title and one line under it. */
export function planSummary(plan: Plan, now = Date.now()): { title: string; detail: string } {
  const core = hasCore(plan, now);
  switch (plan.status) {
    case "comped":
      return core
        ? { title: "Core, on Showlnk", detail: plan.compedUntil ? `Free until ${day(plan.compedUntil)}.` : "Every Core feature, free." }
        : { title: "Free", detail: `Your free Core ended ${day(plan.compedUntil!)}.` };
    case "trialing": {
      if (!core) return { title: "Free", detail: "Your Core trial ended." };
      const n = daysLeft(plan.trialEndsAt!, now);
      return { title: "Core trial", detail: `${n === 1 ? "1 day" : `${n} days`} left, until ${day(plan.trialEndsAt!)}.` };
    }
    case "active":
      return { title: "Core", detail: plan.periodEnd ? `Renews ${day(plan.periodEnd)}.` : "Active." };
    case "past_due":
      return core
        ? { title: "Core", detail: `Your card was declined. Update it by ${day(new Date(Date.parse(plan.periodEnd!) + GRACE_DAYS * DAY).toISOString())} to keep Core.` }
        : { title: "Free", detail: "Core ended after the card was declined." };
    case "canceled":
      return { title: "Free", detail: "Core was canceled." };
    default:
      return { title: "Free", detail: `Follow for up to ${FREE_FAN_LIMIT} fans.` };
  }
}
