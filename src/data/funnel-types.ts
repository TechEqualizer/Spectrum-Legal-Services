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
  /**
   * How hard the reel sells. "builds" (the default) starts with a quiet
   * Book and fills it with the brand color partway through, like the
   * call-to-action strip on a sponsored reel. "quiet" keeps it quiet for
   * the whole reel (teaching reels); "bold" highlights it from the start
   * (pricing, consultation).
   */
  emphasis?: ReelEmphasis;
  /**
   * The event this reel promotes. Once the event is over, the reel becomes
   * a recap and its Tickets button points at the next event.
   */
  eventId?: string;
};

/** One date of an event series, sold on the organizer's own ticketing page. */
export type FunnelEvent = {
  id: string;
  name: string;
  /** ISO date and time, with offset, e.g. "2026-10-12T15:00:00-07:00". */
  startsAt: string;
  venue?: string;
  /** "From $25", "Free", ... */
  price?: string;
  ticketUrl: string;
  status?: "on_sale" | "few_left" | "sold_out";
  /**
   * The reel this date's circle opens. Without it (or if that reel is gone),
   * the first reel whose eventId is this date.
   */
  reelId?: string;
};

export type ReelEmphasis = "quiet" | "builds" | "bold";

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
export type FunnelCta = "call" | "book" | "tickets";

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
  /** Shown beside the avatar on each reel, like a channel name ("@aurelia.medspa"); defaults to the name. */
  handle?: string;
  /** Two short lines beside the logo. */
  byline?: [string, string];
  /** Optional for event organizers; without it, Call buttons are hidden. */
  phone?: { display: string; href: string };
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
    /** Main button when primaryCta is "tickets" (default "Get tickets"). */
    ticketsPrimary?: string;
    /** "Text me later" on the rail and end card ("Presale" for events). */
    textLaterButton?: string;
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
  sample?: {
    notice: string;
    /**
     * A private demo made for one prospect ("Prepared for Golden Hour").
     * Shown on the opening screen and in the link preview.
     */
    preparedFor?: string;
  };
  brand: FunnelBrand;
  primaryCta: FunnelCta;
  reels: Reel[];
  /** Event dates, for event organizers. The opening screen lists the upcoming ones. */
  events?: FunnelEvent[];
  /** Where tickets are sold, so ticket links get that platform's tracking codes. */
  ticketing?: { provider: "eventbrite" | "posh" | "dice" | "other" };
  /** The opening screen of the shareable link. */
  cover: {
    heading: string;
    intro: string;
    /** Short labels for the entry reels, shown as "What happened?" choices. */
    entryLabels: Record<string, string>;
    /**
     * What plays behind the opening screen's title, overriding the default
     * (hero.media, else the first reel's media). null shows none: the
     * brand-color glow. Set by the admin's opening-screen editor.
     */
    backdrop?: ReelMedia | null;
    /**
     * A full-height opening scene above the choices, like a film's title
     * card: the title and tagline over footage, with Watch and Get tickets
     * (or Call) buttons. Without it, the heading and intro sit over a
     * shorter scene and the choices come right after.
     */
    hero?: {
      title: string;
      tagline?: string;
      /** Label on the Watch button (default "Watch"). */
      watchLabel?: string;
      /**
       * What plays behind the title, muted and looping: a video file, a
       * YouTube video or Short, or a photo. Defaults to the first reel with
       * media; without any, a moving glow in the brand colors.
       */
      media?: ReelMedia;
      /**
       * How far to zoom a YouTube backdrop (default 1.2). Raise it to crop
       * black bars burned into the video itself.
       */
      zoom?: number;
    };
  };
  /** Reels offered on the opening screen, in order. Every visit starts at one of these. */
  entryReelIds: string[];
  links: Record<string, Record<FunnelTrigger, string | null>>;
};
