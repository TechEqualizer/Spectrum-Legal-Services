// A short tag saying where a funnel link was shared, e.g. /f/jlf?src=instagram.
// Shared by the browser and the API routes so both accept the same values.

export const SOURCE_TAG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/** The cleaned tag, or undefined when the value isn't a usable tag. */
export function normalizeSourceTag(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const tag = value.trim().toLowerCase();
  return SOURCE_TAG_PATTERN.test(tag) ? tag : undefined;
}

/** Where a link can be shared, as offered in the admin's link builder. */
export const SOURCE_PRESETS = [
  { tag: "instagram", label: "Instagram bio" },
  { tag: "tiktok", label: "TikTok bio" },
  { tag: "facebook", label: "Facebook" },
  { tag: "google", label: "Google Business Profile" },
  { tag: "sms", label: "Text message" },
  { tag: "email", label: "Email signature" },
  { tag: "referral", label: "Referral partner" },
  { tag: "share", label: "Shared by a viewer" },
] as const;

export function sourceLabel(tag: string | undefined) {
  if (!tag) return "Direct";
  return SOURCE_PRESETS.find((p) => p.tag === tag)?.label ?? tag;
}
