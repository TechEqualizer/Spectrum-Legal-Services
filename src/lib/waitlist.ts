// The Showlnk waitlist form's fields, shared by the form and /api/waitlist.

export const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;

/** An Instagram handle from whatever was typed: "@Name", "instagram.com/name/", or "name". Undefined when empty; null when it can't be one. */
export function instagramHandle(input: string): string | undefined | null {
  const raw = input
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase();
  if (!raw) return undefined;
  return INSTAGRAM_HANDLE.test(raw) ? raw : null;
}
