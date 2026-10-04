"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { selectAdminBusiness, useAdminBusiness, useAdminBusinesses } from "@/admin/AdminBusiness";
import PasswordSheet from "@/admin/components/PasswordSheet";
import { useAdminSession } from "@/admin/session";
import Avatar from "@/admin/components/ui/Avatar";
import { closeMenu, useDismiss } from "@/admin/components/ui/use-dismiss";
import BrandLogo from "@/components/BrandLogo";

// Five places at most, most used first, in a business owner's words
// (see .claude/skills/simple-navigation).
const links = [
  { href: "/admin/home", label: "Home", icon: "M3 11l9-8 9 8M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5" },
  { href: "/admin/events", label: "Events", icon: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 13h3v3H8z" },
  { href: "/admin", label: "Reels", icon: "M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM10 9l5 3-5 3V9z" },
  { href: "/admin/leads", label: "Leads", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/admin/overview", label: "Results", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/admin/links", label: "Share", icon: "M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" },
];

// Desktop only: the sidebar can fold down to its icons, for more room (the
// studio's three columns). Remembered in this browser.
const COLLAPSED_KEY = "admin_nav_collapsed";
const collapseListeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};
const setCollapsed = (on: boolean) => {
  try {
    if (on) localStorage.setItem(COLLAPSED_KEY, "1");
    else localStorage.removeItem(COLLAPSED_KEY);
  } catch {}
  collapseListeners.forEach((l) => l());
};
const useCollapsed = () =>
  useSyncExternalStore(
    (onChange) => {
      collapseListeners.add(onChange);
      return () => collapseListeners.delete(onChange);
    },
    readCollapsed,
    () => false
  );

export default function AdminNav() {
  const pathname = usePathname();
  const { funnel } = useAdminBusiness();
  const businesses = useAdminBusinesses();
  const collapsed = useCollapsed();
  // Styles that only apply to the folded sidebar (phones never fold).
  const folded = (on: string, off = "") => (collapsed ? on : off);
  return (
    <nav
      className={`bg-deep-navy text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-shrink-0 lg:flex-col lg:transition-[width] lg:duration-200 motion-reduce:transition-none ${folded("lg:w-[4.5rem]", "lg:w-60")}`}
      aria-label="Admin"
    >
      <div className={`flex items-center justify-between gap-4 px-4 py-3 lg:block lg:py-6 ${folded("lg:px-3", "lg:px-5")}`}>
        <Link
          href={funnel.sample ? `/f/${funnel.slug}` : "/"}
          aria-label={funnel.sample ? "Open the funnel link" : "Back to the site"}
          className={`inline-flex ${folded("lg:hidden")}`}
        >
          <BrandLogo brand={funnel.brand} size="sm" />
        </Link>
        {collapsed && (
          <span
            title={funnel.brand.name}
            aria-hidden="true"
            className="relative hidden h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-lg font-bold text-white lg:flex"
          >
            {funnel.brand.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- the organizer's own photo
              <img src={funnel.brand.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              funnel.brand.name[0]
            )}
          </span>
        )}
        <div className={`lg:mt-5 ${folded("lg:hidden")}`}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-accent">
            Admin
          </p>
          {businesses.length > 1 && (<>
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
          </>)}
          {businesses.length <= 1 && <p className="mt-1 text-sm font-semibold">{funnel.brand.name}</p>}
        </div>
        <Account collapsed={collapsed} />
      </div>
      {/* Phones: a bottom tab bar, every place visible and in thumb reach. Desktop: the sidebar. */}
      <ul
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-white/10 bg-deep-navy pb-[env(safe-area-inset-bottom)] lg:static lg:flex lg:flex-col lg:gap-1 lg:border-0 lg:px-3 lg:pb-0"
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
                title={collapsed ? link.label : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors lg:min-h-11 lg:flex-row lg:gap-3 lg:rounded-md lg:px-3 lg:text-sm ${folded("lg:justify-center", "lg:justify-start")} ${
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
                <span className={folded("lg:sr-only")}>{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden space-y-1 px-3 pb-5 lg:mt-auto lg:block">
        <Link
          href="/admin/settings"
          aria-current={pathname.startsWith("/admin/settings") ? "page" : undefined}
          title={collapsed ? "Settings" : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${folded("justify-center")} ${
            pathname.startsWith("/admin/settings") ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d={SETTINGS_ICON} />
          </svg>
          <span className={folded("sr-only")}>Settings</span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white ${folded("justify-center")}`}
        >
          <svg className={`h-5 w-5 flex-shrink-0 transition-transform motion-reduce:transition-none ${folded("rotate-180")}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h16v16H4zM9 4v16M16 10l-2 2 2 2" />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </nav>
  );
}

// A gear: Settings.
const SETTINGS_ICON =
  "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z";

/** Who's signed in (their photo and name), with Settings, Change password and Sign out. */
function Account({ collapsed = false }: { collapsed?: boolean }) {
  const { email, name, avatarUrl } = useAdminSession();
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const menu = useDismiss();
  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  };
  return (
    <>
      <details ref={menu} className="group relative lg:mt-4">
        <summary
          aria-label={`Account: ${name ?? email}`}
          className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full bg-white/10 text-sm font-bold uppercase text-white hover:bg-white/20 lg:h-auto lg:gap-2 lg:rounded-md lg:bg-transparent lg:px-0 lg:text-xs lg:font-semibold lg:normal-case lg:text-gray-300 ${collapsed ? "lg:min-h-11 lg:w-11 lg:justify-center" : "lg:w-full lg:justify-start"}`}
        >
          <Avatar name={name} email={email} url={avatarUrl} className="h-11 w-11 text-sm lg:h-7 lg:w-7 lg:text-xs" />
          <span className={`hidden truncate ${collapsed ? "" : "lg:inline"}`}>{name ?? email}</span>
        </summary>
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl bg-white p-1.5 text-charcoal shadow-xl ring-1 ring-black/10 lg:left-0 lg:right-auto">
          <p className="truncate px-3 pt-2 text-sm font-semibold text-deep-navy">{name ?? email}</p>
          {name && <p className="truncate px-3 text-xs text-gray-600">{email}</p>}
          <div className="h-2" />
          <Link
            href="/admin/settings"
            onClick={(e) => closeMenu(e.currentTarget)}
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-deep-navy hover:bg-soft-gray">
            Settings
          </Link>
          <button
            type="button"
            onClick={(e) => {
              closeMenu(e.currentTarget);
              setChanging(true);
            }}
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-deep-navy hover:bg-soft-gray"
          >
            Change password
          </button>
          <button type="button" onClick={signOut} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-red-700 hover:bg-soft-gray">
            Sign out
          </button>
        </div>
      </details>
      {/* Outside the menu, so it stays up once the menu closes. */}
      {changing && <PasswordSheet onClose={() => setChanging(false)} />}
    </>
  );
}
