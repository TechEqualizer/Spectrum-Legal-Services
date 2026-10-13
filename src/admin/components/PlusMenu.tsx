"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAdminEvents, useMaybeAdminBusiness, type AdminEvent } from "@/admin/AdminBusiness";
import { StoryDownload } from "@/admin/components/StyleSheet";
import { useLinkOrigin } from "@/admin/link-origin";
import { usePlan } from "@/admin/plan";
import { runsOrganizer, useAdminSession } from "@/admin/session";
import { titleFontClass } from "@/components/lookFonts";
import { eventDate } from "@/lib/event-time";
import { upcomingEvents } from "@/lib/events";
import { sceneMediaOf } from "@/lib/media";
import type { OpeningRecipe } from "@/lib/opening";
import { hasCore } from "@/lib/plans";
import type { StoryInput } from "@/lib/story-export";
import { keptStory, postStory } from "@/lib/story-share";

type Item = { key: string; label: string; detail: string; icon: string; run: () => void };

/**
 * What an organizer does most, most used first (docs/plans/10-mobile-shell.md):
 * post the night to their story, copy their link, a link for one place, add
 * a video, a new night. A phone has them behind the gold + beside its tab
 * pill (PlusMenu); a computer lists them in the sidebar under Create
 * (CreateGroup, docs/plans/11-admin-themes.md). `done` closes whatever
 * showed them.
 */
function useCreate(done: () => void) {
  const router = useRouter();
  const origin = useLinkOrigin();
  const session = useAdminSession();
  const events = useAdminEvents();
  const business = useMaybeAdminBusiness();
  const event = events.find((e) => e.funnel.slug === business?.funnel.slug) ?? events[0];
  const plan = usePlan(event?.funnel.slug);
  const live = Boolean(plan && hasCore(plan));
  const [story, setStory] = useState(false);
  const [copied, setCopied] = useState(false);
  // The story video made earlier on this device for the link as it is now, so one tap posts it.
  const [kept, setKept] = useState<Blob | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [looks, setLooks] = useState(0);
  const link = event ? `${origin}/f/${event.organizer.slug}` : "";
  const input = event ? storyOf(event, link) : null;
  const inputKey = input ? JSON.stringify(input) : "";
  // Read it again when the night changes, when the story sheet closes (it may have just made one), and when the actions are shown.
  useEffect(() => {
    let current = true;
    if (event && input) void keptStory(storyName(event), input).then((v) => current && setKept(v));
    return () => {
      current = false;
    };
    // The input, by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, story, looks]);

  if (!event) return null;
  const go = (href: string) => {
    done();
    router.push(href);
  };
  const items: Item[] = [
    {
      key: "story",
      label: "Post to your story",
      detail: said ?? (kept ? "Ready: one tap, and your link is copied for the sticker" : "Your opening as a video, ready to share"),
      icon: "M12 3a9 9 0 109 9M12 3a9 9 0 019 9M12 3v4M21 12h-4M10 9l5 3-5 3V9z",
      run: () => {
        if (!kept) {
          done();
          setStory(true);
          return;
        }
        // Straight from the tap: the share sheet opens with nothing awaited first.
        void postStory(kept, storyName(event), link).then((result) => {
          if (result === "blocked") {
            // The phone wants a fresh tap: the sheet has the video ready and a Share button.
            done();
            setStory(true);
          } else if (result === "saved") {
            setSaid("Saved to your downloads. Your link is copied too.");
            setTimeout(() => {
              setSaid(null);
              done();
            }, 2400);
          } else {
            done();
          }
        });
      },
    },
    {
      key: "copy",
      label: copied ? "Link copied" : "Copy your link",
      detail: live ? "For your bio: it always opens your next night" : "Fans see Coming soon until you go live",
      icon: "M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1",
      run: () => {
        navigator.clipboard
          ?.writeText(link)
          .then(() => {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
              done();
            }, 1200);
          })
          .catch(() => go("/admin/links"));
      },
    },
    {
      key: "place",
      label: "A link for one place",
      detail: "A promoter, a story, a QR code: see what each sells",
      icon: "M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
      run: () => go("/admin/links#place"),
    },
    {
      key: "video",
      label: "Add a video",
      detail: "A reel from your camera roll",
      icon: "M4 6a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM16 10l5-3v10l-5-3M10 9v6M7 12h6",
      run: () => go("/admin?add=1"),
    },
    ...(events.some((e) => runsOrganizer(session, e.organizer.slug))
      ? [
          {
            key: "night",
            label: "New night",
            detail: "Its own link and reels",
            icon: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM12 12v6M9 15h6",
            run: () => go("/admin/events?new=1"),
          },
        ]
      : []),
  ];
  const sheet = story ? <PostStory event={event} link={link} onClose={() => setStory(false)} /> : null;
  return { items, sheet, look: () => setLooks((n) => n + 1) };
}

