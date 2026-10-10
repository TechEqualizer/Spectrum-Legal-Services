"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { AdminEvent } from "@/admin/AdminBusiness";
import { normalizeSourceTag, sourceLabel } from "@/lib/source-tag";

// The organizers' own names for their link tags (/api/admin/source-names),
// loaded once per organizer and shared by every screen that names a source.

const names = new Map<string, Record<string, string>>();
const loading = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

function load(organizer: string, eventSlug: string) {
  if (names.has(organizer) || loading.has(organizer)) return;
  loading.add(organizer);
  fetch(`/api/admin/source-names?slug=${encodeURIComponent(eventSlug)}`, { cache: "no-store" })
    .then(async (res) => (res.ok ? ((await res.json()).names as Record<string, string>) : null))
    .catch(() => null)
    .then((got) => {
      loading.delete(organizer);
      // Not loaded (offline, not theirs): tags read as words, and the next screen tries again.
      if (got) {
        names.set(organizer, got);
        emit();
      }
    });
}

/**
 * Names a source the way the organizer named it, else as sourceLabel does.
 * For these events' organizers (Home has several; a tag named by more than
 * one takes the first's name).
 */
export function useSourceLabel(events: AdminEvent[]): (tag: string | null | undefined) => string {
  const organizers = [...new Map(events.map((e) => [e.organizer.slug, e.funnel.slug]))];
  const key = organizers.map(([o]) => o).join(",");
  useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => version,
    () => 0
  );
  useEffect(() => {
    for (const [organizer, slug] of organizers) load(organizer, slug);
    // `key` names every organizer in the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (tag) => {
    const t = tag ? normalizeSourceTag(tag) ?? tag : undefined;
    for (const [organizer] of organizers) {
      const name = t && names.get(organizer)?.[t];
      if (name) return name;
    }
    return sourceLabel(t);
  };
}

/** The name the organizer gave this tag, if any. */
export function savedSourceName(organizer: string, tag: string): string | undefined {
  return names.get(organizer)?.[tag];
}

/** Saves the organizer's name for a tag. Shows at once; false if it couldn't be saved. */
export async function saveSourceName(event: AdminEvent, tag: string, name: string): Promise<boolean> {
  const organizer = event.organizer.slug;
  if (names.get(organizer)?.[tag] === name) return true;
  const res = await fetch("/api/admin/source-names", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: event.funnel.slug, tag, name }),
  }).catch(() => null);
  if (!res?.ok) return false;
  names.set(organizer, { ...names.get(organizer), [tag]: name });
  emit();
  return true;
}
