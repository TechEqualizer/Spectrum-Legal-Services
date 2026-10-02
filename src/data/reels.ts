// The reel funnel: which videos exist and where each one leads.
//
// Like a drip campaign, but within one visit: what a visitor does with a reel
// decides the next one.
//   completed  watched to the end   -> usually a deeper reel on the same topic,
//                                       or the end card offering a consultation
//   skipped    swiped or tapped next -> a different type of accident
// `null` ends the funnel on the "talk to an attorney" card.
//
// PLACEHOLDER CONTENT: no videos have been recorded yet. Until a `video` is
// added, a reel shows a "Video coming soon" slide. Have an attorney review
// every title and summary before launch.

export type Reel = {
  id: string;
  /** Must match one of the intake form case types. */
  practiceArea: string;
  title: string;
  summary: string;
  duration?: string;
  /** Self-hosted video, e.g. { src: "/reels/criminal-defense.mp4", poster: "/reels/criminal-defense.jpg", captions: "/reels/criminal-defense.vtt" }. */
  video?: {
    src: string;
    poster?: string;
    /** WebVTT captions file. */
    captions?: string;
  };
};

export type FunnelTrigger = "completed" | "skipped";

export type Funnel = {
  /** Stored with every event; bump it when the paths change so results stay comparable. */
  id: string;
  /** Reels shown as cards on the page, in order. Every funnel visit starts at one of these. */
  entryReelIds: string[];
  links: Record<string, Record<FunnelTrigger, string | null>>;
};

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

export const defaultFunnel: Funnel = {
  id: "jlf-injury-v1",
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

export function getReel(id: string) {
  return reelsById.get(id);
}

/** The reel to show after `reelId`, or null for the end of the funnel. */
export function nextReelId(
  funnel: Funnel,
  reelId: string,
  trigger: FunnelTrigger
): string | null {
  return funnel.links[reelId]?.[trigger] ?? null;
}
