// Types for reel funnels. Each funnel is one business's shareable link
// (/f/<slug>): its reels, the paths between them, and its brand.

export type Reel = {
  id: string;
  /** The reel's topic. Must be one of its funnel's brand.services. */
  practiceArea: string;
  title: string;
  summary: string;
  duration?: string;
  /** A short chip beside the topic, e.g. a starting price ("From $12/unit"). */
  badge?: string;
  /** What plays: a video file, a YouTube video, or a photo. Without it, the reel shows "Video coming soon". */
  media?: ReelMedia;
};

export type ReelMedia =
  /** A video file, e.g. { src: "/reels/car-accident.mp4", poster: "/reels/car-accident.jpg", captions: "/reels/car-accident.vtt" }. */
  | { kind: "video"; src: string; poster?: string; captions?: string }
  /** A YouTube video or Short, by its 11-character id. */
  | { kind: "youtube"; id: string }
  /** A photo, shown for a few seconds like a story. */
  | { kind: "image"; src: string };

export type FunnelTrigger = "completed" | "skipped";

/**
 * The main button on every reel. "call" suits urgent needs (an accident just
 * happened); "book" suits people weighing their options. The other one and
 * "Text me later" always sit beside it.
 */
export type FunnelCta = "call" | "book";

/** Color overrides for the funnel's pages; the names are the tokens in globals.css. */
export type FunnelTheme = Partial<
  Record<"--deep-navy" | "--royal-blue" | "--teal-accent" | "--sky-accent" | "--soft-gray", string>
>;

/** Who the funnel belongs to, and the words it uses. */
export type FunnelBrand = {
  name: string;
  /** An image for dark backgrounds, or a text wordmark. */
  logo:
    | { kind: "image"; src: string; width: number; height: number; alt: string }
    | { kind: "wordmark"; text: string; tagline?: string };
  /** Two short lines beside the logo. */
  byline?: [string, string];
  phone: { display: string; href: string };
  theme?: FunnelTheme;
  /** What visitors can ask about. Saved as the lead's case type. */
  services: readonly string[];
  /** Saved word for word with every "text me later" request. */
  smsConsent: string;
  /** Small label at the top of every reel. */
  seriesLabel: string;
  /** Under each reel. */
  disclaimer: string;
  /** Fine print at the foot of the opening screen. */
  footer: string;
  copy: {
    /** Primary button when primaryCta is "book". */
    bookPrimary: string;
    /** Secondary button when primaryCta is "call". */
    callBack: string;
    /** Prefix for the phone button, e.g. "Call now". */
    callNow: string;
    /** Above the phone button on the opening screen. */
    coverCallPrompt: string;
    coverCall: string;
    book: { heading: string; intro: string; submit: string };
    bookDone: (name: string, phone: string) => string;
    textLater: { heading: string; intro: string; submit: string };
    textLaterDone: (name: string, phone: string) => string;
    /** Under the booking form. */
    formFinePrint: string;
    endHeading: string;
    endBody: string;
    shareButton: string;
    shareText: string;
  };
};

export type Funnel = {
  /** Stored with every event; bump it when the paths change so results stay comparable. */
  id: string;
  /** The shareable link: /f/<slug>. Keep it short and never change it once shared. */
  slug: string;
  /**
   * A made-up business for showing the product. Always labeled as such,
   * never indexed, and its forms and tracking never send anything.
   */
  sample?: { notice: string };
  brand: FunnelBrand;
  primaryCta: FunnelCta;
  reels: Reel[];
  /** The opening screen of the shareable link. */
  cover: {
    heading: string;
    intro: string;
    /** Short labels for the entry reels, shown as "What happened?" choices. */
    entryLabels: Record<string, string>;
  };
  /** Reels offered on the opening screen, in order. Every visit starts at one of these. */
  entryReelIds: string[];
  links: Record<string, Record<FunnelTrigger, string | null>>;
};
