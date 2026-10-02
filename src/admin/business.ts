// The businesses the admin preview can show, with their sample content:
// the words they use, how their reels tend to perform, their drip
// campaigns, and their email look. All of it is SAMPLE data.

import { medspaFunnel } from "@/data/medspa";
import { defaultFunnel } from "@/data/reels";
import type { Funnel } from "@/data/funnel-types";
import { site } from "@/config/site";

export type DripStep = {
  id: string;
  /** Days after the trigger. */
  delayDays: number;
  reelId: string;
  subject: string;
};

export type DripCampaign = {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  steps: DripStep[];
  stats: { enrolled: number; opened: number; watched: number; booked: number };
};

/** How a reel tends to do: daily views as an entry reel, watch-through, and booking rate. */
export type ReelProfile = { entryViews: number; watch: number; book: number };

export type AdminBusiness = {
  funnel: Funnel;
  /** Fixed seeds keep each business's sample numbers the same between visits. */
  seeds: { days: number; leads: number };
  profile: Record<string, ReelProfile>;
  terms: {
    /** Column heading for what the lead asked about. */
    topic: string;
    leadsIntro: string;
    /** The last lead status, after "Consultation booked". */
    wonStatus: string;
    /** Whether the business also has a website form (JLF's hero form). */
    hasWebsiteForm: boolean;
  };
  /** The live funnel's name in the reel editor. */
  funnelName: string;
  /** Order of the live funnel in the reel editor. */
  editorOrder: string[];
  campaigns: DripCampaign[];
  campaignTriggers: string[];
  /** Which campaign a new lead joins, by topic. */
  campaignForTopic: Record<string, string>;
  email: { from: string; intro: string; cta: string; footer: string; defaultSubject: string };
};

const jlf: AdminBusiness = {
  funnel: defaultFunnel,
  seeds: { days: 20261002, leads: 99 },
  profile: {
    "car-accident-first-steps": { entryViews: 46, watch: 0.64, book: 0.035 },
    "car-accident-recorded-statement": { entryViews: 0, watch: 0.71, book: 0.05 },
    "injury-claim-deadlines": { entryViews: 0, watch: 0.68, book: 0.09 },
    "rideshare-accident-insurance": { entryViews: 21, watch: 0.58, book: 0.04 },
    "truck-accident-evidence": { entryViews: 14, watch: 0.61, book: 0.045 },
    "motorcycle-accident-claims": { entryViews: 17, watch: 0.52, book: 0.03 },
    "slip-and-fall-documentation": { entryViews: 11, watch: 0.49, book: 0.025 },
    "dog-bite-california-law": { entryViews: 9, watch: 0.57, book: 0.04 },
  },
  terms: {
    topic: "Case type",
    leadsIntro: "Case evaluation requests, with the videos each person watched first.",
    wonStatus: "Signed",
    hasWebsiteForm: true,
  },
  funnelName: "Injury Insights",
  // Chosen so most live links are simply "next in order".
  editorOrder: [
    "car-accident-first-steps",
    "car-accident-recorded-statement",
    "injury-claim-deadlines",
    "rideshare-accident-insurance",
    "truck-accident-evidence",
    "motorcycle-accident-claims",
    "slip-and-fall-documentation",
    "dog-bite-california-law",
  ],
  campaigns: [
    {
      id: "car-accident-nurture",
      name: "Car accident follow-up",
      trigger: "New lead with case type Car Accident",
      active: true,
      steps: [
        { id: "s1", delayDays: 0, reelId: "car-accident-first-steps", subject: "What to do in the first days after your crash" },
        { id: "s2", delayDays: 2, reelId: "car-accident-recorded-statement", subject: "Before you talk to the insurance company" },
        { id: "s3", delayDays: 5, reelId: "injury-claim-deadlines", subject: "How long you have to file in California" },
      ],
      stats: { enrolled: 64, opened: 41, watched: 27, booked: 9 },
    },
    {
      id: "watched-not-booked",
      name: "Watched but didn't book",
      trigger: "Visitor finished a video, left an email, but didn't book within 2 days",
      active: true,
      steps: [
        { id: "s1", delayDays: 2, reelId: "injury-claim-deadlines", subject: "A quick note on filing deadlines" },
        { id: "s2", delayDays: 6, reelId: "rideshare-accident-insurance", subject: "Questions we hear every week" },
      ],
      stats: { enrolled: 38, opened: 22, watched: 13, booked: 4 },
    },
    {
      id: "motorcycle-nurture",
      name: "Motorcycle accident follow-up",
      trigger: "New lead with case type Motorcycle Accident",
      active: false,
      steps: [
        { id: "s1", delayDays: 0, reelId: "motorcycle-accident-claims", subject: "How we push back on rider bias" },
      ],
      stats: { enrolled: 0, opened: 0, watched: 0, booked: 0 },
    },
  ],
  campaignTriggers: [
    "New lead with case type Car Accident",
    "New lead with case type Motorcycle Accident",
    "New lead with case type Truck Accident",
    "New lead with case type Uber / Lyft Accident",
    "Visitor finished a video, left an email, but didn't book within 2 days",
  ],
  campaignForTopic: { "Car Accident": "car-accident-nurture" },
  email: {
    from: `Attorney Jeff, ${site.name}`,
    intro: "Here's a short video that answers a question we hear a lot.",
    cta: "Book your free case evaluation",
    footer: `Attorney Advertising. General information, not legal advice. You're getting this because you asked ${site.name} about your case. Unsubscribe anytime.`,
    defaultSubject: "A short video from Attorney Jeff",
  },
};

