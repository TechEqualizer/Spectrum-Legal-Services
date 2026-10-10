// Billing, step 2: Start Core and Manage billing. An organizer on Free picks
// monthly or yearly, pays on Stripe's page (the mock), and comes back to
// Core; Stripe's signed webhook writes the plan (unsigned ones are refused);
// a declined card says so; the billing portal cancels; starting again reuses
// the same Stripe customer. Comped organizers have nothing to buy, and only
// the organizer's own admins can start or manage it.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const STRIPE = 'http://localhost:54800';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
// Big Love, on Free for this suite (the admin's event list is cached, so a
// suite's own new event wouldn't show in Settings), then comped again below.
const ORG = 'biglove';
const gh = { slug: 'masquerade' };
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: ORG, ...row }) });
await setPlan({});
const stripeState = async () => (await fetch(STRIPE + '/__state')).json();

const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
await ctx.addInitScript((slug) => localStorage.setItem('admin_business', slug), gh.slug);
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
const card = () => p.getByRole('region', { name: 'Plan' });
const cardText = async () => (await card().innerText().catch(() => '')).replace(/\s+/g, ' ');
const open = async (path = '/admin/settings') => { await p.goto(B + path); await settle(p, 800); await card().getByText(/^(Core|Free)/).first().waitFor({ timeout: 8000 }).catch(() => {}); };

// Free: Start Core, yearly picked.
await open();
let t = await cardText();
check('Free offers Core', /Plan Free/i.test(t) && t.includes('Core: $29/month, or $290/year'), t);
const yearly = card().getByRole('radio', { name: '$290 yearly' });
check('yearly is picked first, two months free', (await yearly.getAttribute('aria-checked')) === 'true' && t.includes('Two months free.'), t);

