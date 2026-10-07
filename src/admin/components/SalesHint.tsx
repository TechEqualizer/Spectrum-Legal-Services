"use client";

import Link from "next/link";
import { useAdminEvents, useMaybeAdminBusiness } from "@/admin/AdminBusiness";
import { runsOrganizer, useAdminSession } from "@/admin/session";

/**
 * "Connect Eventbrite to see tickets sold": a quiet link to Settings on the
 * results screens, for an Eventbrite event whose organizer hasn't connected
 * yet, shown only to admins who can connect it.
 */
export default function SalesHint({ className = "" }: { className?: string }) {
  const session = useAdminSession();
  const business = useMaybeAdminBusiness();
  const event = useAdminEvents().find((e) => e.funnel.slug === business?.funnel.slug);
  if (!event || event.live.ticketing?.provider !== "eventbrite" || !runsOrganizer(session, event.organizer.slug)) return null;
  return (
    <p className={`text-sm text-gray-600 ${className}`}>
      <Link href="/admin/settings#eventbrite" className="inline-flex min-h-11 items-center font-semibold text-deep-navy underline underline-offset-2 hover:text-royal-blue">
        Connect Eventbrite to see tickets sold
      </Link>
    </p>
  );
}
