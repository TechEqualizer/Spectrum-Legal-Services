// The shapes the admin's results screens use (Results, Share, Home and the
// reel rows). The numbers come from the database's funnel_stats, through
// /api/admin/stats (see src/admin/results.ts).

import type { Reel } from "@/data/funnel-types";

/** What visitors did over a period: views, then how each view ended. A ticket click is an event's "booking". */
export type DailyReelStats = {
  views: number;
  completed: number;
  skipped: number;
  exited: number;
  booked: number;
};

/** One reel's totals. */
export type ReelTotals = DailyReelStats & { reel: Reel };

/** Results by where the link was shared (its ?src= tag). */
export type SourceTotals = {
  /** undefined: opened without a tag (typed in, or an old link). */
  tag: string | undefined;
  visitors: number;
  calls: number;
  bookings: number;
  textLater: number;
};
