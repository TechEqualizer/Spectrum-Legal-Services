// A test-only book-first link, /f/skin-notes: Lumen Skin Studio, a made-up
// clinic whose main action is "Book a free consultation" (not tickets or a
// call). Its reels use every emphasis: builds (the default), quiet and bold.
// The suites add it to the mock database (POST /__event) before they open
// it; it isn't live, so its forms simulate (nothing is sent) while tracking
// is real. The phone number is in the 555-01xx range reserved for fiction.

export const SLUG = 'skin-notes';
export const ORGANIZER = 'lumen';

const phone = { display: '(310) 555-0148', href: 'tel:+13105550148' };

export function bookFirst() {
  return {
    id: 'skin-notes-v1',
    slug: SLUG,
    live: false,
    brand: {
      name: 'Lumen Skin Studio',
      logo: { kind: 'wordmark', text: 'Lumen', tagline: 'Skin Studio' },
      handle: '@lumen.skin',
      byline: ['Injectables · Skin · Laser', 'Free consultations'],
      phone,
      theme: { '--deep-navy': '#2A1B22', '--royal-blue': '#4B2B3A', '--teal-accent': '#A4405C', '--sky-accent': '#E9B9BE', '--soft-gray': '#F7F1EE' },
      services: ['Wrinkle Relaxers', 'Lip Filler', 'Facials', 'Microneedling', 'Laser Hair Removal', 'Consultation'],
      smsConsent: 'I agree that Lumen Skin Studio may text me at this number about my question, including links to short videos. Up to 4 messages. Msg & data rates may apply. Reply STOP to opt out. Consent is not required to book.',
      seriesLabel: 'Lumen · Skin Notes',
      disclaimer: 'General information only, not medical advice. Results vary from person to person. Every treatment starts with a consultation.',
      footer: 'General information only, not medical advice. Results vary. Treatments are performed by licensed providers after a consultation.',
      copy: {
        bookPrimary: 'Book a free consultation',
        callBack: 'Request a call back',
        callNow: 'Call',
        coverCallPrompt: 'Questions first?',
        coverCall: `Call or text ${phone.display}`,
        book: { heading: 'Book a free consultation', intro: "Leave your number and we'll call you to find a time that works.", submit: 'Request my consultation' },
        bookDone: "Thanks, {name}. We'll call you at {phone} to set up your consultation.",
        textLater: { heading: 'Still deciding?', intro: "We'll text you the next video, so you can keep watching when it suits you.", submit: 'Text me the next video' },
        textLaterDone: 'Thanks, {name}. The next video is on its way to {phone}. Reply STOP any time to opt out.',
        formFinePrint: "Consultations are free and there's no obligation to book a treatment.",
        endHeading: 'Ready to talk it through?',
        endBody: 'Every face and every skin is different. A free consultation is the best way to plan what\'s right for you.',
        shareButton: 'Send to a friend',
        shareText: 'Short videos from Lumen Skin Studio on injectables, skin and laser.',
      },
    },
    reels: [
      { id: 'ms-wrinkle-relaxers-first-time', badge: 'From $12/unit', practiceArea: 'Wrinkle Relaxers', title: 'First time trying Botox? What the visit is like', summary: 'The consultation, the injections themselves, and how long results usually take to show.' },
      { id: 'ms-natural-results', emphasis: 'quiet', badge: 'From $12/unit', practiceArea: 'Wrinkle Relaxers', title: 'Will I look frozen? How we keep it natural', summary: 'Why dosing and placement matter, and how your provider plans a look that still moves like you.' },
      { id: 'ms-lip-filler', badge: 'From $650', practiceArea: 'Lip Filler', title: 'Lip filler that still looks like you', summary: 'Subtle or fuller, how much people usually start with, and why going slowly pays off.' },
      { id: 'ms-filler-aftercare', emphasis: 'quiet', badge: 'Aftercare', practiceArea: 'Lip Filler', title: 'Swelling, bruising and aftercare: the honest version', summary: "What's normal in the first few days, what to skip before and after, and when to call us." },
      { id: 'ms-glow-facial', badge: '$185', practiceArea: 'Facials', title: 'The facial people book before big events', summary: 'What happens in a hydrating facial, who it suits, and how far ahead of an event to book.' },
      { id: 'ms-microneedling', badge: '$350/session', practiceArea: 'Microneedling', title: 'Microneedling for acne scars: what to expect', summary: 'How it works, how many sessions people usually plan for, and what skin looks like the next day.' },
      { id: 'ms-laser-hair', badge: 'Packages', practiceArea: 'Laser Hair Removal', title: 'Laser hair removal: why it takes several sessions', summary: 'Hair grows in cycles, so treatments are spaced out. What a typical plan looks like.' },
      { id: 'ms-pricing', emphasis: 'bold', badge: 'Free consult', practiceArea: 'Consultation', title: 'How pricing works, with no surprises', summary: 'Per unit, per syringe or per session: how treatments are priced and what your consultation covers.' },
      { id: 'ms-consultation', emphasis: 'bold', badge: 'Free', practiceArea: 'Consultation', title: 'What happens at your free consultation', summary: "Who you'll meet, what we'll ask, and how we plan together. There's no pressure to book a treatment." },
    ],
    primaryCta: 'book',
    cover: {
      heading: 'What are you curious about?',
      intro: "Pick one. Short videos from our providers, then book a free consultation when you're ready.",
      entryLabels: {
        'ms-wrinkle-relaxers-first-time': 'Fine lines and wrinkles',
        'ms-lip-filler': 'Lip filler',
        'ms-glow-facial': 'Glowing skin',
        'ms-microneedling': 'Acne scars',
        'ms-laser-hair': 'Laser hair removal',
      },
    },
    entryReelIds: ['ms-wrinkle-relaxers-first-time', 'ms-lip-filler', 'ms-glow-facial', 'ms-microneedling', 'ms-laser-hair'],
    // Each topic goes deeper when watched, then to pricing and the consultation
    // reel before the end card; skipping moves to the next topic.
    links: {
      'ms-wrinkle-relaxers-first-time': { completed: 'ms-natural-results', skipped: 'ms-lip-filler' },
      'ms-natural-results': { completed: 'ms-pricing', skipped: 'ms-lip-filler' },
      'ms-lip-filler': { completed: 'ms-filler-aftercare', skipped: 'ms-glow-facial' },
      'ms-filler-aftercare': { completed: 'ms-pricing', skipped: 'ms-glow-facial' },
      'ms-glow-facial': { completed: 'ms-consultation', skipped: 'ms-microneedling' },
      'ms-microneedling': { completed: 'ms-consultation', skipped: 'ms-laser-hair' },
      'ms-laser-hair': { completed: 'ms-pricing', skipped: 'ms-consultation' },
      'ms-pricing': { completed: 'ms-consultation', skipped: 'ms-consultation' },
      'ms-consultation': { completed: null, skipped: null },
    },
  };
}

/** Adds /f/skin-notes to the mock database (a suite's mock state starts fresh) and returns the funnel. */
export async function addBookFirst(mock = 'http://localhost:54321') {
  const data = bookFirst();
  const res = await fetch(mock + '/__event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: data.slug, funnel_id: data.id, organizer_slug: ORGANIZER, data }),
  });
  if (!res.ok) throw new Error(`Couldn't add ${data.slug} to the mock: ${res.status}`);
  return data;
}