// Monthly, then back out of checkout: nothing charged.
await card().getByRole('radio', { name: '$29 monthly' }).click();
await card().getByRole('button', { name: 'Start Core' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
check('checkout is Stripe\'s page, monthly', (await p.textContent('body')).includes('$29.00 per month'));
await p.getByRole('button', { name: 'Back' }).click();
await p.waitForURL(/\/admin\/settings\?billing=canceled/); await settle(p, 800);
check('back from checkout: nothing charged', await p.getByText('Checkout was canceled. Nothing was charged.').isVisible());
check('still Free', /Free Big Love Productions · Follow for up to 100 fans/.test(await cardText()), await cardText());

// On Free, Core's features say so where they're set up (billing step 3).
await p.goto(B + '/admin', { waitUntil: 'networkidle' });
const firstTitle = await p.locator('section[aria-labelledby="order-title"] ol > li').first().locator('p.font-bold').textContent();
await p.getByRole('button', { name: `Edit ${firstTitle}` }).click();
const dlg = p.getByRole('dialog');
const fansSwitch = dlg.getByRole('switch', { name: /Fans only/ });
await dlg.getByText('Part of Core.').waitFor({ timeout: 5000 }).catch(() => {});
check('on Free: Fans only is part of Core', await fansSwitch.isDisabled() && await dlg.getByText('Start Core to make reels only your followers can watch.').isVisible() && (await dlg.getByRole('link', { name: 'Start Core' }).getAttribute('href')) === '/admin/settings#plan');
await p.keyboard.press('Escape');
await p.locator('section[aria-labelledby="dates-title"]').locator(':scope > ul > li').first().getByRole('button').click();
const ds = p.locator('dialog[open]');
await ds.getByText('Part of Core.').waitFor({ timeout: 5000 }).catch(() => {});
check('on Free: presales are part of Core', await ds.getByRole('switch', { name: 'Presale for followers' }).isDisabled() && await ds.getByText('Start Core to give your followers tickets first.').isVisible());
await p.keyboard.press('Escape');
// The plan is kept a second in the tests: ask once, then look.
await p.request.get(`${B}/api/admin/fans?slug=${gh.slug}`); await p.waitForTimeout(600);
check('on Free: the fans list says it is Free', (await (await p.request.get(`${B}/api/admin/fans?slug=${gh.slug}`)).json()).core === false);
await open();

// Yearly, paid.
await card().getByRole('button', { name: 'Start Core' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
check('yearly checkout', (await p.textContent('body')).includes('$290.00 per year'));
await p.getByRole('button', { name: 'Pay' }).click();
await p.waitForURL(/\/admin\/settings\?billing=started/); await settle(p, 1500);
await card().getByText(/^Core$/).waitFor({ timeout: 8000 }).catch(() => {});
t = await cardText();
check('paid: Core, renewing', /Plan Core Big Love Productions · Renews/i.test(t), t);
check('paid: Manage billing, no Start Core', await card().getByRole('button', { name: 'Manage billing' }).isVisible() && await card().getByRole('button', { name: 'Start Core' }).count() === 0);
await p.screenshot({ path: 'billing-core-1279.png' });
let st = await stripeState();
check('the webhook was signed and taken', st.webhooks.some((w) => w.type === 'checkout.session.completed' && w.status === 200), JSON.stringify(st.webhooks));
const plan = await (await p.request.get(B + '/api/admin/plan?slug=' + gh.slug)).json();
check('the plan: active, yearly', plan.plan.status === 'active' && plan.plan.interval === 'year' && plan.manage === true, JSON.stringify(plan));
check('admins never get the Stripe ids', !JSON.stringify(plan).includes('cus_') && !JSON.stringify(plan).includes('sub_'));
check("can't start Core twice", (await p.request.post(B + '/api/admin/billing/checkout', { data: { slug: gh.slug, interval: 'month' } })).status() === 409);

// Only events Stripe signed.
const sub = st.subscriptions[0];
const forged = await (await fetch(STRIPE + '/__send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'customer.subscription.deleted', object: sub, signature: 'bad' }) })).json();
check('a forged webhook is refused', forged.status === 400, JSON.stringify(forged));
check('an unsigned one too', (await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'customer.subscription.deleted', data: { object: sub } }) })).status === 400);
check('and the plan is unchanged', (await (await p.request.get(B + '/api/admin/plan?slug=' + gh.slug)).json()).plan.status === 'active');

// A declined card.
await fetch(STRIPE + '/__subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: ORG, status: 'past_due' }) });
await open();
t = await cardText();
check('declined: says so, keeps Core for now', /Plan Core/i.test(t) && t.includes('Your card was declined. Update it by'), t);
check('declined: Update card', await card().getByRole('button', { name: 'Update card' }).isVisible());
await fetch(STRIPE + '/__subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: ORG, status: 'active' }) });

// Cancel in the portal.
await open();
await card().getByRole('button', { name: 'Manage billing' }).click();
await p.waitForURL(/localhost:54800\/portal\//);
await p.getByRole('button', { name: 'Cancel plan' }).click();
await p.waitForURL(/\/admin\/settings/); await settle(p, 1000);
await open();
t = await cardText();
check('canceled: Free, says why', /Plan Free/i.test(t) && t.includes('Core was canceled.'), t);
check('canceled: can start again, and still see billing', await card().getByRole('button', { name: 'Start Core' }).isVisible() && await card().getByRole('button', { name: 'Manage billing' }).isVisible());

// Starting again reuses the same Stripe customer.
await card().getByRole('button', { name: 'Start Core' }).click();
await p.waitForURL(/localhost:54800\/pay\//);
st = await stripeState();
check('again: the same Stripe customer', st.sessions.at(-1).customer === sub.customer && !st.sessions.at(-1).customer_email, JSON.stringify(st.sessions.at(-1)));
await p.goBack();

// Comped: nothing to buy.
await setPlan({ status: 'comped', stripe_customer_id: null, stripe_subscription_id: null });
const bl = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
await bl.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const bp = await bl.newPage();
await bp.goto(B + '/admin/settings'); await settle(bp, 1200);
await bp.getByRole('region', { name: 'Plan' }).getByText('Core, on Showlnk').waitFor({ timeout: 8000 }).catch(() => {});
check('comped: no Start Core', await bp.getByRole('region', { name: 'Plan' }).getByText('Core, on Showlnk').isVisible() && await bp.getByRole('button', { name: 'Start Core' }).count() === 0);
check('comped: checkout refused', (await bp.request.post(B + '/api/admin/billing/checkout', { data: { slug: 'masquerade', interval: 'month' } })).status() === 409);

// Only the organizer's own admins.
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'rival@example.com', password: 'rival-pass-1' } });
check("another business can't start it", (await rival.request.post(B + '/api/admin/billing/checkout', { data: { slug: gh.slug, interval: 'month' } })).status() === 403);
check("or manage it", (await rival.request.post(B + '/api/admin/billing/portal', { data: { slug: gh.slug } })).status() === 403);
check('signed out: nothing', (await fetch(B + '/api/admin/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: gh.slug, interval: 'month' }) })).status === 401);

// On a phone.
const m = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.addInitScript((slug) => localStorage.setItem('admin_business', slug), gh.slug);
await m.goto(B + '/admin/settings'); await settle(m, 1200);
await m.getByRole('region', { name: 'Plan' }).scrollIntoViewIfNeeded().catch(() => {});
check('phone: fits', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.getByRole('region', { name: 'Plan' }).screenshot({ path: 'billing-390.png' }).catch(() => {});

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
