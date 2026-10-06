// Shared by the funnel forms and /api/leads so both validate the same way.

export type LeadSource = "funnel";

/** What the visitor asked for: a call back, or a text with the next video. */
export type LeadIntent = "book" | "text_later";

export type LeadInput = {
  source: LeadSource;
  intent?: LeadIntent;
  name: string;
  /** Optional: the funnel asks for a phone number. */
  email?: string;
  phone?: string;
  /** One of the funnel's brand.services. */
  caseType: string;
  message?: string;
  /** Anonymous id from the reel funnel, linking the lead to the videos watched. */
  visitorId?: string;
  /** The reel whose "Book a Consultation" button brought the visitor here. */
  referringReelId?: string;
  /** Where the funnel link was shared, from its ?src= tag. */
  sourceTag?: string;
  /** The funnel link the lead came from. */
  funnelId?: string;
  /** Ticked the SMS consent box (required for "text me later"). */
  smsConsent?: boolean;
};

export const LEAD_LIMITS = {
  name: 200,
  email: 320,
  phone: 50,
  message: 5000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** At least 10 digits, allowing spaces, dashes, dots, parentheses and a leading +. */
export function isValidPhone(phone: string) {
  return /^\+?[\d\s().-]+$/.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}
