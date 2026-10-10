"use client";

import { useSyncExternalStore } from "react";

/** Where organizers' links live, whatever address the admin was opened on. */
export const PUBLIC_ORIGIN = "https://www.showlnk.com";

/**
 * The origin for links organizers copy and share: this page's own, except on
 * a Vercel address (a preview or a deployment URL), which is never one to put
 * in a bio. Local and test servers keep their own, so their links still work.
 */
export const linkOrigin = (origin: string) => (/\.vercel\.app$/i.test(new URL(origin).hostname) ? PUBLIC_ORIGIN : origin);

export const useLinkOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => linkOrigin(window.location.origin),
    () => ""
  );
