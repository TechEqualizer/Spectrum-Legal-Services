import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import PrivateLinkBar from "@/admin/components/PrivateLinkBar";
import FunnelExperience, { FunnelSplash } from "@/components/FunnelExperience";
import OrganizerEvents from "@/components/OrganizerEvents";
import { canPublish, getAdmin, managesOrganizer } from "@/lib/server/admin-auth";
import { linkIsLive } from "@/lib/server/plans";
import { organizerOfLink, resolveLink } from "@/lib/server/links";

// The organizer's own link while it isn't live (docs/plans/03-billing.md,
// "Pay to go live"): the public sees Coming soon at /f/<slug>; its admins
// see the real thing here, as visitors will, with Go live over it. Once
// live, this sends them to the public link.
export default async function PrivateLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await getAdmin();
  if (!admin) redirect(`/admin/login?next=${encodeURIComponent(`/admin/link/${slug}`)}`);
  const target = await resolveLink(slug);
  if (!target) notFound();
  const organizer = organizerOfLink(target);
  const allowed = target.kind === "choose" ? managesOrganizer(admin, target.organizer.slug) : canPublish(admin, target.base.slug, organizer);
  if (!allowed) notFound();
  if (await linkIsLive(organizer)) redirect(`/f/${slug}`);
  return (
    <>
      <PrivateLinkBar />
      {target.kind === "choose" ? (
        <OrganizerEvents organizer={target.organizer} events={target.events} />
      ) : (
        <Suspense fallback={<FunnelSplash funnel={target.base} publication={target.publication} />}>
          <FunnelExperience funnel={target.base} publication={target.publication} nextNight={target.nextNight} />
        </Suspense>
      )}
    </>
  );
}

export const metadata = { title: "Your link (private) · Showlnk", robots: { index: false, follow: false } };
