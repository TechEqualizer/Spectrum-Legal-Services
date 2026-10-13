// The fans add-on (docs/plans/03-billing.md, "Pay to go live", step 3):
// Follow, presales, fans-only reels and the fan calendar, $15/month or
// $150/year on top of Core, a second item on the same Stripe subscription.
// Bought with Go live or later from Settings → Plan (charged now for the rest
// of the period), taken off there (the unused time credited). Without it,
// nobody can follow and the fan calendar isn't there; the organizer's fan list
// stays theirs. Big Love stands in, its plan cleared for this suite.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const STRIPE = 'http://localhost:54800';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: 'biglove', ...row }) });
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn().catch(() => false); if (v) return v; await new Promise((r) => setTimeout(r, 700)); } return v; };
const status = async (path) => (await fetch(B + path)).status;
// Can a fan follow Big Love? (Asking sends a confirm email when Follow is on.)
let n = 0;
const canFollow = async () => (await fetch(B + '/api/fans/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `addon${++n}@example.com`, organizer: 'biglove' }) })).status === 200;
const stripeSub = async () => (await (await fetch(STRIPE + '/__state')).json()).subscriptions[0];

const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
const card = p.getByRole('region', { name: 'Plan' });
const planNow = async () => (await (await p.request.get(B + '/api/admin/plan?slug=masquerade')).json()).plan;
const openPlan = async () => { await p.goto(B + '/admin/settings'); await settle(p, 900); await card.getByText(/^(Core|Not live)/).first().waitFor({ timeout: 8000 }).catch(() => {}); };

// Go live with the add-on: a checkbox on the Plan card; Stripe's page shows both lines.
await setPlan({});
await openPlan();
const box = card.getByRole('checkbox', { name: /Add the Fans add-on/ });
check('Go live offers the Fans add-on, at the same cadence', await box.isVisible() && /\+\$150\/year/.test(await box.locator('xpath=..').innerText()));
await card.getByRole('radio', { name: '$29 monthly' }).click();
check('monthly: +$15/month', /\+\$15\/month/.test(await box.locator('xpath=..').innerText()));
await box.check();
check('the charge today counts both: $44', /Charged today \(\$44\), then every month/.test(await card.innerText()), await card.innerText());
await card.getByRole('button', { name: 'Go live' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
const payPage = await p.textContent('body');
check("Stripe's page: Core and the Fans add-on", payPage.includes('$29.00 per month') && payPage.includes('$15.00 per month') && payPage.includes('Fans add-on'));
await p.getByRole('button', { name: 'Pay' }).click();
await p.waitForURL(/\/admin\/settings\?billing=started/); await settle(p, 1200);
check('paid: Core with the add-on', (await until(async () => { const pl = await planNow(); return pl.status === 'active' && pl.fans === true; })) === true, JSON.stringify(await planNow()));
check('with it: fans can follow', await until(canFollow));
check('with it: the fan calendar', await until(async () => (await status('/f/biglove/calendar.ics')) === 200));

// On the Plan card: it's on, with Remove (asks first).
await openPlan();
const addon = card.getByRole('group', { name: 'Fans add-on' });
check('Plan card: Fans add-on · On', await until(async () => /Fans add-on · On/.test(await addon.innerText())));
await card.screenshot({ path: 'fans-addon-on-1279.png' });
await addon.getByRole('button', { name: 'Remove' }).click();
const ask = card.getByRole('group', { name: 'Remove the Fans add-on?' });
check('Remove asks first, saying what stops and that the fan list stays', /stop now.*credited to your next bill.*fan list stays yours/s.test(await ask.innerText()));
await ask.getByRole('button', { name: 'Remove' }).click();
check('removed: the plan says so', (await until(async () => (await planNow()).fans !== true)) === true);
let sub = await stripeSub();
check('removed in Stripe, the unused time credited', sub.items.data.length === 1 && sub.prorations?.at(-1) === 'create_prorations', JSON.stringify(sub.items.data.map((i) => i.price.lookup_key)));
check('without it: nobody can follow', await until(async () => !(await canFollow())));
check('without it: no fan calendar', await until(async () => (await status('/f/biglove/calendar.ics')) === 404));
check('without it: the fan list stays, saying why it stopped', await (async () => { const f = await (await p.request.get(B + '/api/admin/fans?slug=masquerade')).json(); return f.addOn === false && Array.isArray(f.fans); })());

// Add it back from the Plan card: charged now for the rest of the month.
await openPlan();
check('Add Fans, with its price at their cadence', /Fans add-on: \$15\/month/.test(await addon.innerText()) && /Charged today for the rest of this month, then \$15 with Core every month/.test(await addon.innerText()));
await card.screenshot({ path: 'fans-addon-off-1279.png' });
await addon.getByRole('button', { name: 'Add Fans' }).click();
check('added: the plan says so', (await until(async () => (await planNow()).fans === true)) === true);
sub = await stripeSub();
check('added in Stripe, charged now for the rest of the period', sub.items.data.map((i) => i.price.lookup_key).join() === 'core_month,fans_month' && sub.prorations?.at(-1) === 'always_invoice', JSON.stringify(sub.prorations));
check('with it again: fans can follow', await until(canFollow));

// Only the organizer's own admins, only on a paid Core.
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'rival@example.com', password: 'rival-pass-1' } });
check("another business's admin can't add or remove it", (await rival.request.post(B + '/api/admin/billing/fans', { data: { slug: 'masquerade', on: false } })).status() === 403);
// The plan is cached for a second and refreshed behind the first read after, so wait for the change, not a set time.
await setPlan({ status: 'comped' });
check('comped: included, nothing to buy', await until(async () => (await p.request.post(B + '/api/admin/billing/fans', { data: { slug: 'masquerade', on: true } })).status() === 409));
const comped = card.getByRole('group', { name: 'Fans add-on' });
check('comped: the add-on shows as included, with nothing to buy', await until(async () => { await openPlan(); return /Fans add-on · Included/.test(await comped.innerText({ timeout: 3000 })); }) && !(await comped.getByRole('button').count()));

check('no errors', !errs.length, errs.join(' | '));
// Big Love as the other suites expect it: comped, live.
await until(async () => { const r = await fetch(B + '/f/masquerade'); return r.status === 200 && !(await r.text()).includes('Coming soon'); });
await b.close(); console.log(res.join('\n'));
