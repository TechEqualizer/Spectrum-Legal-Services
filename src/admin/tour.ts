"use client";

import { useSyncExternalStore } from "react";

/**
 * The guided tours of the admin, each step lighting up the real thing on the
 * page. Steps point at elements by their data-tour name; a step whose element
 * isn't on screen (a phone layout without it) shows its card in the middle
 * instead. Two tours: the welcome, right after the sign-up wizard, which
 * shows what the link does for their night and ends on Go live; and the
 * how-to, from the account menu, a walk through the places a client uses.
 */
export type TourStep = {
  /** The page the step is on. */
  path: string;
  /** data-tour name of the element to light up; none for a card in the middle. */
  target?: string;
  title: string;
  body: string;
  /** A small tag beside the title, like "Add-on" for what the Fans add-on does. */
  tag?: string;
};

/**
 * The welcome tour (docs/plans/03-billing.md, "The tour sells, then asks"):
 * five stops on their own night, each what it does for them rather than
 * where a button is, ending on Go live while the value is fresh.
 */
export const WELCOME_STEPS: TourStep[] = [
  {
    path: "/admin/home",
    title: "Here's what your night just got",
    body: "Five stops, one minute: what your link does for you once it's live.",
  },
  {
    path: "/admin",
    target: "reels-order",
    title: "Your flyer is now a trailer",
    body: "The opening and three reels play full screen, right where fans already scroll, with Tickets one tap away.",
  },
  {
    path: "/admin/links",
    target: "share-bio",
    title: "One link, every night",
    body: "Put it in your bio once. It always opens your next night, so you never change it again.",
  },
  {
    path: "/admin/links",
    target: "share-builder",
    title: "Know which post sold tickets",
    body: "A link for each story, promoter and flyer QR code. Results shows which one sold, so you post more of what works.",
  },
  {
    path: "/admin/overview",
    target: "nav-results",
    title: "See who's coming",
    body: "Who watched, who watched to the end and who tapped Tickets, for every reel. Put your best one first.",
  },
  {
    path: "/admin/leads",
    target: "people-tabs",
    title: "Turn viewers into your own list",
    tag: "Add-on",
    body: "Everyone watching can follow you. They hear about your next night first, with presales and reels only they can see.",
  },
];

/** The how-to tour: where everything is. */
export const TOUR_STEPS: TourStep[] = [
  {
    path: "/admin/home",
    title: "Welcome to Showlnk",
    body: "A one-minute tour of how to run your link. You can skip it and take it again any time from your account menu.",
  },
  {
    path: "/admin/home",
    target: "home-next",
    title: "Home: your night at a glance",
    body: "Your next date, how many people watched, tapped for tickets and where they came from. Check here first.",
  },
  {
    path: "/admin",
    target: "nav-reels",
    title: "Link: what fans see",
    body: "Everything on your link is edited here: the opening scene, your dates and your reels.",
  },
  {
    path: "/admin",
    target: "reels-order",
    title: "Your reels, in order",
    body: "Visitors watch them top to bottom. Drag to reorder, or tap the pencil on a reel to change its video or words.",
  },
  {
    path: "/admin",
    target: "add-reel",
    title: "Add a reel",
    body: "Upload a vertical video (MP4 or MOV, under 50 MB) or a photo, give it a title and pick the date it sells.",
  },
  {
    path: "/admin",
    target: "publish",
    title: "Publish your edits",
    body: "Edits are saved on this device only. Tap Publish when it looks right: your link updates within a few minutes.",
  },
  {
    path: "/admin/events",
    target: "events-list",
    title: "Events: each night and its link",
    body: "Upcoming, tonight or ended at a glance. Tap an event to edit it, or New event for your next night.",
  },
  {
    path: "/admin/links",
    target: "share-bio",
    title: "Your bio link",
    body: "It always opens your next event, so it never needs changing. Put it in your Instagram and TikTok bio once.",
  },
  {
    path: "/admin/links",
    target: "share-builder",
    title: "A link for every place you post",
    body: "Pick where you'll share it (a story, a promoter, a flyer QR code) and copy the link. Each one is tracked, so you see which post sells tickets.",
  },
  {
    path: "/admin/overview",
    target: "nav-results",
    title: "Results",
    body: "Views, how many watched to the end, ticket clicks and tickets sold, for each reel and each place you post. Move your best reel up front.",
  },
  {
    path: "/admin/leads",
    target: "nav-leads",
    title: "People",
    body: "Everyone who left their number for updates, and your fans. Tap a number to call or text them before the night.",
  },
  {
    path: "/admin/leads",
    target: "people-tabs",
    title: "Fans",
    body: "People who follow you by email hear first about your next nights. See who follows, and keep the list as a spreadsheet.",
  },
  {
    path: "/admin/settings",
    target: "eventbrite",
    title: "Eventbrite",
    body: "Connect it once and every ticket sold shows up in Results and Share on its own.",
  },
  {
    path: "/admin/settings",
    target: "account",
    title: "You're all set",
    body: "Take this tour again any time from your account menu, here. Questions? Message Showlnk.",
  },
];

// Seen once on this device: it doesn't start by itself again.
const SEEN_KEY = "admin_tour";

export type TourName = "welcome" | "howto";
type State = { name: TourName; steps: TourStep[]; n: number };

let state: State | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The tour that's on and its step, or null. */
export function useTour(): State | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => state,
    () => null
  );
}

/** The how-to tour unless told otherwise (the welcome starts after the sign-up wizard). */
export function startTour(name: TourName = "howto") {
  state = { name, steps: name === "welcome" ? WELCOME_STEPS : TOUR_STEPS, n: 0 };
  emit();
}

export function goToStep(n: number) {
  if (!state) return;
  state = { ...state, n: Math.max(0, Math.min(state.steps.length - 1, n)) };
  emit();
}

/** Skipped or finished: remembered, so it won't start by itself again. */
export function endTour() {
  state = null;
  try {
    localStorage.setItem(SEEN_KEY, "done");
  } catch {}
  emit();
}

export function tourSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "done";
  } catch {
    // Storage blocked: never start by itself, rather than on every visit.
    return true;
  }
}
