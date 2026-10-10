// Billing, step 1: Settings → Plan says which plan the selected event's
// organizer is on, in words; Free lists what Core adds. Only the
// organizer's own admins can read it.
import { chromium, settle, testNow } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: 'biglove', ...row }) });
const b = await chromium.launch();
const errs = [];
const page = async (w, h, mobile = false) => {
  const p = await b.newPage({ storageState: S + '/auth.json', viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
  await p.goto(B + '/admin/settings'); await settle(p, 800);
  return p;
};
const card = (p) => p.getByRole('region', { name: 'Plan' });
const text = async (p) => { await card(p).getByText(/Core|Free/).first().waitFor({ timeout: 8000 }).catch(() => {}); return (await card(p).innerText().catch(() => '')).replace(/\s+/g, ' '); };

// Big Love is comped, as the migration seeds it.
let p = await page(1279, 900);
let t = await text(p);
check('Big Love: Core, on Showlnk', t.includes('Core, on Showlnk') && t.includes('Big Love Productions') && t.includes('Every Core feature, free.'), t);
check("comped doesn't list what Core adds", !t.includes('$29/month'));
await p.screenshot({ path: 'plan-comped-1279.png' });

// A trial counts its days.
await setPlan({ status: 'trialing', trial_ends_at: new Date(testNow() + 5 * 864e5 - 3600e3).toISOString() });
await p.reload(); t = await text(p);
check('trial: days left', t.includes('Core trial') && /5 days left, until/.test(t), t);

// Free: what Core adds, and the price.
await setPlan({});
await p.reload(); t = await text(p);
check('Free: says so', /^Plan Free/i.test(t) && t.includes('Follow for up to 100 fans.'), t);
check('Free: Core and its price', t.includes('Core: $29/month, or $290/year') && t.includes('Unlimited fans following you') && t.includes('Fan-only reels'), t);
await p.screenshot({ path: 'plan-free-1279.png' });

// Who can read it.
const own = await b.newContext();
await own.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check("the organizer's admin can read it", (await own.request.get(B + '/api/admin/plan?slug=masquerade')).ok());
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'rival@example.com', password: 'rival-pass-1' } });
check("another business's admin can't", (await rival.request.get(B + '/api/admin/plan?slug=masquerade')).status() === 403);
check('signed out: nothing', (await fetch(B + '/api/admin/plan?slug=masquerade')).status === 401);

// On a phone.
await setPlan({ status: 'comped' });
const m = await page(390, 844, true);
t = await text(m);
check('phone: the card shows', t.includes('Core, on Showlnk'), t);
check('phone: fits', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: 'plan-390.png', fullPage: true });

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
