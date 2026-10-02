"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { selectAdminBusiness, useAdminBusiness } from "@/admin/AdminBusiness";
import { businesses } from "@/admin/business";
import BrandLogo from "@/components/BrandLogo";

const links = [
  { href: "/admin", label: "Reels", icon: "M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM10 9l5 3-5 3V9z" },
  { href: "/admin/overview", label: "Overview", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/admin/links", label: "Share links", icon: "M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" },
  { href: "/admin/funnel", label: "Funnel map", icon: "M4 6h4v4H4zM16 6h4v4h-4zM10 15h4v4h-4zM8 8h8M6 10v3a2 2 0 002 2h2M18 10v3a2 2 0 01-2 2h-2" },
  { href: "/admin/campaigns", label: "Drip campaigns", icon: "M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" },
  { href: "/admin/leads", label: "Leads", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
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
      <ul
        className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] lg:flex-col lg:px-3 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="flex-shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
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
