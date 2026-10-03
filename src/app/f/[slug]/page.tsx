import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FunnelExperience, { FunnelSplash } from "@/components/FunnelExperience";
import { site } from "@/config/site";
import { funnels, getFunnelBySlug } from "@/data/funnels";

// The shareable link: a reel funnel on its own, with no website around it.
// Only funnels listed in src/data/funnels.ts exist; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return funnels.map((funnel) => ({ slug: funnel.slug }));
}

export async function generateViewport({ params }: PageProps<"/f/[slug]">): Promise<Viewport> {
  const funnel = getFunnelBySlug((await params).slug);
  // Colors the browser bar (and in-app browsers that honor it) to match.
  return {
    themeColor: funnel?.brand.theme?.["--deep-navy"] ?? "#0E1A2B",
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
  const labeled = Boolean(funnel.sample) || site.demoMode;
  return {
    title: funnel.sample ? `${title} (Sample)` : site.demoMode ? `${title} (Concept Preview)` : title,
    description,
    // Replace the JLF site's author and keywords from the root layout.
    authors: [{ name: funnel.brand.name }],
    keywords: null,
    openGraph: { title, description, type: "website", siteName: funnel.brand.name },
    twitter: { card: "summary_large_image", title, description },
    // A sample business never appears in search results.
    robots: labeled ? { index: false, follow: false } : undefined,
  };
}

export default async function FunnelPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  if (!getFunnelBySlug(slug)) notFound();
  return (
    // useSearchParams (for ?start=) needs a Suspense boundary on a static page.
    <Suspense fallback={<FunnelSplash slug={slug} />}>
      <FunnelExperience slug={slug} />
    </Suspense>
  );
}
