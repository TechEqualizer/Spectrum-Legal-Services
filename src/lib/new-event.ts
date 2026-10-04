// A new event for an organizer, made from one of their events.
//
// "fresh" keeps only who the organizer is (name, logo, colors, title
// typeface, ticketing platform) and starts the event's words over, because
// the source's words carry its own facts (its date, prices, age limit, dress
// code). The studio then fills it from the new flyer: Import flyer for the
// dates and look, Draft my funnel for the reels.
//
// "copy" (Duplicate) keeps everything the visitor sees, as published, for a
// night that repeats; only its dates go, since they're over.

import type { Funnel, FunnelBrand } from "@/data/funnel-types";

export type NewEventMode = "fresh" | "copy";

export const EVENT_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/** A link from an event's name: "Masquerade on the Runway" → "masquerade-on-the-runway". */
export function slugFromName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}

/** The words an event funnel starts with, in the organizer's name. */
function freshCopy(brandName: string, name: string): FunnelBrand["copy"] {
  return {
    ticketsPrimary: "Get tickets",
    textLaterButton: "Updates",
    bookPrimary: "Get tickets",
    callBack: "Request a call back",
    callNow: "Call",
    coverCallPrompt: "Already know you're coming?",
    coverCall: "Get your tickets",
    book: { heading: "Get tickets", intro: "", submit: "Continue" },
    bookDone: "Thanks, {name}.",
    textLater: {
      heading: "Get event updates",
      intro: "We'll text you the news and any last tickets.",
      submit: "Text me updates",
    },
    textLaterDone: "You're on the list, {name}. Updates go to {phone}. Reply STOP any time to opt out.",
    formFinePrint: "No spam: event updates only.",
    endHeading: "See you there?",
    endBody: "Tickets are limited. Grab yours before they're gone.",
    shareButton: "Send to the group chat",
    shareText: `${name}, by ${brandName}.`,
  };
}

export function newEventFrom(source: Funnel, { slug, name }: { slug: string; name: string }, mode: NewEventMode): Funnel {
  const { brand } = source;
  const base = {
    id: `${slug}-v1`,
    slug,
    ...(source.live ? { live: true } : {}),
    primaryCta: "tickets" as const,
    ...(source.ticketing ? { ticketing: source.ticketing } : {}),
    events: [],
  };

  if (mode === "copy") {
    const copy: Funnel = structuredClone({ ...source, ...base });
    delete copy.sample;
    // Its dates are over; the byline usually names one of them.
    delete copy.brand.byline;
    // Text naming the old event names the new one; consent is saved word for word with each sign-up.
    const rename = (text: string) => text.split(source.brand.seriesLabel).join(name);
    copy.brand.smsConsent = rename(copy.brand.smsConsent);
    // The share text usually names the old date, so it starts over.
    copy.brand.copy.shareText = `${name}, by ${brand.name}.`;
    copy.brand.seriesLabel = name;
    copy.reels = copy.reels.map((reel) => {
      const r = { ...reel };
      delete r.eventId;
      return r;
    });
    if (copy.cover.hero) copy.cover.hero.title = name;
    return copy;
  }

  const services = ["The night", "Tickets"];
  const welcome = `${slug}-welcome`;
  return {
    ...base,
    brand: {
      name: brand.name,
      logo: brand.logo,
      ...(brand.handle ? { handle: brand.handle } : {}),
      ...(brand.phone ? { phone: brand.phone } : {}),
      ...(brand.theme ? { theme: { ...brand.theme } } : {}),
      services,
      smsConsent: `I agree that ${brand.name} may text me at this number about ${name} and upcoming events. Up to 4 messages a month. Msg & data rates may apply. Reply STOP to opt out.`,
      seriesLabel: name,
      disclaimer: "Details can change. Your ticket page has the latest.",
      footer: `Tickets are sold by ${brand.name}'s ticketing partner.`,
      copy: freshCopy(brand.name, name),
    },
    reels: [{ id: welcome, practiceArea: services[0], title: name, summary: "Details coming soon." }],
    cover: {
      heading: "Which night?",
      intro: "Tap a date to watch, then grab tickets in one tap.",
      entryLabels: {},
      ...(source.cover.titleFont ? { titleFont: source.cover.titleFont } : {}),
      hero: { title: name, watchLabel: "Sneak peek inside" },
    },
    entryReelIds: [welcome],
    links: { [welcome]: { completed: null, skipped: null } },
  };
}
