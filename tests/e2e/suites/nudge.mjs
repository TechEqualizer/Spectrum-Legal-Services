// Billing: the Core nudge beside the sidebar (docs/plans/03-billing.md,
// "Upgrade nudges"). On a trial without a card, the days left and Keep Core
// ("Your trial ends…"), more urgent in the last days; not live yet, Go live;
// nothing once they pay or are comped. Keeping Core during the trial is
// charged at once, like any checkout.
import { chromium, settle, testNow } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: 'biglove', ...row }) });
const inDays = (n) => new Date(testNow() + n * 864e5 - 3600e3).toISOString();

const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
const nav = p.getByRole('navigation', { name: 'Admin' });
const open = async (path = '/admin/home') => { await p.goto(B + path); await settle(p, 900); };

// Comped (Big Love, as seeded): nothing to sell.
await open();
check('comped: no nudge', (await nav.getByRole('link', { name: /Keep Core|Go live/ }).count()) === 0);

// A trial, 10 days left: days, the bar, and Keep Core at no charge until it ends.
await setPlan({ status: 'trialing', trial_ends_at: inDays(10) });
await open();
const trial = nav.getByRole('region', { name: 'Core trial' });
await trial.waitFor({ timeout: 5000 }).catch(() => {});
const t = (await trial.innerText().catch(() => '')).replace(/\s+/g, ' ');
check('trial: the days left', /10 days left/.test(t), t);
check('trial: when it ends', /Your trial ends .*Keep Core to keep your link live/.test(t), t);
check('trial: Keep Core goes to the plan', (await trial.getByRole('link', { name: 'Keep Core' }).getAttribute('href')) === '/admin/settings#plan');
await p.screenshot({ path: 'nudge-trial-1279.png' });

// Folded sidebar: a badge with the days.
await nav.getByRole('button', { name: 'Collapse sidebar' }).click(); await p.waitForTimeout(300);
check('folded: a badge with the days', (await nav.getByRole('link', { name: /Core trial: 10 days left\. Keep Core/ }).textContent())?.trim() === '10d');
await nav.getByRole('button', { name: 'Expand sidebar' }).click();

// The last days: more urgent, and what stops.
await setPlan({ status: 'trialing', trial_ends_at: inDays(2) });
await open();
const last = (await nav.getByRole('region', { name: 'Core trial' }).innerText().catch(() => '')).replace(/\s+/g, ' ');
check('last days: says what happens', /2 days left/.test(last) && /your link goes back to Coming soon/.test(last), last);

// Not live yet: Go live.
await setPlan({});
await open();
const free = nav.getByRole('region', { name: 'Your link is private' });
check('not live: Go live', await free.isVisible() && await free.getByRole('link', { name: 'Go live' }).isVisible() && /Fans see Coming soon until you do/.test(await free.innerText()));

// On a phone: a chip beside the account.
const m = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errs.push(e.message));
await m.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
await setPlan({ status: 'trialing', trial_ends_at: inDays(10) });
await m.goto(B + '/admin/home'); await settle(m, 900);
const chip = m.getByRole('link', { name: 'Core trial: 10 days left. Keep Core' });
check('phone: a chip with the days', await chip.isVisible() && (await chip.textContent())?.trim() === 'Core · 10d');
check('phone: fits', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: 'nudge-390.png' });

// Keep Core during the trial: charged today (no free days on Stripe's page); after paying, Core renewing, and no nudge.
await open('/admin/settings');
const plan = p.getByRole('region', { name: 'Plan' });
await plan.getByRole('button', { name: 'Keep Core' }).waitFor({ timeout: 8000 }).catch(() => {});
check('the plan card: Keep Core, charged today', await plan.getByRole('button', { name: 'Keep Core' }).isVisible() && /Charged today \(\$\d+\), then every (month|year)/.test(await plan.innerText()));
await plan.getByRole('button', { name: 'Keep Core' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
check("Stripe's page: paid now, no free days", !/Free until/.test(await p.textContent('body')));
await p.getByRole('button', { name: 'Pay' }).click();
await p.waitForURL(/\/admin\/settings\?billing=started/); await settle(p, 1500);
await plan.getByText(/Renews/).waitFor({ timeout: 8000 }).catch(() => {});
check('after paying: Core, renewing', /Core .*Renews/.test((await plan.innerText()).replace(/\s+/g, ' ')), (await plan.innerText()).replace(/\s+/g, ' '));
await open();
check('after paying: no nudge', (await nav.getByRole('link', { name: /Keep Core|Go live/ }).count()) === 0);
check('and no second checkout', (await p.request.post(B + '/api/admin/billing/checkout', { data: { slug: 'masquerade', interval: 'month' } })).status() === 409);

await setPlan({ status: 'comped', stripe_customer_id: null, stripe_subscription_id: null });
check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
