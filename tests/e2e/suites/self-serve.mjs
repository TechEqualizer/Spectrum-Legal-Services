// An organizer's own login: they see only their events, add and duplicate
// them, and publish them, but nothing of anyone else's.
import { chromium, settle } from '../browser.mjs';
import { addGoldenHour } from '../fixtures/golden-hour.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
// Another organizer's event, for "nobody else's" below.
await addGoldenHour();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Detroit' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));

const login = await ctx.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check('organizer signs in', login.ok(), String(login.status()));

// 1. Only their events. (Events other suites made
// may still be in the app's event list cache: they're Big Love's too.)
await p.goto(B + '/admin/events'); await settle(p, 1200);
check('sees their event', await p.getByRole('button', { name: 'Open Masquerade on the Runway' }).first().isVisible());
check('no demos, nobody else\'s events', await p.getByRole('region', { name: 'Demos' }).count() === 0 && !(await p.locator('main').innerText()).includes('Golden Hour'));
const groupsOf = () => p.locator('#admin-business optgroup').evaluateAll((gs) => gs.map((g) => g.label));
const options = await groupsOf();
// With one event there's no switcher at all; with more, only their own client.
check('nothing else to switch to', options.every((o) => o === 'Big Love Productions'), options.join(' | '));
check('can add events', await p.getByRole('button', { name: 'New event' }).isVisible() && await p.getByRole('button', { name: 'Duplicate Masquerade on the Runway' }).first().isVisible());

// 2. New event from their login: it's theirs to edit and publish.
await p.getByRole('button', { name: 'New event' }).click();
const sheet = p.locator('dialog[open]');
await sheet.getByLabel('Event name').fill('Spring Gala');
await sheet.getByRole('button', { name: 'Create event' }).click();
await p.waitForURL(/\/admin$/); await settle(p, 1500);
const now = await groupsOf();
const names = await p.locator('#admin-business option').allTextContents();
check('new event opens in their studio, beside only their own', (await p.locator('#admin-business').inputValue()) === 'spring-gala' && names.includes('Spring Gala') && now.length === 1 && now[0] === 'Big Love Productions', now.join(' | ') + ' / ' + names.join(' | '));
await p.keyboard.press('Escape');
const reel = { id: 'spring-gala-welcome', practiceArea: 'The night', title: 'Spring Gala', summary: 'Details coming soon.', cta: 'funnel' };
const pub = await p.request.post(B + '/api/admin/publish', { data: { slug: 'spring-gala', publication: {
  version: 1, reels: [reel], funnel: { order: [reel.id], topics: {}, paths: {}, primaryCta: 'tickets' },
} } });
check('publishes the event they made', pub.ok(), String(pub.status()));

// 3. Nobody else's: not another organizer's event (Golden Hour's, added to the database above).
const other = await p.request.post(B + '/api/admin/publish', { data: { slug: 'sundays', publication: {
  version: 1, reels: [], funnel: { order: [], topics: {}, paths: {}, primaryCta: 'tickets' },
} } });
check("can't publish another organizer's event", other.status() === 403 || other.status() === 404, String(other.status()));
const fromOther = await p.request.post(B + '/api/admin/events', { data: { source: 'sundays', name: 'Mine now', slug: 'mine-now', mode: 'copy' } });
check("can't copy a funnel that isn't theirs", fromOther.status() === 400 || fromOther.status() === 403, String(fromOther.status()));
await p.goto(B + '/admin/preview/sundays'); await settle(p, 500);
check("can't preview another organizer's event", (await p.locator('body').innerText()).includes('404') || (await p.title()).includes('404'));
const theirLeads = await p.request.get(B + '/api/admin/leads?slug=sundays');
check("can't see another organizer's leads", theirLeads.status() === 404, String(theirLeads.status()));
const ownLeads = await p.request.get(B + '/api/admin/leads?slug=masquerade');
check('sees their own leads', ownLeads.ok() && Array.isArray(await ownLeads.json()), String(ownLeads.status()));

// 4. The bio link keeps showing the one dated night until the new event gets a date.
const v = await (await b.newContext()).newPage();
await v.goto(B + '/f/biglove'); await settle(v, 1000);
check('bio link unchanged until the new event has a date', /masquerade on the runway/i.test(await v.locator('h1').innerText()));

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
