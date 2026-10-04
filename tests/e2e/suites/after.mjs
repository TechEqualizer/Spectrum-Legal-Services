// After the night: once every date is over, a link thanks people, plays the
// recap, and sends them to the organizer's next night (or takes their number
// for it), instead of selling tickets that are gone.
import { chromium } from 'playwright';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const admin = await b.newContext({ storageState: S + '/auth.json' });
const errs = [];

// An earlier Big Love night whose date has passed; Masquerade (Oct 31) is their next.
const made = await admin.request.post(B + '/api/admin/events', { data: { source: 'masquerade', name: 'Summer Soiree', slug: 'summer-soiree', mode: 'fresh' } });
check('past event made', made.status() === 201, String(made.status()));
const reel = { id: 'summer-soiree-recap', practiceArea: 'The night', title: 'Summer Soiree recap', summary: 'What a night.', cta: 'funnel', eventId: 'soiree' };
const pub = await admin.request.post(B + '/api/admin/publish', { data: { slug: 'summer-soiree', publication: {
  version: 1, reels: [reel], funnel: { order: [reel.id], topics: {}, paths: {}, primaryCta: 'tickets' },
  events: [{ id: 'soiree', name: 'Summer Soiree', startsAt: '2026-08-15T21:00:00-04:00', venue: 'Detroit', ticketUrl: 'https://example.com/soiree' }],
} } });
check('its date published', pub.ok(), String(pub.status()));

const v = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Detroit' })).newPage();
v.on('pageerror', (e) => errs.push(e.message));
await v.clock.install();
await v.goto(B + '/f/summer-soiree?src=instagram'); await v.waitForTimeout(1500);
const body = await v.locator('body').innerText();
check('thanks people', /thanks for coming · sat, aug 15/i.test(body), body.slice(0, 160));
check('words about the night, not tickets', body.includes("Relive the night, then see what's next.") && !/grab tickets/i.test(body));
check('recap is the main button', await v.getByRole('button', { name: 'Watch the recap' }).isVisible());
check('no tickets for a night that is over', await v.getByRole('link', { name: /tickets/i }).count() === 0);
const nextLink = v.getByRole('link', { name: /^Next: Masquerade on the Runway/ });
check('points to their next night', await nextLink.isVisible() && body.includes('Next up: Masquerade on the Runway'));
check('next night keeps the source', (await nextLink.getAttribute('href')) === '/f/masquerade?src=instagram', await nextLink.getAttribute('href'));
await v.screenshot({ path: S + '/after-390.jpg' });

// The recap's end card says the same.
await v.getByRole('button', { name: 'Watch the recap' }).click(); await v.waitForTimeout(800);
await v.clock.runFor(15000); await v.waitForTimeout(600);
const end = await v.locator('body').innerText();
check('end card thanks and points on', end.includes('Thanks for coming') && end.includes('Next up: Masquerade on the Runway'));
check('end card links the next night', await v.getByRole('link', { name: 'See the next night' }).isVisible());
await v.screenshot({ path: S + '/after-end-390.jpg' });

// Weeks later, Masquerade is over too: nothing next yet, so Updates.
const later = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Detroit' });
const w = await later.newPage();
await w.clock.setFixedTime(new Date('2026-11-20T12:00:00-05:00'));
w.on('pageerror', (e) => errs.push(e.message));
await w.goto(B + '/f/summer-soiree'); await w.waitForTimeout(1500);
check('nothing next: no next link', await w.getByRole('link', { name: /^Next:/ }).count() === 0);
await w.getByRole('button', { name: 'Updates' }).click(); await w.waitForTimeout(500);
check('updates sign-up for the next night', await w.getByRole('heading', { name: 'Hear about the next night' }).isVisible());

// An upcoming event is unchanged.
await v.goto(B + '/f/masquerade'); await v.waitForTimeout(1200);
check('upcoming event still sells tickets', !(await v.locator('body').innerText()).includes('Thanks for coming') && await v.getByRole('link', { name: /tickets/i }).count() > 0);

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
