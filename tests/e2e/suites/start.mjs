// Sign-up, step 1: /start. With a usable invite, an organizer says what
// they run and drops their flyer; the phone beside the wizard (the real link
// player) fills in with the night's name, poster and colors; what the flyer
// said is shown to check; the draft survives a reload. Without one, the page
// says why. Each flyer read counts against the invite (5 at most).
import { readFileSync } from 'node:fs';
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const CLAUDE = 'http://localhost:54400';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
// Big Love's flyer (the mock reader answers the same for any picture).
const flyer = new URL('../fixtures/flyer-masquerade.jpg', import.meta.url).pathname;
const png = readFileSync(flyer);

const b = await chromium.launch();
const errs = [];
// An invite, made the way Showlnk makes one.
const admin = await b.newContext({ storageState: S + '/auth.json' });
const made = await (await admin.request.post(B + '/api/admin/invites', { data: { note: 'Velvet Room' } })).json();
const code = new URL(made.link).searchParams.get('invite');
const setInvite = (set) => fetch(DB + '/__invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'Velvet Room', set }) });

// No invite, or a wrong one: invite-only, and what to do.
const anon = await b.newContext({ viewport: { width: 1279, height: 900 } });
let p = await anon.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/start'); await settle(p, 500);
check('no invite: says Showlnk is invite-only', await p.getByRole('heading', { name: 'Showlnk is invite-only for now' }).isVisible());
await p.goto(B + '/start?invite=' + 'x'.repeat(32)); await settle(p, 500);
check('a wrong invite: the same', await p.getByRole('heading', { name: 'Showlnk is invite-only for now' }).isVisible());
check('not for search engines', (await p.locator('meta[name="robots"]').getAttribute('content'))?.includes('noindex'));

// The wizard.
const reelEvents = [];
await p.route('**/api/reel-events', (r) => { reelEvents.push(r.request().url()); r.fulfill({ status: 204 }); });
await p.goto(B + '/start?invite=' + code); await settle(p, 1200);
check('step 1: drop your flyer', await p.getByRole('heading', { name: 'Drop your flyer.' }).isVisible());
check('the step bar: 3 steps, on the first', (await p.getByRole('list', { name: 'Steps' }).getByRole('listitem').allTextContents()).join('|') === 'Your flyer|Your reels|Your link' && (await p.locator('[aria-current="step"]').textContent()) === 'Your flyer');
const phone = p.frameLocator('iframe[title="Your link, as fans will see it"]');
await phone.locator('main').first().waitFor({ timeout: 10000 }).catch(() => {});
check('the phone is live before the flyer: the link player', await phone.getByText('Your night').first().isVisible().catch(() => false));
const next = p.getByRole('button', { name: 'Continue' });
check('Continue waits for the flyer', await next.isDisabled() && await p.getByText('Add your flyer to continue.').isVisible());

await p.getByRole('radio', { name: 'Venue' }).click();
check('what they run: picked', (await p.getByRole('radio', { name: 'Venue' }).getAttribute('aria-checked')) === 'true');

await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'multi' });
await p.locator('input[type=file]').setInputFiles(flyer);
await p.getByText('From your flyer', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
const card = await p.locator('section').first().innerText();
check('what the flyer said, to check', card.toLowerCase().includes('golden hour: halloween') && card.includes('The Rooftop, Downtown') && card.includes('From $30'), card.slice(0, 300));
check('and the other dates', card.includes('And 1 more date from the flyer.'), card);
await p.waitForTimeout(1500);
check('the phone: their night', await phone.getByText('Golden Hour: Halloween').first().isVisible().catch(() => false));
check('the phone: their flyer behind it', (await phone.locator('img[src^="data:image/jpeg"]').count()) > 0);
check('Continue, now', await next.isEnabled());
await p.screenshot({ path: 'start-flyer-1279.png' });
check('the preview counts no visits', reelEvents.length === 0, reelEvents.join(' '));
const list = await (await admin.request.get(B + '/api/admin/invites')).json();
check('the read counted against the invite', list.invites.find((i) => i.note === 'Velvet Room')?.flyer_reads === 1);

// Coming back: carries on.
await p.reload(); await settle(p, 1500);
check('a reload keeps the draft', await p.getByText('From your flyer', { exact: true }).isVisible() && (await p.getByRole('radio', { name: 'Venue' }).getAttribute('aria-checked')) === 'true');

await next.click();
check('step 2 is next', await p.getByRole('heading', { name: 'Your night, in reels.' }).isVisible() && (await p.locator('[aria-current="step"]').textContent()) === 'Your reels');
await p.getByRole('button', { name: 'Back to your flyer' }).click();

// A flyer with no date.
await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'none' });
await p.getByRole('button', { name: 'Use a different flyer' }).click();
await p.locator('input[type=file]').setInputFiles(flyer);
await p.locator('p[role=alert]').waitFor({ timeout: 15000 }).catch(() => {});
check("no date found: says what to try", (await p.locator('p[role=alert]').textContent())?.includes("couldn't find a date"));
check('and keeps the last flyer', await p.getByText('Golden Hour: Halloween').first().isVisible());
await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'multi' });

// The invite's limit.
await setInvite({ flyer_reads: 5 });
const direct = await anon.request.post(B + '/api/start/flyer', { data: { invite: code, type: 'image/jpeg', data: png.toString('base64') } });
check('after 5 reads: no more', direct.status() === 403 && (await direct.json()).error.includes('read 5 flyers'));
check('no invite: no reading', (await anon.request.post(B + '/api/start/flyer', { data: { invite: 'nope', type: 'image/jpeg', data: png.toString('base64') } })).status() === 403);

// Expired.
await setInvite({ expires_at: '2026-01-01T00:00:00.000Z' });
await p.goto(B + '/start?invite=' + code); await settle(p, 500);
check('an expired invite: says so', await p.getByRole('heading', { name: 'This invite has expired' }).isVisible());
await setInvite({ expires_at: new Date(Date.now() + 864e5).toISOString(), flyer_reads: 1 });

// On a phone: the phone below, nothing sideways.
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
m.on('pageerror', (e) => errs.push(e.message));
await m.goto(B + '/start?invite=' + code); await settle(m, 1200);
check('phone: fits', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: 'start-390.png', fullPage: true });

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
