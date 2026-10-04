// Several events per organizer: the Events page, New event and Duplicate,
// each event's own link, and the organizer's permanent (bio) link.
import { chromium } from 'playwright';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, timezoneId: 'America/Detroit' });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: B });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const visitor = await (await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Detroit' })).newPage();
visitor.on('pageerror', (e) => errs.push(e.message));

// 1. The bio link with one upcoming event shows that event.
await visitor.goto(B + '/f/biglove'); await visitor.waitForTimeout(1200);
check('bio link shows the only upcoming event', (await visitor.locator('h1').innerText()).toLowerCase().includes('masquerade on the runway'));

// 2. Events page
await p.goto(B + '/admin/events'); await p.waitForTimeout(1200);
check('Events is the first tab', (await p.locator('nav ul a').first().textContent()).includes('Events') && await p.locator('nav ul a', { hasText: 'Paths' }).count() === 0);
check('page title matches the tab', (await p.getByRole('heading', { level: 1 }).textContent()).trim() === 'Events');
const org = p.getByRole('region', { name: 'Big Love Productions' });
check('event listed under its organizer, upcoming', await org.getByRole('button', { name: 'Open Masquerade on the Runway' }).isVisible() && await org.getByText('Upcoming').isVisible());
check('bio link shown', await org.getByText('/f/biglove').isVisible());
check('demos listed apart', await p.getByRole('region', { name: 'Demos' }).getByRole('button', { name: /^Open / }).count() === 2);
await p.screenshot({ path: S + '/events-390.jpg', fullPage: true });

// 3. New event: name → link, then the studio opens on Import flyer.
await p.getByRole('button', { name: 'New event' }).click();
const sheet = p.locator('dialog[open]');
await sheet.getByLabel('Event name').fill("New Year's Masquerade");
check('link follows the name', (await sheet.getByLabel('Link').inputValue()) === 'new-years-masquerade');
await p.screenshot({ path: S + '/new-event-390.jpg' });
await sheet.getByRole('button', { name: 'Create event' }).click();
await p.waitForURL(/\/admin$/); await p.waitForTimeout(1500);
check('studio opens on Import flyer', await p.locator('dialog[open]').getByRole('heading', { name: 'Import from flyer' }).isVisible());
check('new event selected', (await p.locator('#admin-business').inputValue()) === 'new-years-masquerade');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// 4. Its own link: the organizer's look, its own name, no old facts.
await visitor.goto(B + '/f/new-years-masquerade'); await visitor.waitForTimeout(1200);
const body = await visitor.locator('body').innerText();
check('new event link works', body.toLowerCase().includes("new year's masquerade") && body.includes('Big Love'));
check('fresh event carries none of the old facts', !/30\+|\$31|Oct 31|1600 East Grand/.test(body), body.slice(0, 200));

// 5. Two upcoming events: the bio link becomes a choice, soonest first.
const reel = { id: 'new-years-masquerade-welcome', practiceArea: 'The night', title: "New Year's Masquerade", summary: 'Details coming soon.', cta: 'funnel', eventId: 'nye' };
const pub = await p.request.post(B + '/api/admin/publish', { data: { slug: 'new-years-masquerade', publication: {
  version: 1, reels: [reel], funnel: { order: [reel.id], topics: {}, paths: {}, primaryCta: 'tickets' },
  events: [{ id: 'nye', name: "New Year's Masquerade", startsAt: '2026-12-31T21:00:00-05:00', venue: 'Detroit', price: 'From $45', ticketUrl: 'https://example.com/nye' }],
} } });
check('date published for the new event', pub.ok(), String(pub.status()));
await visitor.goto(B + '/f/biglove'); await visitor.waitForTimeout(1500);
const cards = visitor.getByRole('listitem');
const names = await cards.allInnerTexts();
check('bio link offers both nights', names.length === 2, String(names.length));
check('soonest first', /masquerade on the runway/i.test(names[0] ?? '') && /new year/i.test(names[1] ?? ''), names.join(' | '));
check('dates in the visitor\'s time', (names[0] ?? '').includes('Sat, Oct 31 · 8 PM') && (names[1] ?? '').includes('Thu, Dec 31 · 9 PM'), names.join(' | '));
check('fits the phone', await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await visitor.screenshot({ path: S + '/bio-link-choice-390.jpg', fullPage: true });
await cards.nth(1).getByRole('link').click(); await visitor.waitForURL(/\/f\/new-years-masquerade/);
check('a card opens its night', true);

// 6. Duplicate keeps the reels, drops the dates.
await p.goto(B + '/admin/events'); await p.waitForTimeout(1200);
await p.getByRole('button', { name: 'Duplicate Masquerade on the Runway' }).click();
check('duplicate prefilled', (await sheet.getByLabel('Event name').inputValue()) === 'Masquerade on the Runway (copy)' && (await sheet.getByLabel('Link').inputValue()) === 'masquerade-2');
await sheet.getByRole('button', { name: 'Duplicate', exact: true }).click();
await p.waitForURL(/\/admin$/); await p.waitForTimeout(1500);
check('duplicate opens in the studio', (await p.locator('#admin-business').inputValue()) === 'masquerade-2' && await p.locator('dialog[open]').count() === 0);
check('duplicate keeps the reels', await p.locator('section[aria-labelledby="order-title"] ol > li').count() === 5);

// 7. A taken link is explained, and nothing is made.
await p.goto(B + '/admin/events'); await p.waitForTimeout(1000);
await p.getByRole('button', { name: 'New event' }).click();
await sheet.getByLabel('Event name').fill('Masquerade');
await sheet.getByRole('button', { name: 'Create event' }).click(); await p.waitForTimeout(800);
check('taken link explained', await sheet.getByRole('alert').filter({ hasText: '/f/masquerade is taken' }).isVisible());
await sheet.getByRole('button', { name: 'Cancel' }).click();
const anon = await visitor.request.post(B + '/api/admin/events', { data: { source: 'masquerade', name: 'X', slug: 'x', mode: 'fresh' } });
check('signed-out create refused', anon.status() === 401);

// 8. Share shows the bio link; Paths is a link from the studio.
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(500);
await p.goto(B + '/admin/links'); await p.waitForTimeout(1000);
check('Share shows the bio link', await p.getByRole('region', { name: 'Your bio link' }).getByText('/f/biglove').isVisible());
await p.goto(B + '/admin'); await p.waitForTimeout(1200);
await p.getByText('Funnel settings').click();
await p.getByRole('link', { name: 'See every path' }).click(); await p.waitForURL(/\/admin\/funnel/);
check('Paths reachable from the studio', true);

const wide = await (await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 }, timezoneId: 'America/Detroit' })).newPage();
await wide.goto(B + '/admin/events'); await wide.waitForTimeout(1200);
await wide.screenshot({ path: S + '/events-1440.jpg' });
check('desktop: no sideways scroll', await wide.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
