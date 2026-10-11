// Pay to go live (docs/plans/03-billing.md): an organizer who hasn't paid
// builds everything, but the public meets "Coming soon" at their link, with
// nothing about the night (no preview card, calendar or reel pages). Signed
// in, they see the real link at /admin/link/<slug> with Go live over it. Paying
// on Stripe's page (the mock) puts the link live; canceling takes it back to
// Coming soon. Big Love stands in, its plan cleared for this suite.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: 'biglove', ...row }) });
// Plans are kept a second in the tests, and pages rebuild in the background: look until it shows (or give up).
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn().catch(() => false); if (v) return v; await new Promise((r) => setTimeout(r, 700)); } return v; };
const TITLE = /Masquerade on the Runway/i;

const b = await chromium.launch();
const errs = [];
await setPlan({});

// The public: Coming soon, under the organizer's name, at the event's and the organizer's links.
const fan = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const f = await fan.newPage(); f.on('pageerror', (e) => errs.push(e.message));
const soon = async (path) => {
  await f.goto(B + path); await settle(f, 800);
  return (await f.getByText('Coming soon', { exact: true }).isVisible()) && !TITLE.test(await f.locator('body').innerText());
};
check('not live: the event link says Coming soon, nothing about the night', await until(() => soon('/f/masquerade')));
check('under the organizer\'s name', await f.getByRole('heading', { level: 1, name: 'Big Love Productions' }).isVisible());
check('not indexed, titled Coming soon', (await f.locator('meta[name=robots]').getAttribute('content'))?.includes('noindex') && /Coming soon/.test(await f.title()), await f.title());
check('the organizer link too', await until(() => soon('/f/biglove')));
await f.screenshot({ path: 'go-live-coming-soon-390.png' });
const status = async (path) => (await fetch(B + path)).status;
const cardBytes = async () => { const r = await fetch(B + '/f/masquerade/opengraph-image'); return r.ok && r.headers.get('content-type') === 'image/png' ? Buffer.from(await r.arrayBuffer()).toString('base64') : null; };
const soonCard = await cardBytes();
check('its preview card says Coming soon (an image, not an error)', Boolean(soonCard));
check('no calendars before it is live', (await status('/f/biglove/calendar.ics')) === 404 && (await status('/f/masquerade/calendar.ics')) === 404);
await f.goto(B + '/f/masquerade/r/mr-masks-on'); await settle(f, 500);
check('a reel\'s link page says Coming soon too', await f.getByText('Coming soon', { exact: true }).isVisible() && !TITLE.test(await f.locator('body').innerText()));
await f.goto(B + '/f/biglove'); await settle(f, 500);
const preview = f.getByRole('link', { name: 'Is this your link? Preview it' });
check('the organizer can preview it from here', (await preview.getAttribute('href')) === '/admin/link/biglove');
await preview.click(); await f.waitForURL(/\/admin\/login/, { timeout: 8000 }).catch(() => {});
check('signed out: sign in first, then back to the preview', new URL(f.url()).searchParams.get('next') === '/admin/link/biglove', f.url());
await fan.close();

// The organizer, signed in: the real link, only for them, with Go live.
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/link/masquerade'); await settle(p, 1500);
const bar = p.getByRole('status').filter({ hasText: 'Only you can see this' });
check('their preview: the real link', TITLE.test(await p.locator('body').innerText()));
check('marked as theirs alone, with Go live', await bar.isVisible() && (await bar.getByRole('link', { name: 'Go live' }).getAttribute('href')) === '/admin/settings#plan');
await p.screenshot({ path: 'go-live-preview-1279.png' });
const phone = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await phone.goto(B + '/admin/link/masquerade'); await settle(phone, 1500);
const pill = await phone.getByRole('status').filter({ hasText: 'Private' }).boundingBox();
check('phone: a small bar, top right, on screen', pill && pill.width < 170 && pill.x + pill.width <= 390 && pill.y < 60, JSON.stringify(pill));
await phone.screenshot({ path: 'go-live-preview-390.png' });
await phone.close();
const otherwise = await p.goto(B + '/admin/link/no-such-link');
check('nobody previews a link that isn\'t theirs (or doesn\'t exist)', otherwise.status() === 404);

// Where they meet Go live: the sidebar and Settings → Plan.
await p.goto(B + '/admin/home'); await settle(p, 1200);
const side = p.getByRole('navigation', { name: 'Admin' }).getByRole('region', { name: 'Your link is private' });
check('the sidebar says it is private, with Go live', await until(() => side.isVisible()) && await side.getByRole('link', { name: 'Go live' }).isVisible());
await p.goto(B + '/admin/settings'); await settle(p, 1000);
const card = p.getByRole('region', { name: 'Plan' });
await card.getByText('Not live yet').waitFor({ timeout: 8000 }).catch(() => {});
const t = (await card.innerText()).replace(/\s+/g, ' ');
check('Settings → Plan: not live yet, Go live with Core', t.includes('Not live yet') && t.includes('Fans see Coming soon until you go live.') && t.includes('Go live with Core: $29/month, or $290/year'), t);

// Go live: pay on Stripe's page, and the link is public.
await card.getByRole('radio', { name: '$29 monthly' }).click();
await card.getByRole('button', { name: 'Go live' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
await p.getByRole('button', { name: 'Pay' }).click();
await p.waitForURL(/\/admin\/settings\?billing=started/); await settle(p, 1500);
check('paid: Core', await until(async () => /Plan Core Big Love Productions · Renews/i.test((await card.innerText()).replace(/\s+/g, ' '))));
const live = await b.newContext({ viewport: { width: 390, height: 844 } });
const l = await live.newPage();
const shows = async () => { await l.goto(B + '/f/masquerade'); await settle(l, 800); return TITLE.test(await l.locator('body').innerText()) && !(await l.getByText('Coming soon', { exact: true }).isVisible()); };
check('live: the public sees the night', await until(shows));
check('live: the night\'s own preview card', Boolean(await until(async () => { const c = await cardBytes(); return c && c !== soonCard; })));
check('live: its calendar is back', Boolean(await until(async () => (await status('/f/biglove/calendar.ics')) === 200)));
await p.goto(B + '/admin/link/masquerade'); await p.waitForURL(/\/f\/masquerade$/, { timeout: 8000 }).catch(() => {});
check('live: their preview address now opens the public link', /\/f\/masquerade$/.test(p.url()), p.url());

// Canceled: back to Coming soon; nothing is lost.
await p.goto(B + '/admin/settings'); await settle(p, 1000);
await card.getByRole('button', { name: 'Manage billing' }).click();
await p.waitForURL(/localhost:54800\/portal\//);
await p.getByRole('button', { name: 'Cancel plan' }).click();
await p.waitForURL(/\/admin\/settings/); await settle(p, 1000);
check('canceled: the link goes back to Coming soon', await until(async () => { await l.goto(B + '/f/masquerade'); await settle(l, 800); return l.getByText('Coming soon', { exact: true }).isVisible(); }));
await p.goto(B + '/admin/link/masquerade'); await settle(p, 1500);
check('canceled: their link is all still there for them', TITLE.test(await p.locator('body').innerText()));
await live.close();

check('no errors', !errs.length, errs.join(' | '));
await ctx.close();
// Big Love back to comped, and the link live again before the next suite (plans are cached a second).
await setPlan({ status: 'comped' });
await until(async () => (await status('/f/biglove/calendar.ics')) === 200);
await b.close(); console.log(res.join('\n'));
