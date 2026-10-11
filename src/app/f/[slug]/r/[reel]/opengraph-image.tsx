import { notFound } from "next/navigation";
import { publicLink, shownFunnel } from "@/lib/server/links";
import { comingSoonCard, SHARE_CARD_SIZE, shareCard, sharedReel } from "@/lib/server/share-card";

// The preview card for a link that opens on a reel: that reel's frame.

export const alt = "Watch the reel, then get tickets in one tap";
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string; reel: string }> }) {
  const { slug, reel } = await params;
  const target = await publicLink(slug);
  if (!target) notFound();
  if (target.kind === "soon") return comingSoonCard(target.name);
  const funnel = shownFunnel(target);
  return shareCard(funnel, sharedReel(funnel, reel));
}
