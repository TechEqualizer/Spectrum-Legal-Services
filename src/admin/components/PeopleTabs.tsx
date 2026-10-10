"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Leads and Fans, side by side under Leads: a two-way switch at the top of both pages. */
export default function PeopleTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/leads", label: "Leads" },
    { href: "/admin/leads/fans", label: "Fans" },
  ];
  return (
    <nav aria-label="Leads and fans" data-tour="people-tabs" className="inline-grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1">
      {tabs.map((t) => {
        const current = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition ${
              current ? "bg-white text-deep-navy shadow-sm" : "text-gray-600 hover:text-deep-navy"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
