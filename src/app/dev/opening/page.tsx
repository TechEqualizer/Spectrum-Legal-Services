import { notFound } from "next/navigation";
import OpeningReview from "./OpeningReview";

// A development tool, never served in production: plays any flyer and opening
// recipe with the real player, for scripts/review-opening.mjs to record and
// review (see .claude/skills/opening-scene).
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OpeningReview />;
}