const ItemIcon = ({ d, className }: { d: string; className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/**
 * A phone's one place to start anything: a gold + beside the tab pill that
 * turns into a close and raises what an organizer does most.
 */
export default function PlusMenu() {
  const id = useId();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const create = useCreate(() => setOpen(false));

  // A new page closes it.
  const [at, setAt] = useState(pathname);
  if (at !== pathname) {
    setAt(pathname);
    setOpen(false);
  }

  // Placed above the button.
  const toggle = () => {
    const r = button.current?.getBoundingClientRect();
    if (!open && r) setPos({ right: Math.max(12, window.innerWidth - r.right), bottom: window.innerHeight - r.top + 12 });
    if (!open) create?.look();
    setOpen((o) => !o);
  };

  // Escape, a tap outside, or moving focus away closes it; focus goes to the first item when it opens.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("button")?.focus();
    const close = (e: Event) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  if (!create) return null;
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={open ? "Close" : "Create"}
        data-tour="create"
        onClick={toggle}
        className="flex size-[3.75rem] shrink-0 items-center justify-center rounded-full bg-[#e8be5a] text-[#1a1208] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)] ring-1 ring-black/10 transition active:scale-95 motion-reduce:transition-none"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-7 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-45" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && (
        <div
          ref={menu}
          id={`${id}-menu`}
          role="group"
          aria-label="Create"
          style={pos}
          className="plus-menu theme-follow fixed z-[60] w-[min(20rem,calc(100vw-1.5rem))] origin-bottom-right overflow-hidden rounded-3xl bg-white p-1.5 text-charcoal shadow-[0_24px_60px_-20px_rgb(14_26_43/0.55)] ring-1 ring-black/10"
        >
          <ul role="list">
            {create.items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.run}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-soft-gray focus-visible:bg-soft-gray focus-visible:outline-none"
                >
                  <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full ${item.key === "story" ? "bg-[#e8be5a] text-[#1a1208]" : "bg-soft-gray text-deep-navy"}`}>
                    <ItemIcon d={item.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-deep-navy" aria-live={item.key === "copy" ? "polite" : undefined}>
                      {item.label}
                    </span>
                    <span className="block text-xs text-gray-600" aria-live={item.key === "story" ? "polite" : undefined}>
                      {item.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {create.sheet}
    </>
  );
}

/**
 * A computer's version: the same actions as rows in the sidebar, under a
 * small Create label, like its places (no floating button on a computer).
 * Folded to icons, each shows its name on hover (data-tip).
 */
export function CreateGroup({ collapsed, rowClass }: { collapsed: boolean; rowClass: string }) {
  const id = useId();
  const create = useCreate(() => {});
  if (!create) return null;
  return (
    <section aria-labelledby={`${id}-label`} className="mt-5" onPointerEnter={create.look} onFocus={create.look}>
      <h2 id={`${id}-label`} className={collapsed ? "sr-only" : "px-3 pb-1 text-xs font-medium text-gray-500"}>
        Create
      </h2>
      {collapsed && <div aria-hidden="true" className="mx-auto mb-2 h-px w-6 bg-gray-200" />}
      <ul role="list" className="space-y-0.5">
        {create.items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.run}
              data-tip={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? undefined : item.detail}
              className={rowClass}
            >
              <ItemIcon d={item.icon} className={`h-5 w-5 flex-shrink-0 ${item.key === "story" ? "text-[#b8862a]" : ""}`} />
              <span className={collapsed ? "sr-only" : "truncate"} aria-live={item.key === "copy" || item.key === "story" ? "polite" : undefined}>
                {item.key === "story" && item.detail.startsWith("Saved") ? "Saved: link copied" : item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {create.sheet}
    </section>
  );
}

const storyName = (event: AdminEvent) => `${event.organizer.slug}-story.mp4`;

/** What the Stories video needs, from the link as fans see it now (its published opening, look and next date). */
function storyOf(event: AdminEvent, link: string): StoryInput | null {
  const funnel = event.live;
  const media = sceneMediaOf(funnel);
  const recipe = media?.kind === "image" && media.fit === "poster" ? (media.opening as OpeningRecipe | undefined) : undefined;
  if (!recipe || media?.kind !== "image") return null;
  const next = upcomingEvents(funnel, Date.now())[0];
  const font = funnel.cover.titleFont;
  return {
    src: media.src,
    recipe,
    ...(media.depth ? { depth: media.depth } : {}),
    fontClass: titleFontClass(font),
    caps: font === "regal" || font === "bold",
    accent: funnel.brand.theme?.["--sky-accent"] ?? "#6CB4D8",
    title: funnel.cover.hero?.title ?? funnel.cover.heading,
    when: next ? `${eventDate(next, { weekday: "short", month: "short", day: "numeric" })} · ${eventDate(next, { hour: "numeric", minute: "2-digit" }).replace(":00", "")}` : "",
    link: link.replace(/^https?:\/\/(www\.)?/, ""),
  };
}

/**
 * Post to your story: the + menu's item makes the video (the opening fans
 * see, ending on the title, date and link), and Share hands it to the
 * phone's share sheet (Instagram, TikTok) or saves it. Once made, the video
 * stays on this device, and the menu item posts it in one tap.
 */
function PostStory({ event, link, onClose }: { event: AdminEvent; link: string; onClose: () => void }) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [input] = useState(() => storyOf(event, link));
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      data-testid="post-story"
      className="theme-follow m-auto w-[min(26rem,calc(100vw-1rem))] rounded-3xl bg-white p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/70"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <h2 id={`${id}-title`} className="text-xl font-black tracking-tight text-deep-navy">
          Post to your story
        </h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="-mr-2 -mt-1 flex size-11 items-center justify-center rounded-full text-gray-600 hover:bg-soft-gray hover:text-deep-navy">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {input ? (
        <div className="px-1 pb-1">
          <StoryDownload input={input} name={storyName(event)} disabled={false} autoStart />
        </div>
      ) : (
        <div className="px-5 pb-5 pt-2">
          <p className="text-sm text-gray-700">Your story video is your opening, cut from your flyer. Make your opening first, then post it from here.</p>
          <button
            type="button"
            onClick={() => {
              ref.current?.close();
              router.push("/admin");
            }}
            className="mt-4 min-h-11 w-full rounded-xl bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue"
          >
            Open your link
          </button>
        </div>
      )}
    </dialog>
  );
}
