import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FunnelExperience, { FunnelSplash } from "@/components/FunnelExperience";
import { FollowProvider, type FollowTarget } from "@/components/follow/follow";
import OrganizerEvents from "@/components/OrganizerEvents";
import { isConcept } from "@/config/site";
import { funnels } from "@/data/funnels";
import { hasCore } from "@/lib/plans";
import { followOn } from "@/lib/server/fans";
import { planOf } from "@/lib/server/plans";
import { getOrganizer, organizerOf, type Organizer } from "@/lib/server/funnels";
import { resolveLink, shownFunnel } from "@/lib/server/links";
import { shareMetadata } from "@/lib/server/share-card";

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
    target && shownFunnel(target);
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
  const funnel = target.live;
  // The date, where tickets stand and what it is, under the card (see share-card.tsx).
  const shared = shareMetadata(funnel);
  const title = String(shared.title);
  const labeled = Boolean(funnel.sample) || isConcept(funnel);
  return {
    ...shared,
    title: funnel.sample ? `${title} (Sample)` : isConcept(funnel) ? `${title} (Preview)` : title,
    // The funnel's own business is the author, not Showlnk.
    authors: [{ name: funnel.brand.name }],
    keywords: null,
    // A sample business never appears in search results.
    // A live client's link is indexed even while the concept site isn't.
    robots: labeled ? { index: false, follow: false } : funnel.live ? { index: true, follow: true } : undefined,
  };
}

export default async function FunnelPage({ params }: PageProps<"/f/[slug]">) {
  const target = await resolveLink((await params).slug);
  if (!target) notFound();
  if (target.kind === "choose") {
    const { organizer } = target;
    return (
      <FollowProvider value={await followTarget(organizer)}>
        <OrganizerEvents organizer={target.organizer} events={target.events} />
      </FollowProvider>
    );
  }
  // The player applies the published edits itself (the admin's preview
  // re-applies them as they're typed); the page is rebuilt when they change.
  const { base, publication, nextNight } = target;
  // Follow, where the event's organizer has it on (and Core's parts of it with Core).
  const organizerSlug = await organizerOf(base.slug);
  const organizer = organizerSlug ? await getOrganizer(organizerSlug) : undefined;
  const follow = organizer && (await followTarget(organizer, base.id));
  return (
    <FollowProvider value={follow}>
      {/* useSearchParams (for ?start=) needs a Suspense boundary on a static page. */}
      <Suspense fallback={<FunnelSplash funnel={base} publication={publication} />}>
        <FunnelExperience funnel={base} publication={publication} nextNight={nextNight} />
      </Suspense>
    </FollowProvider>
  );
}

/**
 * Who visitors can follow on this page, if Follow is on for the organizer,
 * and whether Core's parts of it (presales, fans-only reels) work here. If
 * the plan can't be read, they keep working: nothing fans have breaks.
 */
async function followTarget(organizer: Organizer, funnelId?: string): Promise<FollowTarget | undefined> {
  const plan = await planOf(organizer.slug);
  if (!(await followOn(organizer.slug, plan))) return undefined;
  return { organizer: organizer.slug, name: organizer.name, ...(funnelId ? { funnelId } : {}), core: !plan || hasCore(plan) };
}
