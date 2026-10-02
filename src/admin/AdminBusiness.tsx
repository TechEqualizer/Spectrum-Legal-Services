"use client";

import { useSyncExternalStore } from "react";
import { businesses, type AdminBusiness } from "@/admin/business";

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

const firstSlug = businesses[0].funnel.slug;

export function useAdminBusiness(): AdminBusiness {
  const slug = useSyncExternalStore(subscribe, read, () => firstSlug) ?? firstSlug;
  return businesses.find((b) => b.funnel.slug === slug) ?? businesses[0];
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
  return (
    <div
      className="min-h-screen bg-soft-gray text-charcoal lg:flex"
      style={funnel.brand.theme as React.CSSProperties}
    >
      {nav}
      <div className="min-w-0 flex-1">
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 md:px-8 md:text-left">
          <strong>Preview with sample data.</strong> Nothing here is real visitor
          or client data, and changes aren&apos;t saved. Real data appears once
          the admin has a login.
          {funnel.sample && (
            <> <strong>{funnel.brand.name} is a sample business.</strong></>
          )}
        </p>
        <main
          key={funnel.id}
          id="main-content"
          className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
