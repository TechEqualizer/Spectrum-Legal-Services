// The admin's look, chosen in Settings and kept in a cookie so the server
// renders the page in it (no flash of the wrong one): "auto" follows the
// phone or computer's own setting (docs/plans/11-admin-themes.md).

export type AdminTheme = "auto" | "light" | "dark";

export const THEME_COOKIE = "admin_theme";

export const parseTheme = (v: string | undefined): AdminTheme => (v === "light" || v === "dark" ? v : "auto");
