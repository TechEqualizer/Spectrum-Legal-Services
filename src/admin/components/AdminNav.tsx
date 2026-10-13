"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { selectAdminBusiness, useAdminBusinesses, useAdminEvents, useMaybeAdminBusiness } from "@/admin/AdminBusiness";
import CoreNudge, { CoreNudgeChip } from "@/admin/components/CoreNudge";
import PlusMenu, { CreateGroup } from "@/admin/components/PlusMenu";
import PasswordSheet from "@/admin/components/PasswordSheet";
import { useAdminSession } from "@/admin/session";
import { startTour } from "@/admin/tour";
import Avatar from "@/admin/components/ui/Avatar";
import { closeMenu, useDismiss } from "@/admin/components/ui/use-dismiss";
import type { Funnel } from "@/data/funnel-types";

// Four places, in an organizer's words (docs/plans/10-mobile-shell.md; see
// .claude/skills/simple-navigation): how the next night is doing, what fans
// see, who's coming back, what's selling. What they do (post, copy their
// link, add a video, a new night) is the + beside them. Each place also
// holds the pages under it.
const links = [
  { href: "/admin/home", label: "Tonight", tour: "nav-home", also: ["/admin/events"], icon: "M20.5 14.5A8.5 8.5 0 019.5 3.5a8.5 8.5 0 1011 11z" },
  { href: "/admin", label: "Link", tour: "nav-reels", also: [], icon: "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zM10.5 9.5l4 2.5-4 2.5v-5z" },
  { href: "/admin/leads", label: "People", tour: "nav-leads", also: [], icon: "M16 20v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V20M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM22 20v-1.5a4 4 0 00-3-3.85M16 4.15a3.5 3.5 0 010 6.7" },
  { href: "/admin/overview", label: "Results", tour: "nav-results", also: ["/admin/links"], icon: "M4 20V11M10 20V5M16 20v-8M22 20H2" },
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
  // Null for an admin with no events yet: the Showlnk brand stands in.
  const funnel = useMaybeAdminBusiness()?.funnel ?? null;
  const businesses = useAdminBusinesses();
  const events = useAdminEvents();
  // The dropdown's groups: each client (organizer) with their events.
  const groups: { label: string; items: typeof businesses }[] = [];
  for (const b of businesses) {
    const label = events.find((e) => e.funnel.slug === b.funnel.slug)?.organizer.name ?? b.funnel.brand.name;
    const group = groups.find((g) => g.label === label) ?? groups[groups.push({ label, items: [] }) - 1];
    group.items.push(b);
  }
  const organizerName = funnel ? events.find((e) => e.funnel.slug === funnel.slug)?.organizer.name ?? funnel.brand.name : undefined;
  const collapsed = useCollapsed();
  // Styles that only apply to the folded sidebar (phones never fold).
  const folded = (on: string, off = "") => (collapsed ? on : off);
  const many = businesses.length > 1;
  // A computer's rows (places, Create, Settings): icon and words, a soft pill on the current one, as Ideogram's sidebar.
  const row = (current: boolean) =>
    `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${folded("justify-center px-0")} ${
      current ? "bg-gray-100 font-semibold text-deep-navy" : "font-medium text-gray-700 hover:bg-gray-50 hover:text-deep-navy"
    }`;
  const tip = useTip(collapsed);
  return (
    <nav
      // Phones: a dark top bar (and the tab pill below), whatever the look. Computers: a sidebar in the chosen look,
      // exactly the window's height, however short: its lower part scrolls on its own, never the page.
      className={`keep-light-phone bg-deep-navy text-white lg:sticky lg:top-0 lg:z-40 lg:flex lg:h-dvh lg:flex-shrink-0 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:text-charcoal lg:transition-[width] lg:duration-200 motion-reduce:transition-none ${folded("lg:w-[4.5rem]", "lg:w-60")}`}
      aria-label="Admin"
      onPointerOver={tip.over}
      onPointerOut={tip.out}
      onFocus={tip.over}
      onBlur={tip.out}
      // A click opens something (a menu, a page): the label gets out of its way.
      onClick={tip.out}
    >
      {/* Phones: one compact bar, the event on the left (tap to switch), Core and the account on the right.
          Nothing in it may push the others off screen, however long the name. Computers: the sidebar's head,
          the fold button over the organizer and event (tap to switch), as Ideogram's account switcher. */}
      <div className={`flex items-center gap-2 py-2 pl-4 pr-2 lg:block lg:px-3 lg:pb-1 lg:pt-3 ${folded("lg:px-2")}`}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          data-tip={collapsed ? "Expand sidebar" : undefined}
          className={`mb-2 hidden h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-deep-navy lg:flex ${folded("lg:mx-auto")}`}
        >
          <svg className={`h-5 w-5 transition-transform motion-reduce:transition-none ${folded("rotate-180")}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h16v16H4zM9 4v16M16 10l-2 2 2 2" />
          </svg>
        </button>
        <div
          className={`relative flex min-h-11 min-w-0 flex-1 items-center gap-2.5 lg:min-h-14 lg:rounded-xl lg:px-2 lg:ring-1 lg:ring-gray-200 ${many ? "lg:hover:bg-gray-50" : ""} ${folded("lg:justify-center lg:px-0 lg:ring-0")}`}
          data-tip={collapsed && funnel ? `${organizerName} · ${many ? funnel.brand.seriesLabel : funnel.brand.name}` : undefined}
        >
          {funnel && <OrganizerTile funnel={funnel} />}
          <div className={`min-w-0 flex-1 ${folded("lg:hidden")}`}>
            <p className="truncate text-[11px] font-bold uppercase tracking-widest text-sky-accent lg:text-sm lg:font-semibold lg:normal-case lg:tracking-normal lg:text-deep-navy">
              {organizerName ?? "Admin"}
            </p>
            {/* The event's name, cut short to fit; the select lies over the whole block, so a tap opens the device's own picker. */}
            <p className={`flex min-w-0 items-center gap-1 ${!many && funnel?.brand.name === organizerName ? "lg:hidden" : ""}`} aria-hidden={many}>
              <span className="truncate text-[15px] font-bold leading-snug lg:text-xs lg:font-normal lg:text-gray-600">
                {funnel ? (many ? funnel.brand.seriesLabel : funnel.brand.name) : "No events yet"}
              </span>
              {many && (
                <svg className="h-4 w-4 flex-shrink-0 text-white/70 lg:text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </p>
          </div>
          {many && (
            <>
              <label htmlFor="admin-business" className="sr-only">Event</label>
              <select
                id="admin-business"
                value={funnel?.slug}
                onChange={(e) => selectAdminBusiness(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [&_optgroup]:bg-white [&_optgroup]:text-charcoal [&_option]:bg-white [&_option]:text-charcoal"
              >
                {/* Each client's events by name. */}
                {groups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map((b) => (
                      <option key={b.funnel.slug} value={b.funnel.slug}>
                        {b.funnel.brand.seriesLabel}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </>
          )}
        </div>
        {/* Phones: Core's nudge and the account, on the right (a computer has them at the foot of the sidebar). */}
        <div className="flex flex-shrink-0 items-center gap-1 lg:hidden">
          <CoreNudgeChip />
          <Account />
        </div>
      </div>
      {/* Computers: the places, Create and the foot scroll here on a window too short for them. */}
      <div
        className={`contents lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overscroll-contain lg:px-3 lg:pt-3 ${folded("lg:px-2 lg:[scrollbar-width:none]", "lg:[scrollbar-width:thin]")}`}
      >
        {/* Phones: a floating pill in thumb reach, the content scrolling under it, the + beside it. Computers: the sidebar's rows. */}
        <ul
          className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-[5.25rem] z-40 grid h-[3.75rem] grid-cols-4 items-center rounded-full bg-deep-navy/90 px-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.75)] ring-1 ring-white/10 backdrop-blur-xl lg:static lg:flex lg:h-auto lg:flex-col lg:items-stretch lg:gap-0.5 lg:rounded-none lg:bg-transparent lg:px-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none"
          role="list"
        >
          {links.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href) || link.also.some((p) => pathname.startsWith(p));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  data-tour={link.tour}
                  data-tip={collapsed ? link.label : undefined}
                  className={`mx-0.5 flex h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-full px-0.5 text-[11px] font-semibold leading-tight transition-colors lg:mx-0 lg:h-auto lg:min-h-11 lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:text-[15px] lg:leading-normal ${folded("lg:justify-center lg:px-0", "lg:justify-start")} ${
                    active
                      ? "bg-white/15 text-white lg:bg-gray-100 lg:font-semibold lg:text-deep-navy"
                      : "text-white/65 hover:text-white lg:font-medium lg:text-gray-700 lg:hover:bg-gray-50 lg:hover:text-deep-navy"
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
                  <span className={`max-w-full truncate ${folded("lg:sr-only")}`}>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Phones: the + beside the pill. */}
        <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-3 z-40 lg:hidden">
          <PlusMenu />
        </div>
        {/* Computers: what they do, as rows under Create (no floating button on a computer). */}
        <div className="hidden lg:block">
          <CreateGroup collapsed={collapsed} rowClass={row(false)} />
        </div>
        <div className="hidden space-y-0.5 pb-2 pt-6 lg:mt-auto lg:block">
          {/* Core: the trial's days left and Keep Core, or Get Core on Free. */}
          <CoreNudge collapsed={collapsed} />
          <Link
            href="/admin/settings"
            aria-current={pathname.startsWith("/admin/settings") ? "page" : undefined}
            data-tip={collapsed ? "Settings" : undefined}
            className={row(pathname.startsWith("/admin/settings"))}
          >
            <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d={SETTINGS_ICON} />
            </svg>
            <span className={folded("sr-only")}>Settings</span>
          </Link>
        </div>
      </div>
      {/* Computers: who's signed in, at the foot and outside the scrolling part, so its menu isn't clipped. */}
      <div className={`hidden border-t border-gray-200 px-3 py-2 lg:block ${folded("lg:px-2")}`}>
        <Account collapsed={collapsed} sidebar />
      </div>
      {tip.node}
    </nav>
  );
}

/** The organizer's photo, or their initial on their color: who this admin is working for. */
function OrganizerTile({ funnel }: { funnel: Funnel }) {
  return (
    <span
      title={funnel.brand.name}
      aria-hidden="true"
      className="keep-light relative hidden h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-deep-navy text-base font-bold text-white lg:flex"
      style={funnel.brand.theme as React.CSSProperties}
    >
      {funnel.brand.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- the organizer's own photo
        <img src={funnel.brand.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        funnel.brand.name[0]
      )}
    </span>
  );
}

/**
 * The folded sidebar's labels: a small dark tooltip beside whatever is
 * pointed at or focused (anything with data-tip), placed on the screen so
 * the sidebar's scrolling doesn't clip it.
 */
function useTip(collapsed: boolean) {
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const over = (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
    if (!collapsed || !el?.dataset.tip) return setTip(null);
    const r = el.getBoundingClientRect();
    setTip({ text: el.dataset.tip, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const out = () => setTip(null);
  const node = tip ? (
    <span
      role="tooltip"
      className="theme-follow pointer-events-none fixed z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1d1b22] px-2.5 py-1.5 text-sm font-medium text-white shadow-lg lg:block"
      style={{ top: tip.top, left: tip.left }}
    >
      {tip.text}
    </span>
  ) : null;
  return { over, out, node };
}

// A gear: Settings.
const SETTINGS_ICON =
  "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z";

/** Who's signed in (their photo and name), with Settings, Change password and Sign out. */
function Account({ collapsed = false, sidebar = false }: { collapsed?: boolean; sidebar?: boolean }) {
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
      <details ref={menu} className="group relative">
        <summary
          data-tour="account"
          aria-label={`Account: ${name ?? email}`}
          data-tip={sidebar && collapsed ? name ?? email : undefined}
          className={
            sidebar
              ? `flex min-h-12 w-full cursor-pointer list-none items-center gap-3 rounded-xl px-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-deep-navy ${collapsed ? "justify-center px-0" : ""}`
              : "flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full bg-white/10 text-sm font-bold uppercase text-white hover:bg-white/20"
          }
        >
          {sidebar ? (
            // On the light sidebar, the initial sits on a dark circle (as in Settings).
            <span className="flex-shrink-0 rounded-full bg-deep-navy">
              <Avatar name={name} email={email} url={avatarUrl} className="h-8 w-8 text-xs" />
            </span>
          ) : (
            <Avatar name={name} email={email} url={avatarUrl} className="h-11 w-11 text-sm" />
          )}
          {sidebar && !collapsed && <span className="min-w-0 flex-1 truncate">{name ?? email}</span>}
        </summary>
        {/* Above the page (the nav sits on top, lg:z-40). In the sidebar's foot it opens upward; folded, beside the photo. */}
        <div
          className={`theme-follow absolute z-50 w-60 rounded-xl bg-white p-1.5 text-charcoal shadow-xl ring-1 ring-black/10 ${
            !sidebar ? "right-0 mt-2" : collapsed ? "bottom-0 left-full ml-3" : "bottom-full left-0 mb-2"
          }`}
        >
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
          <button
            type="button"
            onClick={(e) => {
              closeMenu(e.currentTarget);
              startTour();
            }}
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-deep-navy hover:bg-soft-gray"
          >
            Take the tour
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
