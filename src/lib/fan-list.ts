// What an organizer's admins see of their fan list on their plan
// (docs/plans/03-billing.md): on Free, the first FREE_FAN_LIMIT people
// following, by when they confirmed, and everyone who has left; anyone past
// the limit is still a follower, waiting until Core. With Core (or when the
// plan couldn't be read), everyone.

import { FREE_FAN_LIMIT, hasCore, type Plan } from "@/lib/plans";

type Follow = { confirmed_at: string; unfollowed_at: string | null };

export function fansOnPlan<F extends Follow>(fans: F[], plan: Plan | undefined, now = Date.now()): { fans: F[]; waiting: number } {
  if (!plan || hasCore(plan, now)) return { fans, waiting: 0 };
  const following = fans.filter((f) => !f.unfollowed_at).sort((a, b) => a.confirmed_at.localeCompare(b.confirmed_at));
  const hidden = new Set(following.slice(FREE_FAN_LIMIT));
  return { fans: fans.filter((f) => !hidden.has(f)), waiting: hidden.size };
}
