"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A <details> used as a pop-up menu, closing the way menus should: on a
 * click or tap outside it, Escape (focus goes back to its button), focus
 * moving out of it, and a change of page. Choosing an item closes it too
 * (see closeMenu).
 */
export function useDismiss<T extends HTMLDetailsElement>() {
  const ref = useRef<T>(null);
  const pathname = usePathname();

  // A new page: nothing stays open from the last one.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const outside = (e: Event) => {
      if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !menu.open) return;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    };
    const focusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (menu.open && next && !menu.contains(next)) menu.open = false;
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    menu.addEventListener("focusout", focusOut);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      menu.removeEventListener("focusout", focusOut);
    };
  }, []);

  return ref;
}

/** Closes the menu an item sits in, once it's chosen. */
export function closeMenu(item: Element) {
  const menu = item.closest("details");
  if (menu) menu.open = false;
}
