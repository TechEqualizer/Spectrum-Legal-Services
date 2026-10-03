import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FunnelExperience, { FunnelSplash } from "@/components/FunnelExperience";
import { isConcept } from "@/config/site";
import { funnels, getFunnelBySlug } from "@/data/funnels";
import { getPublication } from "@/lib/server/publications";

// The shareable link: a reel funnel on its own, with no website around it.
// Only funnels listed in src/data/funnels.ts exist; any other slug is a 404
// (the check below). Pages are built ahead of time and rebuilt when the
// admin publishes; dynamicParams stays on so a page cleared by a publish can
// be rebuilt on its next visit.

export function generateStaticParams() {
  return funnels.map((funnel) => ({ slug: funnel.slug }));
}

export async function generateViewport({ params }: PageProps<"/f/[slug]">): Promise<Viewport> {
  const { slug } = await params;
  const funnel = getFunnelBySlug(slug);
  // A published look (e.g. matched to a flyer) recolors it too.
  const look = funnel ? (await getPublication(slug))?.publication?.look : undefined;
  // Colors the browser bar (and in-app browsers that honor it) to match.
  return {
    themeColor: look?.colors["--deep-navy"] ?? funnel?.brand.theme?.["--deep-navy"] ?? "#0E1A2B",
    // Edge to edge on phones with a notch or home bar; the reels pad for the safe areas.
    viewportFit: "cover",
    // The page is already dark; this stops phone browsers' forced dark mode
    // (Samsung Internet, Chrome) from recoloring the opening scene.
    colorScheme: "dark",
  };
}

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const funnel = getFunnelBySlug((await params).slug);
  if (!funnel) return {};
  const title = `${funnel.brand.seriesLabel} | ${funnel.brand.name}`;
  const description = `${funnel.cover.heading} ${funnel.cover.intro}`;
  const labeled = Boolean(funnel.sample) || isConcept(funnel);
  return {
    title: funnel.sample ? `${title} (Sample)` : isConcept(funnel) ? `${title} (Concept Preview)` : title,
    description,
    // Replace the JLF site's author and keywords from the root layout.
    authors: [{ name: funnel.brand.name }],
    keywords: null,
    openGraph: { title, description, type: "website", siteName: funnel.brand.name },
    twitter: { card: "summary_large_image", title, description },
    // A sample business never appears in search results.
    // A live client's link is indexed even while the concept site isn't.
    robots: labeled ? { index: false, follow: false } : funnel.live ? { index: true, follow: true } : undefined,
  };
}

export default async function FunnelPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  if (!getFunnelBySlug(slug)) notFound();
  // Edits published from the admin; the page is rebuilt when they change.
  const publication = (await getPublication(slug))?.publication ?? null;
  return (
    // useSearchParams (for ?start=) needs a Suspense boundary on a static page.
    <Suspense fallback={<FunnelSplash slug={slug} publication={publication} />}>
      <FunnelExperience slug={slug} publication={publication} />
    </Suspense>
  );
}
