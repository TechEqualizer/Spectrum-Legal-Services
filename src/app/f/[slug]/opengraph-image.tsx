import { notFound } from "next/navigation";
import { funnels } from "@/data/funnels";
import { applyPublication } from "@/lib/publication";
import { resolveLink } from "@/lib/server/links";
import { SHARE_CARD_SIZE, shareCard } from "@/lib/server/share-card";

// The preview card people see when a funnel link is pasted into a text, DM
// or post (see share-card.tsx). One per funnel: built-in ones at build time,
// organizers' events (from the database) on first request, rebuilt when the
// admin publishes and hourly, so "Few tickets left" and a passed date show.

export const alt = "Watch the reels, then get tickets in one tap";
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export function generateStaticParams() {
  return funnels.map((funnel) => ({ slug: funnel.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const target = await resolveLink((await params).slug);
  if (!target) notFound();
  // An organizer's permanent link previews the night it shows (or the soonest one).
  const funnel = target.kind === "event" ? applyPublication(target.funnel, target.publication) : target.events[0].funnel;
  return shareCard(funnel);
}
