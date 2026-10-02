// The reel funnel: which videos exist and where each one leads.
//
// Like a drip campaign, but within one visit: what a visitor does with a reel
// decides the next one.
//   completed  watched to the end   -> usually a deeper reel on the same topic,
//                                       or the end card offering a consultation
//   skipped    swiped or tapped next -> a different type of accident
// `null` ends the funnel on the "talk to an attorney" card.
//
// This file is The JLF Firm's funnel; other businesses' funnels live beside
// it and are listed in src/data/funnels.ts.
//
// PLACEHOLDER CONTENT: no videos have been recorded yet. Until a `video` is
// added, a reel shows a "Video coming soon" slide. Have an attorney review
// every title and summary before launch.

import { site } from "@/config/site";
import type { Funnel, FunnelBrand, FunnelTrigger, Reel } from "@/data/funnel-types";
import { CASE_TYPES } from "@/lib/leads";

export type {
  Funnel,
  FunnelBrand,
  FunnelCta,
  FunnelTrigger,
  Reel,
} from "@/data/funnel-types";

export const reels: Reel[] = [
  {
    id: "car-accident-first-steps",
    practiceArea: "Car Accident",
    title: "Just had a car accident? Do these first",
    summary:
      "Get medical care, document the scene, and be careful what you tell insurers. The steps that protect your claim.",
  },
  {
    id: "car-accident-recorded-statement",
    practiceArea: "Car Accident",
    title: "Should you give the insurer a recorded statement?",
    summary:
      "Why the other driver's insurance company asks for one, and what to consider before you agree.",
  },
  {
    id: "injury-claim-deadlines",
    practiceArea: "Car Accident",
    title: "How long you have to file in California",
    summary:
      "Most California injury claims must be filed within two years. Claims against a government agency can have a much shorter deadline.",
  },
  {
    id: "rideshare-accident-insurance",
    practiceArea: "Uber / Lyft Accident",
    title: "Hurt in an Uber or Lyft: whose insurance pays?",
    summary:
      "Rideshare coverage depends on what the driver was doing at the time of the crash. How it usually works.",
  },
  {
    id: "truck-accident-evidence",
    practiceArea: "Truck Accident",
    title: "Why truck accident evidence disappears fast",
    summary:
      "Driver logs, black-box data, and maintenance records can be lost if no one asks for them early.",
  },
  {
    id: "motorcycle-accident-claims",
    practiceArea: "Motorcycle Accident",
    title: "Motorcycle crash claims and rider bias",
    summary:
      "Insurers sometimes assume the rider was at fault. How evidence helps tell what really happened.",
  },
  {
    id: "slip-and-fall-documentation",
    practiceArea: "Slip, Trip & Fall",
    title: "Slip and fall: what to document",
    summary:
      "Photos, witnesses, and incident reports: what to gather when a hazard on someone's property hurts you.",
  },
  {
    id: "dog-bite-california-law",
    practiceArea: "Dog Bite",
    title: "Bitten by a dog in California?",
    summary:
      "California has a strict dog-bite law that makes owners responsible for most bites. What that means for you.",
  },
];

