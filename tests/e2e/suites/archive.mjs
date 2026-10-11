// Archiving a client (Events → Archive, full admins only): nothing is
// deleted. Their links answer Not found, their admins are signed out and
// can't sign in, and a paid plan stops charging (Stripe ends it now);
// Restore brings them back, on Coming soon until they go live again. Big
// Love stands in: paid for this suite, archived, restored, then comped again.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const STRIPE = 'http://localhost:54800';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: 'biglove', ...row }) });
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn().catch(() => false); if (v) return v; await new Promise((r) => setTimeout(r, 700)); } return v; };
const status = async (path) => (await fetch(B + path)).status;
const secret = { apikey: 'test-secret', Authorization: 'Bearer test-secret' };
const planRow = async () => (await (await fetch(`${DB}/rest/v1/organizer_plans?organizer_slug=eq.biglove`, { headers: secret })).json())[0];

const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));

// Big Love pays for Core, so there's a subscription to stop.
await setPlan({});
const checkout = await (await p.request.post(B + '/api/admin/billing/checkout', { data: { slug: 'masquerade', interval: 'month' } })).json();
await p.goto(checkout.url); await p.getByRole('button', { name: 'Pay' }).click();
await p.waitForURL(/\/admin\/settings/); await settle(p, 1000);
check('set up: Big Love on Core, paying', (await until(async () => (await planRow())?.status === 'active')) === true, JSON.stringify(await planRow()));

// Big Love's own admin, signed in.
const own = await b.newContext({ viewport: { width: 1279, height: 900 } });
const login = (c) => c.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check("set up: Big Love's admin signs in", (await login(own)).ok());
const op = await own.newPage(); op.on('pageerror', (e) => errs.push(e.message));
await op.goto(B + '/admin/home'); await settle(op, 1000);
check("set up: Big Love's admin is in", new URL(op.url()).pathname === '/admin/home');

// Only full admins archive.
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'rival@example.com', password: 'rival-pass-1' } });
check("another business's admin can't archive", (await rival.request.patch(B + '/api/admin/clients/biglove', { data: { archived: true } })).status() === 403);
check('nor can Big Love archive itself', (await own.request.patch(B + '/api/admin/clients/biglove', { data: { archived: true } })).status() === 403);

// Archive, from Events: it asks first, saying what happens.
await p.goto(B + '/admin/events'); await settle(p, 1200);
const section = p.getByRole('region', { name: 'Big Love Productions' });
await section.getByRole('button', { name: 'Archive Big Love Productions' }).click();
const ask = p.getByRole('group', { name: 'Archive Big Love Productions?' });
check('Archive asks first, and says what happens', await ask.isVisible() && /links stop working.*can.t sign in.*stops\s+charging.*restore/s.test(await ask.innerText()), await ask.innerText());
await p.screenshot({ path: 'archive-ask-1279.png' });
await ask.getByRole('button', { name: 'Keep' }).click();
check('Keep leaves them be', !(await ask.count()) && await section.isVisible());
await section.getByRole('button', { name: 'Archive Big Love Productions' }).click();
await ask.getByRole('button', { name: 'Archive' }).click();
await until(async () => !(await p.getByRole('region', { name: 'Big Love Productions' }).count()));
check('archived: gone from Events', !(await p.getByRole('region', { name: 'Big Love Productions' }).count()));
const archivedList = p.getByRole('region', { name: 'Archived' });
check('archived: listed under Archived, with Restore', await until(() => archivedList.getByRole('button', { name: 'Restore Big Love Productions' }).isVisible()));
await p.screenshot({ path: 'archive-list-1279.png', fullPage: true });

// Their links: Not found.
check('archived: their event link is Not found', await until(async () => (await status('/f/masquerade')) === 404));
check('archived: their bio link too, and its calendar', (await status('/f/biglove')) === 404 && (await status('/f/biglove/calendar.ics')) === 404);

