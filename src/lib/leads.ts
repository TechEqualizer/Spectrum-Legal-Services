// Shared by the intake forms and /api/leads so both validate the same way.

export const CASE_TYPES = [
  "Car Accident",
  "Truck Accident",
  "Motorcycle Accident",
  "Uber / Lyft Accident",
  "Pedestrian Accident",
  "Bicycle Accident",
  "Slip, Trip & Fall",
  "Dog Bite",
  "Wrongful Death",
  "Other Injury",
] as const;

export type LeadSource = "hero" | "contact";

export type LeadInput = {
  source: LeadSource;
  name: string;
  email: string;
  phone?: string;
  caseType: string;
  message?: string;
  /** Anonymous id from the reel funnel, linking the lead to the videos watched. */
  visitorId?: string;
  /** The reel whose "Book a Consultation" button brought the visitor here. */
  referringReelId?: string;
};

export const LEAD_LIMITS = {
  name: 200,
  email: 320,
  phone: 50,
  message: 5000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}

export function isCaseType(value: string) {
  return (CASE_TYPES as readonly string[]).includes(value);
}
