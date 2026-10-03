"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { selectAdminBusiness, useAdminBusiness } from "@/admin/AdminBusiness";
import { businesses } from "@/admin/business";
import BrandLogo from "@/components/BrandLogo";

// Five places at most, most used first, in a business owner's words
// (see .claude/skills/simple-navigation).
const links = [
  { href: "/admin", label: "Reels", icon: "M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM10 9l5 3-5 3V9z" },
  { href: "/admin/leads", label: "Leads", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/admin/overview", label: "Results", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/admin/links", label: "Share", icon: "M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" },
  { href: "/admin/funnel", label: "Paths", icon: "M4 6h4v4H4zM16 6h4v4h-4zM10 15h4v4h-4zM8 8h8M6 10v3a2 2 0 002 2h2M18 10v3a2 2 0 01-2 2h-2" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { funnel } = useAdminBusiness();
  return (
    <nav
      className="bg-deep-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:flex-shrink-0"
      aria-label="Admin"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:block lg:px-5 lg:py-6">
        <Link
          href={funnel.sample ? `/f/${funnel.slug}` : "/"}
          aria-label={funnel.sample ? "Open the funnel link" : "Back to the site"}
          className="inline-flex"
        >
          <BrandLogo brand={funnel.brand} size="sm" />
        </Link>
        <div className="lg:mt-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-accent">
            Reel funnel admin
          </p>
          <label htmlFor="admin-business" className="sr-only">Business</label>
          <select
            id="admin-business"
            value={funnel.slug}
            onChange={(e) => selectAdminBusiness(e.target.value)}
            className="mt-1 w-full max-w-48 rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-accent lg:max-w-none [&>option]:text-charcoal"
          >
            {businesses.map((b) => (
              <option key={b.funnel.slug} value={b.funnel.slug}>
                {b.funnel.brand.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Phones: a bottom tab bar, every place visible and in thumb reach. Desktop: the sidebar. */}
      <ul
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-deep-navy pb-[env(safe-area-inset-bottom)] lg:static lg:flex lg:flex-col lg:gap-1 lg:border-0 lg:px-3 lg:pb-0"
        role="list"
      >
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-md lg:px-3 lg:text-sm ${
                  active
                    ? "text-white lg:bg-white/10"
                    : "text-gray-400 hover:text-white lg:hover:bg-white/5"
                }`}
              >
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d={link.icon} />
                </svg>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
