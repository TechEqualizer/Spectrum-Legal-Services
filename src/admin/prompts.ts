// Video prompts from a drafted funnel, kept in this browser beside the
// drafts. They're notes for making the clips, not part of the funnel, so
// they never publish, and they outlast a publish and a reload.

import { useSyncExternalStore } from "react";

/** The opening scene's prompt, keyed beside the reels' ids. */
export const HERO_PROMPT = "#opening";

type Prompts = Record<string, string>;

const key = (business: string) => `admin_prompts_${business}`;
const listeners = new Set<() => void>();
// The parsed prompts per business, so the store returns the same object until they change.
const cache = new Map<string, { raw: string | null; value: Prompts }>();
const EMPTY: Prompts = {};

function read(business: string): Prompts {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key(business));
  } catch {
    return EMPTY;
  }
  const hit = cache.get(business);
  if (hit && hit.raw === raw) return hit.value;
  let value: Prompts = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") value = parsed as Prompts;
  } catch {}
  cache.set(business, { raw, value });
  return value;
}

/** Adds prompts (by reel id, or HERO_PROMPT) to the ones kept for a business. */
export function keepPrompts(business: string, prompts: Prompts) {
  try {
    localStorage.setItem(key(business), JSON.stringify({ ...read(business), ...prompts }));
  } catch {}
  listeners.forEach((l) => l());
}

export function usePrompts(business: string): Prompts {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => read(business),
    () => EMPTY
  );
}