const jlfBrand: FunnelBrand = {
  name: site.name,
  logo: {
    kind: "image",
    src: "/brand/jlf-logo-white.png",
    width: 450,
    height: 204,
    alt: `${site.name}, Car Accident Lawyer`,
  },
  byline: [site.attorney.name, site.attorney.title],
  phone: site.phone,
  services: CASE_TYPES,
  smsConsent: `I agree that ${site.name} may text me at this number about my question, including links to short videos. Up to 4 messages. Msg & data rates may apply. Reply STOP to opt out. Consent is not required to hire the firm.`,
  seriesLabel: "Injury Insights \u00b7 Attorney Jeff",
  disclaimer:
    "General information only, not legal advice. Watching this video does not create an attorney-client relationship.",
  footer: `Attorney Advertising. General information only, not legal advice. Watching these videos does not create an attorney-client relationship. Main office: ${site.mainOffice.street}, ${site.mainOffice.city}.`,
  copy: {
    bookPrimary: "Book a free case review",
    callBack: "Request a call back",
    callNow: "Call now",
    coverCallPrompt: "Rather talk to someone now?",
    coverCall: `Call 24/7: ${site.phone.display}`,
    book: {
      heading: "Get a free case review",
      intro: "Leave your number and Attorney Jeff's team will call you back.",
      submit: "Request my call back",
    },
    bookDone: (name, phone) =>
      `Thanks, ${name}. Attorney Jeff's team will call you at ${phone}.`,
    textLater: {
      heading: "Not ready to talk?",
      intro: "We'll text you the next video, so you can keep watching when it suits you.",
      submit: "Text me the next video",
    },
    textLaterDone: (name, phone) =>
      `Thanks, ${name}. The next video is on its way to ${phone}. Reply STOP any time to opt out.`,
    formFinePrint:
      "Your case review is free. Sending this does not create an attorney-client relationship.",
    endHeading: "Have a question about your situation?",
    endBody:
      "Every case is different. Talk it through with one of our attorneys. The case review is free.",
    shareButton: "Send to someone who got hurt",
    shareText: "Short videos from Attorney Jeff on what to do after an accident.",
  },
};

export const defaultFunnel: Funnel = {
  id: "jlf-injury-v1",
  slug: "jlf",
  brand: jlfBrand,
  reels,
  primaryCta: "call",
  cover: {
    heading: "What happened?",
    intro:
      "Pick one. Attorney Jeff explains what to do next in a few short videos.",
    entryLabels: {
      "car-accident-first-steps": "Car accident",
      "rideshare-accident-insurance": "Uber or Lyft accident",
      "truck-accident-evidence": "Truck accident",
      "motorcycle-accident-claims": "Motorcycle crash",
      "slip-and-fall-documentation": "Slip and fall",
      "dog-bite-california-law": "Dog bite",
    },
  },
  entryReelIds: [
    "car-accident-first-steps",
    "rideshare-accident-insurance",
    "truck-accident-evidence",
    "motorcycle-accident-claims",
    "slip-and-fall-documentation",
    "dog-bite-california-law",
  ],
  links: {
    "car-accident-first-steps": {
      completed: "car-accident-recorded-statement",
      skipped: "rideshare-accident-insurance",
    },
    "car-accident-recorded-statement": {
      completed: "injury-claim-deadlines",
      skipped: "rideshare-accident-insurance",
    },
    "injury-claim-deadlines": {
      completed: null,
      skipped: "rideshare-accident-insurance",
    },
    "rideshare-accident-insurance": {
      completed: "injury-claim-deadlines",
      skipped: "truck-accident-evidence",
    },
    "truck-accident-evidence": {
      completed: "injury-claim-deadlines",
      skipped: "motorcycle-accident-claims",
    },
    "motorcycle-accident-claims": {
      completed: "injury-claim-deadlines",
      skipped: "slip-and-fall-documentation",
    },
    "slip-and-fall-documentation": {
      completed: null,
      skipped: "dog-bite-california-law",
    },
    "dog-bite-california-law": {
      completed: null,
      skipped: null,
    },
  },
};

const reelsById = new Map(reels.map((reel) => [reel.id, reel]));

/** A reel on The JLF Firm's site and admin. In a funnel, use funnelReel. */
export function getReel(id: string) {
  return reelsById.get(id);
}

/** A reel within one funnel. */
export function funnelReel(funnel: Funnel, id: string) {
  return funnel.reels.find((reel) => reel.id === id);
}

/** The reel to show after `reelId`, or null for the end of the funnel. */
export function nextReelId(
  funnel: Funnel,
  reelId: string,
  trigger: FunnelTrigger
): string | null {
  return funnel.links[reelId]?.[trigger] ?? null;
}
