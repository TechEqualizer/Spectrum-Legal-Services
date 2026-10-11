// Nudges toward the fans add-on (docs/plans/03-billing.md, "Fans add-on
// nudges"). Live on Core without it: the sidebar card and a Home card (with
// the link's reel views) offer it, both with Not now (two weeks); Add Fans
// leads to the add-on on Settings → Plan, brought into view and marked.
// Phones keep their chip for what must be done, not offers. Comped: the
// add-on shows as included. A trial from before keeps it with Keep Core.
// Big Love stands in, its plan cleared for this suite.
import { chromium, settle, testNow } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: 'biglove', ...row }) });
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn().catch(() => false); if (v) return v; await new Promise((r) => setTimeout(r, 700)); } return v; };
const inDays = (n) => new Date(testNow() + n * 864e5 - 3600e3).toISOString();
const flat = (s) => (s ?? '').replace(/\s+/g, ' ');

const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
const nav = p.getByRole('navigation', { name: 'Admin' });
const card = p.getByRole('region', { name: 'Plan' });
const open = async (path = '/admin/home') => { await p.goto(B + path); await settle(p, 900); };
const planNow = async () => (await (await p.request.get(B + '/api/admin/plan?slug=masquerade')).json()).plan;

// Comped (Big Love as seeded): nothing to sell, and the add-on shows as included.
await open('/admin/settings');
const included = card.getByRole('group', { name: 'Fans add-on' });
await included.waitFor({ timeout: 8000 }).catch(() => {});
check('comped: Settings shows the add-on, included', /Fans add-on · Included/.test(await included.innerText().catch(() => '')));
check('comped: no fans nudge', !(await nav.getByRole('region', { name: 'Fans add-on' }).count()));
await card.screenshot({ path: 'fans-nudge-included-1279.png' });

