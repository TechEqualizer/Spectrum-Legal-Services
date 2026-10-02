import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FunnelExperience, { FunnelSplash } from "@/components/FunnelExperience";
import { site } from "@/config/site";
import { funnels, getFunnelBySlug } from "@/data/reels";

// The shareable link: the reel funnel on its own, with no website around it.
// Only funnels listed in src/data/reels.ts exist; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return funnels.map((funnel) => ({ slug: funnel.slug }));
}

export const viewport: Viewport = {
  // Colors the browser bar (and in-app browsers that honor it) to match.
  themeColor: "#0E1A2B",
};

const title = `Injury Insights from Attorney Jeff | ${site.name}`;
const description =
  "Hurt in an accident? Short videos from Attorney Jeff on what to do next, then call or book a free case review.";

export const metadata: Metadata = {
  title: site.demoMode ? `${title} (Concept Preview)` : title,
  description,
  openGraph: { title, description, type: "website", siteName: site.name },
  twitter: { card: "summary_large_image", title, description },
};

export default async function FunnelPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  if (!getFunnelBySlug(slug)) notFound();
  return (
    // useSearchParams (for ?start=) needs a Suspense boundary on a static page.
    <Suspense fallback={<FunnelSplash />}>
      <FunnelExperience slug={slug} />
    </Suspense>
  );
}
