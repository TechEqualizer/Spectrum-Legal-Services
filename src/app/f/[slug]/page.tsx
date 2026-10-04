import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FunnelExperience, { FunnelSplash } from "@/components/FunnelExperience";
import OrganizerEvents from "@/components/OrganizerEvents";
import { isConcept } from "@/config/site";
import { funnels } from "@/data/funnels";
import { applyPublication } from "@/lib/publication";
import { resolveLink } from "@/lib/server/links";

// The shareable link: a reel funnel on its own, with no website around it.
// A slug is a built-in demo (src/data/funnels.ts), an organizer's event, or
// an organizer's permanent link, which shows their next event (see
// resolveLink); anything else is a 404. Demo pages are built ahead of time,
// the rest on their first visit; all are rebuilt when the admin publishes,
// and dynamicParams stays on for exactly that.

export function generateStaticParams() {
  return funnels.map((funnel) => ({ slug: funnel.slug }));
}

export async function generateViewport({ params }: PageProps<"/f/[slug]">): Promise<Viewport> {
  const target = await resolveLink((await params).slug);
  // A published look (e.g. matched to a flyer) recolors it too.
  const shown =
    target?.kind === "event" ? applyPublication(target.funnel, target.publication) : target?.events[0]?.funnel;
  // Colors the browser bar (and in-app browsers that honor it) to match.
  return {
    themeColor: shown?.brand.theme?.["--deep-navy"] ?? "#0E1A2B",
    // Edge to edge on phones with a notch or home bar; the reels pad for the safe areas.
    viewportFit: "cover",
    // The page is already dark; this stops phone browsers' forced dark mode
    // (Samsung Internet, Chrome) from recoloring the opening scene.
    colorScheme: "dark",
  };
}

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const target = await resolveLink((await params).slug);
  if (!target) return {};
  if (target.kind === "choose") {
    const title = `${target.organizer.name}: upcoming events`;
    const description = target.events.map((e) => e.funnel.brand.seriesLabel).join(" · ");
    return {
      title,
      description,
      authors: [{ name: target.organizer.name }],
      keywords: null,
      openGraph: { title, description, type: "website", siteName: target.organizer.name },
      twitter: { card: "summary_large_image", title, description },
      robots: { index: true, follow: true },
    };
  }
  const funnel = target.funnel;
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
  const target = await resolveLink((await params).slug);
  if (!target) notFound();
  if (target.kind === "choose") return <OrganizerEvents organizer={target.organizer} events={target.events} />;
  // Edits published from the admin are applied on top; the page is rebuilt when they change.
  const { funnel, publication } = target;
  return (
    // useSearchParams (for ?start=) needs a Suspense boundary on a static page.
    <Suspense fallback={<FunnelSplash funnel={funnel} publication={publication} />}>
      <FunnelExperience funnel={funnel} publication={publication} />
    </Suspense>
  );
}
