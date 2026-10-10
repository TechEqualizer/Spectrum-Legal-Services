"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { eventBusiness, type AdminBusiness } from "@/admin/business";
import Tour from "@/admin/components/Tour";
import PasswordSheet from "@/admin/components/PasswordSheet";
import { useAdminSession } from "@/admin/session";
import type { Funnel } from "@/data/funnel-types";

// Which event the admin shows. Remembered in this browser only, as a
// convenience; it falls back to the first event.
const KEY = "admin_business";
const listeners = new Set<() => void>();
let memory: string | null = null;

function read() {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * An organizer's event, loaded on the server (see src/app/admin/(app)/layout.tsx):
 * the funnel as built (what the editor starts from) and as visitors see it now.
 */
export type AdminEvent = { funnel: Funnel; live: Funnel; organizer: { slug: string; name: string } };

const EventsContext = createContext<AdminEvent[]>([]);

export function AdminBusinessesProvider({ events, children }: { events: AdminEvent[]; children: React.ReactNode }) {
  return <EventsContext.Provider value={events}>{children}</EventsContext.Provider>;
}

/** The organizers' events this admin may edit, for the Events page. */
export function useAdminEvents(): AdminEvent[] {
  return useContext(EventsContext);
}

/** The events this admin may edit (checked on the server), as admin businesses. */
export function useAdminBusinesses(): AdminBusiness[] {
  const adminEvents = useContext(EventsContext);
  return useMemo(() => adminEvents.map((e) => eventBusiness(e.funnel)), [adminEvents]);
}

/** The event being edited, or null when this admin has no events yet. */
export function useMaybeAdminBusiness(): AdminBusiness | null {
  const allowed = useAdminBusinesses();
  const slug = useSyncExternalStore(subscribe, read, () => null);
  return allowed.find((b) => b.funnel.slug === slug) ?? allowed[0] ?? null;
}

/**
 * The event being edited. Only for screens about one event (Reels, Leads,
 * Results, Share): AdminFrame shows "No events yet" instead of them when
 * there is none.
 */
export function useAdminBusiness(): AdminBusiness {
  const business = useMaybeAdminBusiness();
  if (!business) throw new Error("useAdminBusiness: no event to show (AdminFrame should have shown No events yet)");
  return business;
}

const noSubscribe = () => () => {};

export function selectAdminBusiness(slug: string) {
  memory = slug;
  try {
    localStorage.setItem(KEY, slug);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  listeners.forEach((notify) => notify());
}

// Screens that work without an event: everything else is about one event.
const WITHOUT_EVENT = ["/admin/home", "/admin/events", "/admin/settings"];

/**
 * Applies the selected event's colors to the admin, and remounts the page
 * when the event changes so every editor starts from that event. An admin
 * with no events yet sees "No events yet" on the screens about one event.
 */
export function AdminFrame({
  nav,
  children,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  const business = useMaybeAdminBusiness();
  const session = useAdminSession();
  const pathname = usePathname();
  // The page itself renders in the browser only: which event it shows is
  // remembered there, and its dates and times are in the admin's own time
  // zone, so a server render would show the wrong ones for a moment.
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  // The Reels page is a full-width studio on wide screens.
  const studio = pathname === "/admin" && Boolean(business);
  const needsEvent = !WITHOUT_EVENT.some((p) => pathname.startsWith(p));
  return (
    <div
      className="min-h-screen bg-soft-gray text-charcoal lg:flex"
      style={business?.funnel.brand.theme as React.CSSProperties | undefined}
    >
      {nav}
      {/* Clip sideways: one long word or link must never slide the whole admin on a phone. */}
      <div className="min-w-0 flex-1 overflow-x-clip">
        <main
          key={business?.funnel.id ?? "none"}
          id="main-content"
          className={`mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-8 md:pt-8 lg:pb-8 ${studio ? "xl:max-w-none xl:px-6 xl:pb-0 xl:pt-4" : ""}`}
        >
          {!inBrowser ? <div className="min-h-[60vh]" aria-busy="true" /> : !business && needsEvent ? <NoEvents /> : children}
        </main>
        {session.mustChangePassword && <PasswordSheet firstTime />}
        {inBrowser && <Tour canStart={Boolean(business) && !session.mustChangePassword} />}
      </div>
    </div>
  );
}

/** For an admin with no events yet, on a screen about one event. */
function NoEvents() {
  const fullAccess = useAdminSession().slugs.includes("*");
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white px-5 py-8 text-center" aria-labelledby="no-events-title">
      <h1 id="no-events-title" className="text-lg font-bold text-deep-navy">No events yet</h1>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
        {fullAccess
          ? "Add a client and their first event. Its reels, leads and results show up here."
          : "Once your first event is set up, its reels, leads and results show up here. Send Showlnk your flyer and we'll set it up with you."}
      </p>
      <Link href="/admin/events" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
        Go to Events
      </Link>
    </section>
  );
}