const medspa: AdminBusiness = {
  funnel: medspaFunnel,
  seeds: { days: 20261003, leads: 314 },
  profile: {
    "ms-wrinkle-relaxers-first-time": { entryViews: 44, watch: 0.62, book: 0.03 },
    "ms-natural-results": { entryViews: 0, watch: 0.7, book: 0.05 },
    "ms-lip-filler": { entryViews: 33, watch: 0.6, book: 0.035 },
    "ms-filler-aftercare": { entryViews: 0, watch: 0.66, book: 0.04 },
    "ms-glow-facial": { entryViews: 24, watch: 0.55, book: 0.03 },
    "ms-microneedling": { entryViews: 17, watch: 0.58, book: 0.035 },
    "ms-laser-hair": { entryViews: 20, watch: 0.5, book: 0.03 },
    "ms-pricing": { entryViews: 0, watch: 0.72, book: 0.08 },
    "ms-consultation": { entryViews: 0, watch: 0.75, book: 0.12 },
  },
  terms: {
    topic: "Treatment",
    leadsIntro: "Consultation requests, with the videos each person watched first.",
    wonStatus: "Treatment booked",
    hasWebsiteForm: false,
  },
  funnelName: "Skin Notes",
  editorOrder: medspaFunnel.reels.map((r) => r.id),
  campaigns: [
    {
      id: "lip-filler-nurture",
      name: "Lip filler follow-up",
      trigger: "New lead asking about Lip Filler",
      active: true,
      steps: [
        { id: "s1", delayDays: 0, reelId: "ms-lip-filler", subject: "Thinking about lip filler? Start here" },
        { id: "s2", delayDays: 2, reelId: "ms-filler-aftercare", subject: "What the first few days really look like" },
        { id: "s3", delayDays: 5, reelId: "ms-pricing", subject: "How pricing works, with no surprises" },
      ],
      stats: { enrolled: 48, opened: 31, watched: 22, booked: 11 },
    },
    {
      id: "texted-not-booked",
      name: "Asked for a text, didn't book",
      trigger: "Asked to be texted, but didn't book within 2 days",
      active: true,
      steps: [
        { id: "s1", delayDays: 2, reelId: "ms-consultation", subject: "What happens at a free consultation" },
        { id: "s2", delayDays: 6, reelId: "ms-natural-results", subject: "Will I look frozen? Our answer" },
      ],
      stats: { enrolled: 36, opened: 21, watched: 14, booked: 5 },
    },
    {
      id: "laser-follow-up",
      name: "Laser hair removal follow-up",
      trigger: "New lead asking about Laser Hair Removal",
      active: false,
      steps: [
        { id: "s1", delayDays: 0, reelId: "ms-laser-hair", subject: "Why laser takes several sessions" },
      ],
      stats: { enrolled: 0, opened: 0, watched: 0, booked: 0 },
    },
  ],
  campaignTriggers: [
    "New lead asking about Wrinkle Relaxers",
    "New lead asking about Lip Filler",
    "New lead asking about Laser Hair Removal",
    "Asked to be texted, but didn't book within 2 days",
  ],
  campaignForTopic: { "Lip Filler": "lip-filler-nurture" },
  email: {
    from: "Aurelia Med Spa",
    intro: "Here's a short video that answers a question we hear a lot.",
    cta: "Book a free consultation",
    footer:
      "General information, not medical advice. You're getting this because you asked Aurelia Med Spa about a treatment. Unsubscribe anytime.",
    defaultSubject: "A short video from Aurelia",
  },
};

export const businesses: AdminBusiness[] = [jlf, medspa];