// A trial from before: Keep Core offers to keep the add-on too, and Stripe's page has both.
await setPlan({ status: 'trialing', trial_ends_at: inDays(10) });
await open('/admin/settings');
const keep = card.getByRole('checkbox', { name: /Keep the Fans add-on/ });
await keep.waitFor({ timeout: 8000 }).catch(() => {});
check('trial: Keep Core offers to keep Fans', await keep.isVisible() && /on in your trial.*stop when you keep Core/s.test(await keep.locator('xpath=..').innerText()));
await card.getByRole('radio', { name: '$29 monthly' }).click();
await keep.check();
check('trial: the charge counts both', /Charged today \(\$44\)/.test(await card.innerText()));
await card.getByRole('button', { name: 'Keep Core' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
const payPage = await p.textContent('body');
check("trial: Stripe's page has the add-on", payPage.includes('Fans add-on') && payPage.includes('$15.00 per month'));
// Not paying here: back to a plain paid Core without it, below.
await p.goBack(); await settle(p, 600);

// Go live without the add-on: back from paying, the next step is Fans.
await setPlan({});
await open('/admin/settings');
await card.getByRole('button', { name: 'Go live' }).waitFor({ timeout: 8000 }).catch(() => {});
await card.getByRole('radio', { name: '$29 monthly' }).click();
await card.getByRole('button', { name: 'Go live' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
await p.getByRole('button', { name: 'Pay' }).click();
await p.waitForURL(/\/admin\/settings\?billing=started/); await settle(p, 1200);
check('set up: live on Core, without Fans', (await until(async () => { const pl = await planNow(); return pl.status === 'active' && !pl.fans; })) === true);
check("back from paying: You're live, next Fans", await until(async () => /You.re live\. Next: let the people watching follow you/.test(await card.innerText())));
const group = card.getByRole('group', { name: 'Fans add-on' });
check('Settings: the add-on stands out, with why', await until(async () => /Your link is live\. Let the people watching follow you/.test(await group.innerText())));

// The sidebar card: the add-on, with Add Fans and Not now.
await open();
const side = nav.getByRole('region', { name: 'Fans add-on' });
await side.waitFor({ timeout: 8000 }).catch(() => {});
check('sidebar: Let fans follow you, at their cadence', /Let fans follow you/.test(flat(await side.innerText().catch(() => ''))) && /\$15 a month/.test(flat(await side.innerText().catch(() => ''))), flat(await side.innerText().catch(() => '')));
check('sidebar: Add Fans goes to the add-on', (await side.getByRole('link', { name: 'Add Fans' }).getAttribute('href')) === '/admin/settings#fans');
await p.screenshot({ path: 'fans-nudge-home-1279.png' });

// Home: the reel views, and the add-on.
const offer = p.getByRole('region', { name: /Let them follow you|Let the people watching follow you/ });
check('Home: the offer, with the link\'s numbers', await offer.isVisible() && /follow, get presale links and see fans-only reels/.test(flat(await offer.innerText())), flat(await offer.innerText().catch(() => '')));
check('Home: Add Fans with its price', (await offer.getByRole('link', { name: 'Add Fans · $15/month' }).getAttribute('href')) === '/admin/settings#fans');

// Add Fans from the sidebar: Settings, the add-on in view and marked.
await side.getByRole('link', { name: 'Add Fans' }).click();
await p.waitForURL(/\/admin\/settings#fans/);
await group.waitFor({ timeout: 8000 }).catch(() => {});
check('Add Fans: the add-on is marked a moment', await until(async () => /ring-2/.test(await group.getAttribute('class')), 3000));
const inView = () => group.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
check('Add Fans: and in view, once the page settles', await until(inView, 3000));
await card.screenshot({ path: 'fans-nudge-settings-1279.png' });

// The notes beside the add-on's features lead to it too (Fans only, on a reel).
await p.goto(B + '/admin', { waitUntil: 'networkidle' });
const firstTitle = await p.locator('section[aria-labelledby="order-title"] ol > li').first().locator('p.font-bold').textContent();
await p.getByRole('button', { name: `Edit ${firstTitle}` }).click();
const dlg = p.getByRole('dialog');
await dlg.getByText('Part of the Fans add-on.').waitFor({ timeout: 5000 }).catch(() => {});
check('a reel: its Fans only note leads to the add-on', (await dlg.getByRole('link', { name: 'Add Fans' }).getAttribute('href').catch(() => '')) === '/admin/settings#fans');
await p.keyboard.press('Escape');

// Not now: both go for two weeks (this browser, this organizer), and stay gone after a reload.
await open();
await offer.getByRole('button', { name: 'Not now' }).click();
check('Not now: the Home offer goes', await until(async () => !(await offer.count()), 3000));
check('Not now: the sidebar card too', !(await nav.getByRole('region', { name: 'Fans add-on' }).count()));
await open();
check('Not now: still gone after a reload', !(await offer.count()) && !(await nav.getByRole('region', { name: 'Fans add-on' }).count()));
const until14 = await p.evaluate(() => Number(localStorage.getItem('fans_nudge:biglove')));
const pageNow = await p.evaluate(() => Date.now());
check('Not now: for two weeks', Math.abs(until14 - pageNow - 14 * 864e5) < 60e3, `${until14} ${pageNow}`);
await open('/admin/settings');
check('Not now: Settings still has the add-on', await until(async () => await card.getByRole('group', { name: 'Fans add-on' }).getByRole('button', { name: 'Add Fans' }).isVisible()));
await p.evaluate(() => localStorage.removeItem('fans_nudge:biglove'));

// Phones: no chip for an offer (the chip is for what must be done); the Home offer fits.
const m = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errs.push(e.message));
await m.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
await m.goto(B + '/admin/home'); await settle(m, 1200);
check('phone: no chip for the offer', !(await m.getByRole('link', { name: /Fans add-on: Let fans follow you/ }).count()));
check('phone: the Home offer shows', await m.getByRole('link', { name: 'Add Fans · $15/month' }).isVisible().catch(() => false));
check('phone: fits', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: 'fans-nudge-390.png', fullPage: true });

// Adding it: the nudges go.
await open('/admin/settings');
await card.getByRole('group', { name: 'Fans add-on' }).getByRole('button', { name: 'Add Fans' }).click();
check('added: the plan says so', (await until(async () => (await planNow()).fans === true)) === true);
await open();
check('added: no nudges', !(await nav.getByRole('region', { name: 'Fans add-on' }).count()) && !(await offer.count()));

check('no errors', !errs.length, errs.join(' | '));
// Big Love as the other suites expect it: comped, live.
await setPlan({ status: 'comped' });
await until(async () => { const r = await fetch(B + '/f/masquerade'); return r.status === 200 && !(await r.text()).includes('Coming soon'); });
await b.close(); console.log(res.join('\n'));