// Their plan stops charging.
const st = await (await fetch(STRIPE + '/__state')).json();
check('archived: the Stripe subscription is ended', st.subscriptions.length === 1 && st.subscriptions[0].status === 'canceled', JSON.stringify(st.subscriptions.map((s) => s.status)));
check('archived: the plan says canceled', (await until(async () => (await planRow())?.status === 'canceled')) === true, JSON.stringify(await planRow()));

// Their admin: signed out, and can't sign back in.
await op.goto(B + '/admin/home'); await op.waitForURL(/\/admin\/login/, { timeout: 8000 }).catch(() => {});
check("archived: their admin is signed out", /\/admin\/login/.test(op.url()), op.url());
const again = await login(await b.newContext());
check("archived: and can't sign in, told why", again.status() === 403 && (await again.json()).error === 'This account was closed. Ask Showlnk to restore it.');
check("archived: the database stops their edits too", (await own.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade' } })).status() >= 400);

// Restore: back in Events, links on Coming soon (the plan ended), and their admin can sign in.
await archivedList.getByRole('button', { name: 'Restore Big Love Productions' }).click();
check('restored: back in Events', await until(async () => { await p.goto(B + '/admin/events'); await settle(p, 800); return p.getByRole('region', { name: 'Big Love Productions' }).isVisible(); }));
check('restored: no longer under Archived', !(await p.getByRole('region', { name: 'Archived' }).count()));
check('restored: their link is back, on Coming soon until they go live again', await until(async () => {
  const r = await fetch(B + '/f/masquerade');
  return r.status === 200 && (await r.text()).includes('Coming soon');
}));
check('restored: their admin can sign in again', (await login(await b.newContext())).ok());

// Settings → Organizers: Remove, the same archive, and it always asks first.
await p.goto(B + '/admin/settings'); await settle(p, 1200);
const orgs = p.getByRole('region', { name: 'Organizers' });
check('Settings: the photo button says Remove photo', !(await orgs.getByRole('button', { name: 'Remove photo for Big Love Productions' }).count()) || (await orgs.getByRole('button', { name: 'Remove photo for Big Love Productions' }).innerText()).trim() === 'Remove photo');
await orgs.getByRole('button', { name: 'Remove Big Love Productions' }).click();
const askRemove = orgs.getByRole('group', { name: 'Remove Big Love Productions?' });
check('Settings: Remove asks first, and says what happens', await askRemove.isVisible() && /links stop working.*can.t sign in.*Nothing is deleted.*Archived/s.test(await askRemove.innerText()), await askRemove.innerText().catch(() => ''));
await p.screenshot({ path: 'remove-organizer-ask-1279.png' });
await askRemove.getByRole('button', { name: 'Keep' }).click();
check('Settings: Keep leaves them be', !(await askRemove.count()) && (await status('/f/masquerade')) === 200);
await orgs.getByRole('button', { name: 'Remove Big Love Productions' }).click();
await askRemove.getByRole('button', { name: 'Remove' }).click();
check('Settings: removed, gone from Organizers', await until(async () => !(await orgs.getByText('/f/biglove', { exact: true }).count())));
const archivedHere = p.getByRole('region', { name: 'Archived' });
check('Settings: listed under Archived, with Restore', await until(() => archivedHere.getByRole('button', { name: 'Restore Big Love Productions' }).isVisible()));
check('Settings: their links answer Not found', await until(async () => (await status('/f/masquerade')) === 404));
await p.screenshot({ path: 'remove-organizer-archived-1279.png', fullPage: true });
await archivedHere.getByRole('button', { name: 'Restore Big Love Productions' }).click();
check('Settings: Restore brings them back', await until(async () => { await p.goto(B + '/admin/settings'); await settle(p, 800); return orgs.getByText('/f/biglove', { exact: true }).isVisible(); }));

check('no errors', !errs.length, errs.join(' | '));
// Big Love as the other suites expect it: comped, live.
await setPlan({ status: 'comped' });
await until(async () => { const r = await fetch(B + '/f/masquerade'); return r.status === 200 && !(await r.text()).includes('Coming soon'); });
await b.close(); console.log(res.join('\n'));
