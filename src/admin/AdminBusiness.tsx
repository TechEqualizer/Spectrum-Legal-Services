"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { businesses, type AdminBusiness } from "@/admin/business";
import PasswordSheet from "@/admin/components/PasswordSheet";
import { mayEdit, useAdminSession } from "@/admin/session";

// Which business the admin preview shows. Remembered in this browser only,
// as a convenience; it falls back to the first business.
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

/** The businesses this admin may edit. */
export function useAdminBusinesses(): AdminBusiness[] {
  const session = useAdminSession();
  return businesses.filter((b) => mayEdit(session, b.funnel.slug));
}

export function useAdminBusiness(): AdminBusiness {
  const allowed = useAdminBusinesses();
  const slug = useSyncExternalStore(subscribe, read, () => null);
  return allowed.find((b) => b.funnel.slug === slug) ?? allowed[0] ?? businesses[0];
}

export function selectAdminBusiness(slug: string) {
  memory = slug;
  try {
    localStorage.setItem(KEY, slug);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  listeners.forEach((notify) => notify());
}

/**
 * Applies the selected business's colors to the admin, and remounts the page
 * when the business changes so every editor starts from that business.
 */
export function AdminFrame({
  nav,
  children,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  const business = useAdminBusiness();
  const { funnel } = business;
  const session = useAdminSession();
  // The Reels page is a full-width studio on wide screens.
  const studio = usePathname() === "/admin";
  return (
    <div
      className="min-h-screen bg-soft-gray text-charcoal lg:flex"
      style={funnel.brand.theme as React.CSSProperties}
    >
      {nav}
      <div className="min-w-0 flex-1">
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 md:px-8 md:text-left">
          <strong>Results and leads are sample data.</strong> Reel edits save as
          you go; Publish puts them on your live link.
          {funnel.sample && <> {funnel.brand.name} is a sample business.</>}
        </p>
        <main
          key={funnel.id}
          id="main-content"
          className={`mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-8 md:pt-8 lg:pb-8 ${studio ? "xl:max-w-none xl:px-6 xl:pb-0 xl:pt-4" : ""}`}
        >
          {children}
        </main>
        {session.mustChangePassword && <PasswordSheet firstTime />}
      </div>
    </div>
  );
}
