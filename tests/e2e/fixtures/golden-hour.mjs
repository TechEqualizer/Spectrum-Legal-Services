// A test-only event link, /f/sundays: Golden Hour Sundays, a made-up
// rooftop day party with several dates (one sold out, one with few tickets
// left, one already over), date reels, a recap and a presale. The visitor
// suites add it to the mock database (POST /__event) before they open it;
// it isn't live, so its forms simulate (nothing is sent) while tracking is real.
//
// Dates are relative to today, so it never goes stale: last Sunday is a
// recap, then the next two Sundays (the second sold out) and a late-night
// special. The ticket links go to example.com, a domain reserved for examples.

export const SLUG = 'sundays';
export const ORGANIZER = 'goldenhour';

/**
 * The Sunday `weeks` from this one, at `hour` local time, as an ISO string.
 * "This one" is today until today's day party is over (3pm, plus the six
 * hours an event counts as on), then next Sunday, so there is always a
 * this-Sunday to sell.
 */
function sunday(weeks, hour) {
  const d = new Date();
  const ahead = (7 - d.getDay()) % 7 || (d.getHours() >= 21 ? 7 : 0);
  d.setDate(d.getDate() + ahead + weeks * 7);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const ticket = (slug) => `https://example.com/tickets/golden-hour/${slug}`;

export function goldenHour() {
  return {
    id: 'sundays-v1',
    slug: SLUG,
    live: false,
    brand: {
      name: 'Golden Hour Sundays',
      logo: { kind: 'wordmark', text: 'Golden Hour', tagline: 'Sundays' },
      handle: '@goldenhour.sundays',
      byline: ['Rooftop day parties', 'Every Sunday · 3pm to sunset'],
      theme: { '--deep-navy': '#1A120D', '--royal-blue': '#3B2316', '--teal-accent': '#B4461A', '--sky-accent': '#F5B85A', '--soft-gray': '#F8F1EA' },
      services: ['Day party', 'Late night', 'Recap', 'The venue', 'Presale'],
      smsConsent: 'I agree that Golden Hour Sundays may text me at this number about presales and upcoming events. Up to 4 messages a month. Msg & data rates may apply. Reply STOP to opt out.',
      seriesLabel: 'Golden Hour · Sundays',
      ageLimit: '21+',
      disclaimer: '21+ with ID. Lineups and set times can change.',
      footer: '21+ with ID. Tickets are sold by our ticketing partner. Lineups and set times can change.',
      copy: {
        ticketsPrimary: 'Get tickets',
        textLaterButton: 'Presale',
        bookPrimary: 'Get tickets',
        callBack: 'Request a call back',
        callNow: 'Call',
        coverCallPrompt: "Already know you're coming?",
        coverCall: 'Get tickets for the next one',
        book: { heading: 'Get tickets', intro: '', submit: 'Continue' },
        bookDone: 'Thanks, {name}.',
        textLater: { heading: 'Get presale access', intro: "We'll text you before tickets go on sale, so you're first in line.", submit: 'Text me the presale' },
        textLaterDone: "You're on the list, {name}. Presale links go to {phone}. Reply STOP any time to opt out.",
        formFinePrint: 'No spam: presales and big announcements only.',
        endHeading: 'See you on the roof?',
        endBody: 'Tickets go fast once the lineup drops. Grab yours, or get first access to the next presale.',
        shareButton: 'Send to the group chat',
        shareText: 'Golden Hour Sundays: rooftop day parties, every Sunday from 3pm to sunset.',
      },
    },
    reels: [
      { id: 'gh-this-sunday', eventId: 'gh-next', practiceArea: 'Day party', title: 'This Sunday on the roof: doors at 2:30', summary: 'Afro-house and amapiano from 3pm until the sun goes down. Early tickets are the cheapest.', badge: 'From $25' },
      { id: 'gh-lineup', eventId: 'gh-next', practiceArea: 'Day party', title: "Who's on the decks this week", summary: 'Three DJs, one sunset. A taste of each set before you decide.' },
      { id: 'gh-last-time', eventId: 'gh-last', practiceArea: 'Recap', title: 'Last Sunday, in 30 seconds', summary: 'The crowd, the views and the moment the sun went down. This is what you missed.', emphasis: 'quiet' },
      { id: 'gh-sold-out', eventId: 'gh-after', practiceArea: 'Day party', title: 'Next Sunday is sold out (join the waitlist)', summary: 'Released tickets go to the waitlist first. Get on it, or grab this Sunday instead.' },
      { id: 'gh-late-night', eventId: 'gh-late', practiceArea: 'Late night', title: 'Golden Hour: Late Night, once a month', summary: 'Same rooftop, after dark. Fewer tickets, longer sets.', badge: 'From $35', emphasis: 'bold' },
      { id: 'gh-venue', practiceArea: 'The venue', title: 'The rooftop: dress code, parking, the view', summary: 'Smart casual, no sportswear. Parking two blocks over. Bring sunglasses.', emphasis: 'quiet' },
      { id: 'gh-presale', practiceArea: 'Presale', title: 'Get first access to the next drop', summary: "Presale opens before every lineup announcement. Tap Presale and we'll text you." },
    ],
    events: [
      { id: 'gh-last', name: 'Golden Hour', startsAt: sunday(-1, 15), venue: 'The Rooftop', price: 'From $25', ticketUrl: ticket('last-week'), status: 'sold_out' },
      { id: 'gh-next', name: 'Golden Hour', startsAt: sunday(0, 15), venue: 'The Rooftop', price: 'From $25', ticketUrl: ticket('this-sunday') },
      { id: 'gh-after', name: 'Golden Hour', startsAt: sunday(1, 15), venue: 'The Rooftop', price: 'From $25', ticketUrl: ticket('next-sunday'), status: 'sold_out' },
      { id: 'gh-late', name: 'Golden Hour: Late Night', startsAt: sunday(2, 20), venue: 'The Rooftop', price: 'From $35', ticketUrl: ticket('late-night'), status: 'few_left' },
    ],
    ticketing: { provider: 'eventbrite' },
    primaryCta: 'tickets',
    cover: {
      heading: 'Which Sunday?',
      intro: 'Tap a date to watch the vibe, then grab tickets in one tap.',
      entryLabels: {},
      hero: {
        title: 'Sundays, on the roof.',
        tagline: 'Afro-house and amapiano from 3pm until the sun goes down.',
        watchLabel: 'Sneak peek inside',
        media: { kind: 'youtube', id: '8U1ok3oEq8Q' },
        zoom: 1.45,
      },
    },
    entryReelIds: ['gh-this-sunday', 'gh-sold-out', 'gh-late-night', 'gh-last-time'],
    links: {
      'gh-this-sunday': { completed: 'gh-lineup', skipped: 'gh-last-time' },
      'gh-lineup': { completed: 'gh-venue', skipped: 'gh-late-night' },
      'gh-last-time': { completed: 'gh-this-sunday', skipped: 'gh-late-night' },
      'gh-sold-out': { completed: 'gh-presale', skipped: 'gh-this-sunday' },
      'gh-late-night': { completed: 'gh-venue', skipped: 'gh-presale' },
      'gh-venue': { completed: null, skipped: 'gh-presale' },
      'gh-presale': { completed: null, skipped: null },
    },
  };
}

/**
 * Adds /f/sundays to the mock database (a suite's mock state starts
 * fresh) and returns the funnel. `change` makes a variant first, e.g. one at
 * another slug with no opening footage.
 */
export async function addGoldenHour(change = (f) => f, mock = 'http://localhost:54321') {
  const data = change(goldenHour());
  const res = await fetch(mock + '/__event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: data.slug, funnel_id: data.id, organizer_slug: ORGANIZER, data }),
  });
  if (!res.ok) throw new Error(`Couldn't add ${data.slug} to the mock: ${res.status}`);
  return data;
}
