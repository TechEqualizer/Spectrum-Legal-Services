import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FunnelSplash } from "@/components/FunnelExperience";
import ComingSoon from "@/components/showlnk/ComingSoon";
import { publicLink, shownFunnel } from "@/lib/server/links";
import { shareMetadata, sharedReel } from "@/lib/server/share-card";

// A link that opens on a reel (/f/<slug>?start=<reel>), as link previews see
// it: src/proxy.ts sends their crawlers here, so the card shows that reel.
// Visitors never come here (their address stays the link's own), so the
// page is only the opening screen, for anything that looks past the card.

type Props = { params: Promise<{ slug: string; reel: string }> };

async function funnelOf(slug: string) {
  const target = await publicLink(slug);
  if (!target) return null;
  if (target.kind === "soon") return { kind: "soon" as const, name: target.name };
  const funnel = shownFunnel(target);
  return { kind: "link" as const, funnel, ...(target.kind === "event" ? { base: target.base, publication: target.publication } : { base: funnel, publication: null }) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, reel } = await params;
  const found = await funnelOf(slug);
  if (!found) return {};
  if (found.kind === "soon") return { title: `${found.name} · Coming soon`, robots: { index: false, follow: false } };
  return { ...shareMetadata(found.funnel, sharedReel(found.funnel, reel)), robots: { index: false, follow: false } };
}

export default async function ReelLinkPage({ params }: Props) {
  const { slug } = await params;
  const found = await funnelOf(slug);
  if (!found) notFound();
  if (found.kind === "soon") return <ComingSoon name={found.name} slug={slug} />;
  return <FunnelSplash funnel={found.base} publication={found.publication} />;
}
