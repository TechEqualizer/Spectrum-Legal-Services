// The link preview card: the event's art with a play button, the date and
// where tickets stand, and the same words under it. A link that opens on a
// reel (?start=) previews that reel, for link-preview crawlers only.
import { writeFileSync } from 'node:fs';
import { chromium } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const FB = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const b = await chromium.launch();

const admin = await b.newContext({ storageState: S + '/auth.json' });
const made = await admin.request.post(B + '/api/admin/events', { data: { source: 'masquerade', name: 'Card Night', slug: 'card-night', mode: 'fresh' } });
check('event made', made.status() === 201, String(made.status()));
const reels = [
  { id: 'cn-flyer', practiceArea: 'The night', title: 'Masks on. Secrets revealed.', summary: 'Halloween night, behind a mask.', cta: 'funnel', eventId: 'cn', media: { kind: 'image', src: B + '/clients/masquerade/masks-on.jpg' } },
  { id: 'cn-runway', practiceArea: 'The night', title: 'Haute couture Halloween looks', summary: 'Fantasy meets fashion.', cta: 'funnel', eventId: 'cn', media: { kind: 'image', src: B + '/clients/masquerade/runway.jpg' } },
];
const publish = (status, list = reels) => admin.request.post(B + '/api/admin/publish', { data: { slug: 'card-night', publication: {
  version: 1, reels: list, funnel: { order: list.map((r) => r.id), topics: {}, paths: {}, primaryCta: 'tickets' },
  events: [{ id: 'cn', name: 'Card Night', startsAt: '2026-12-31T20:00:00-05:00', timeZone: 'America/Detroit', venue: '1600 East Grand Blvd, Detroit', ticketUrl: 'https://example.com/cn', ...(status ? { status } : {}) }],
} } });
const first = await publish();
check('published', first.ok(), `${first.status()} ${(await first.text()).slice(0, 200)}`);

const meta = (html, prop) => new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`).exec(html)?.[1]?.replace(/&amp;/g, '&');
const page = async (path, ua) => (await admin.request.get(B + path, { headers: ua ? { 'user-agent': ua } : {} })).text();
const png = async (url, name) => {
  const r = await admin.request.get(url.replace(/^https?:\/\/[^/]+/, B));
  const body = await r.body();
  if (name) writeFileSync(`${S}/${name}.png`, body);
  // PNG size: bytes 16-23.
  if (body.length < 24) return { ok: false, status: r.status(), body: body.toString().slice(0, 200) };
  return { ok: r.ok() && r.headers()['content-type'] === 'image/png', w: body.readUInt32BE(16), h: body.readUInt32BE(20) };
};

// The event's own link.
{
  const html = await page('/f/card-night', FB);
  const image = meta(html, 'og:image');
  const desc = meta(html, 'og:description');
  check('card: an image', Boolean(image), image);
  check('words: date, city, tickets', /Thu, Dec 31 · 8 PM · Detroit · Tickets on sale/.test(desc ?? ''), desc);
  const card = await png(image, 'share-card-event');
  check('card: 1200×630 PNG', card.ok && card.w === 1200 && card.h === 630, JSON.stringify(card));
}

// A link that opens on a reel: crawlers see that reel; visitors get the link as usual.
{
  const html = await page('/f/card-night?src=instagram&start=cn-runway', FB);
  const image = meta(html, 'og:image');
  check('reel link: its own card', /\/f\/card-night\/r\/cn-runway\/opengraph-image/.test(image ?? ''), image);
  check('reel link: its title', /^Haute couture Halloween looks/.test(meta(html, 'og:title') ?? ''), meta(html, 'og:title'));
  check('reel link: a whole page for crawlers', /<\/html>/.test(html) && !/Application error|Internal Server Error/.test(html));
  const card = await png(image, 'share-card-reel');
  check('reel card: 1200×630 PNG', card.ok && card.w === 1200 && card.h === 630, JSON.stringify(card));
  const human = await page('/f/card-night?start=cn-runway');
  check('reel link: visitors get the event card', !/\/r\/cn-runway\//.test(meta(human, 'og:image') ?? ''), meta(human, 'og:image'));
  const odd = await page('/f/card-night?start=nope', FB);
  check('unknown reel: still a card', Boolean(meta(odd, 'og:image')) && /Card Night|Masquerade/.test(meta(odd, 'og:title') ?? ''), meta(odd, 'og:title'));
}

// Few tickets left shows once published.
{
  await publish('few_left');
  const desc = meta(await page('/f/card-night', FB), 'og:description');
  check('few left: in the words', /Few tickets left/.test(desc ?? ''), desc);
  await png(meta(await page('/f/card-night', FB), 'og:image'), 'share-card-few-left');
}

// No art at all: still a card, with the title and date.
{
  await publish(undefined, reels.map((r) => ({ ...r, media: undefined })));
  const card = await png(meta(await page('/f/card-night', FB), 'og:image'), 'share-card-no-art');
  check('no art: still a card', card.ok && card.w === 1200, JSON.stringify(card));
}

await admin.close(); await b.close();
console.log(res.join('\n'));
