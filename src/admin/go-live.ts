"use client";

import { useSyncExternalStore } from "react";

// Going live (docs/plans/03-billing.md, "The tour sells, then asks"): one
// sheet, opened from wherever Go live is offered (the end of the welcome
// tour, the sidebar, the phone chip, the welcome card, the Publish sheet) or
// from a link with ?golive=<organizer> (the private preview's bar).

/** Open, for which organizer (null: the event selected in the admin); or null when closed. */
type State = { organizer: string | null } | null;

let open: State = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openGoLive(organizer: string | null = null) {
  open = { organizer };
  emit();
}

export function closeGoLive() {
  open = null;
  emit();
}

export function useGoLive(): State {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => open,
    () => null
  );
}

/** A link that opens Go live for this organizer, from outside the admin's pages. */
export const goLiveHref = (organizer: string) => `/admin/home?golive=${encodeURIComponent(organizer)}`;
