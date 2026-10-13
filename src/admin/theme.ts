"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { THEME_COOKIE, type AdminTheme } from "@/admin/theme-cookie";

// The chosen look, shared by the frame (which wears it) and Settings (which
// changes it). Starts from what the server read in the cookie.
let chosen: AdminTheme | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** The admin's look: what was chosen on this device, else what the server rendered. */
export function useAdminTheme(rendered: AdminTheme): AdminTheme {
  return useSyncExternalStore(subscribe, () => chosen ?? rendered, () => rendered);
}

/** The look the frame wears, for Settings to show which is chosen. */
export const AdminThemeContext = createContext<AdminTheme>("auto");
export const useChosenTheme = () => useContext(AdminThemeContext);

/** Changes it here and remembers it on this device for a year ("auto" forgets the choice). */
export function setAdminTheme(theme: AdminTheme) {
  chosen = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${theme === "auto" ? 0 : 31_536_000}; samesite=lax`;
  listeners.forEach((fn) => fn());
}

/** True where the browser can draw the dark look (2024 and later browsers); older ones stay light. */
export const canTheme = () => typeof CSS !== "undefined" && CSS.supports("color", "light-dark(#000, #fff)");
