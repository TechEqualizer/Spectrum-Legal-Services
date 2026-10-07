"use client";

import { useSyncExternalStore } from "react";

/**
 * The guided tour of the admin: a short walk through the places a client
 * uses, each step lighting up the real thing on the page. Steps point at
 * elements by their data-tour name; a step whose element isn't on screen
 * (a phone layout without it) shows its card in the middle instead.
 */
export type TourStep = {
  /** The page the step is on. */
  path: string;
  /** data-tour name of the element to light up; none for a card in the middle. */
  target?: string;
  title: string;
  body: string;
};

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
    title: "Reels: what visitors see",
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
    title: "Nothing goes live until you Publish",
    body: "Edits are saved on this device only. Tap Publish when it looks right: your live link updates within a few minutes.",
  },
  {
    path: "/admin/events",
    target: "events-list",
    title: "Events: each night and its link",
    body: "Upcoming, tonight or ended at a glance. Tap an event to edit it. For a new night, send Showlnk the flyer.",
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
    body: "Views, how many watched to the end, ticket clicks and tickets sold, for each reel. Move your best reel up front.",
  },
  {
    path: "/admin/leads",
    target: "nav-leads",
    title: "Leads",
    body: "People who left their number for updates. Tap a number to call or text them before the night.",
  },
  {
    path: "/admin/settings",
    target: "eventbrite",
    title: "Eventbrite",
    body: "Connected, so every ticket sold shows up in Results and Share on its own.",
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

let step: number | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useTourStep() {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => step,
    () => null
  );
}

export function startTour() {
  step = 0;
  emit();
}

export function goToStep(n: number) {
  step = Math.max(0, Math.min(TOUR_STEPS.length - 1, n));
  emit();
}

/** Skipped or finished: remembered, so it won't start by itself again. */
export function endTour() {
  step = null;
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
