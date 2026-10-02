// The reel funnel: which videos exist and where each one leads.
//
// Like a drip campaign, but within one visit: what a visitor does with a reel
// decides the next one.
//   completed  watched to the end   -> usually a deeper reel on the same topic,
//                                       or the end card offering a consultation
//   skipped    swiped or tapped next -> a different practice area
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
    id: "criminal-defense-police-stop",
    practiceArea: "Criminal Defense",
    title: "Stopped by the police? Know your rights",
    summary:
      "You have the right to stay silent and to ask for a lawyer. How to use those rights calmly and respectfully.",
  },
  {
    id: "criminal-defense-after-arrest",
    practiceArea: "Criminal Defense",
    title: "Arrested: what happens next",
    summary:
      "Booking, bail, and your first court date. What the process usually looks like, and when to call a lawyer.",
  },
  {
    id: "family-law-custody",
    practiceArea: "Family Law",
    title: "How courts decide custody",
    summary:
      "Courts focus on the child's best interests. A look at the factors judges commonly weigh.",
  },
  {
    id: "family-law-divorce-steps",
    practiceArea: "Family Law",
    title: "The divorce process, step by step",
    summary:
      "From filing to final decree: the usual stages of a divorce and the decisions you will face along the way.",
  },
  {
    id: "business-contract-clauses",
    practiceArea: "Business & Contract Law",
    title: "Three clauses every contract needs",
    summary:
      "Scope, payment terms, and how disputes get resolved: the clauses that prevent most business disagreements.",
  },
  {
    id: "estate-planning-will-vs-trust",
    practiceArea: "Estate Planning",
    title: "Will or trust: what's the difference?",
    summary:
      "Both pass on what you own, but they work differently. When each one tends to make sense.",
  },
  {
    id: "immigration-interview-prep",
    practiceArea: "Immigration",
    title: "Preparing for your immigration interview",
    summary:
      "What to bring, what officers typically ask, and how to prepare so the day goes smoothly.",
  },
  {
    id: "civil-litigation-deposition",
    practiceArea: "Civil Litigation",
    title: "What happens at a deposition",
    summary:
      "A deposition is sworn testimony taken before trial. How the process works and how to prepare.",
  },
];

export const defaultFunnel: Funnel = {
  id: "know-your-rights-v1",
  entryReelIds: [
    "criminal-defense-police-stop",
    "family-law-custody",
    "business-contract-clauses",
    "estate-planning-will-vs-trust",
    "immigration-interview-prep",
    "civil-litigation-deposition",
  ],
  links: {
    "criminal-defense-police-stop": {
      completed: "criminal-defense-after-arrest",
      skipped: "family-law-custody",
    },
    "criminal-defense-after-arrest": {
      completed: null,
      skipped: "family-law-custody",
    },
    "family-law-custody": {
      completed: "family-law-divorce-steps",
      skipped: "business-contract-clauses",
    },
    "family-law-divorce-steps": {
      completed: null,
      skipped: "business-contract-clauses",
    },
    "business-contract-clauses": {
      completed: null,
      skipped: "estate-planning-will-vs-trust",
    },
    "estate-planning-will-vs-trust": {
      completed: null,
      skipped: "immigration-interview-prep",
    },
    "immigration-interview-prep": {
      completed: null,
      skipped: "civil-litigation-deposition",
    },
    "civil-litigation-deposition": {
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
