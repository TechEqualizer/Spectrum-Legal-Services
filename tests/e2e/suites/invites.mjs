// Sign-up, step 0: invites. Showlnk makes an invite link per organizer in
// Settings → Invites (shown once; only its fingerprint is kept), sees where
// each stands, and revokes one. The wizard can check a link, and learns
// nothing about whom it's for. Only full admins see or make invites.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const status = async (code) => (await fetch(B + '/api/start/invite?code=' + encodeURIComponent(code))).json();
const codeOf = (link) => new URL(link).searchParams.get('invite');

const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/settings'); await settle(p, 1000);
const section = p.getByRole('region', { name: 'Invites' });
check('Settings has Invites for Showlnk', await section.isVisible());
check('none yet', await section.getByText('No invites yet.').isVisible());

// Make one: the link, once.
await section.getByLabel("Who's it for?").fill('DJ Mike, Velvet Room');
await section.getByRole('button', { name: 'Make invite link' }).click();
const shown = section.getByLabel('Invite link');
await shown.waitFor({ timeout: 5000 }).catch(() => {});
const link = (await shown.textContent())?.trim() ?? '';
check('the link, to /start with its code', /^http:\/\/localhost:3002\/start\?invite=[A-Za-z0-9_-]{32}$/.test(link), link);
check('says it shows only once', await section.getByText(/shown only once/).isVisible());
check('listed, waiting', /DJ Mike, Velvet Room\s*Waiting · 0 of 5 flyers read · until/.test(await section.getByRole('list', { name: 'Invites' }).innerText()));
await p.screenshot({ path: 'invites-1279.png', fullPage: true });

// Only its fingerprint is kept.
const listed = await (await p.request.get(B + '/api/admin/invites')).json();
check('the list never carries the code', !JSON.stringify(listed).includes(codeOf(link)) && !JSON.stringify(listed).includes('code_hash'));

// The wizard's check: valid, then the ways it stops being.
let s = await status(codeOf(link));
check('a fresh invite is valid, 5 reads left', s.status === 'valid' && s.readsLeft === 5 && !JSON.stringify(s).includes('Mike'), JSON.stringify(s));
check('a made-up code is unknown', (await status('x'.repeat(32))).status === 'unknown');
check('a malformed one too', (await status('<script>')).status === 'unknown');
await fetch(DB + '/__invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'DJ Mike, Velvet Room', set: { flyer_reads: 3 } }) });
check('reads count down', (await status(codeOf(link))).readsLeft === 2);
await fetch(DB + '/__invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'DJ Mike, Velvet Room', set: { expires_at: '2026-01-01T00:00:00.000Z' } }) });
check('expired', (await status(codeOf(link))).status === 'expired');

// Revoke a second one.
await section.getByLabel("Who's it for?").fill('Golden Hour Sundays');
await section.getByRole('button', { name: 'Make invite link' }).click();
await p.waitForTimeout(800);
const second = (await section.getByLabel('Invite link').textContent())?.trim() ?? '';
await section.getByRole('button', { name: 'Revoke the invite for Golden Hour Sundays' }).click();
await p.waitForTimeout(800);
check('revoked: says so, no button', /Golden Hour Sundays\s*Revoked/.test(await section.getByRole('list', { name: 'Invites' }).innerText()) && await section.getByRole('button', { name: 'Revoke the invite for Golden Hour Sundays' }).count() === 0);
check('revoked: the wizard stops', (await status(codeOf(second))).status === 'revoked');
check('expired: no revoke button either', await section.getByRole('button', { name: 'Revoke the invite for DJ Mike, Velvet Room' }).count() === 0);

// Only Showlnk.
const org = await b.newContext();
await org.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check("an organizer's admin can't list invites", (await org.request.get(B + '/api/admin/invites')).status() === 403);
check('or make one', (await org.request.post(B + '/api/admin/invites', { data: { note: 'Me' } })).status() === 403);
const op = await org.newPage();
await op.goto(B + '/admin/settings'); await settle(op, 1000);
check("and doesn't see Invites", await op.getByRole('region', { name: 'Invites' }).count() === 0);
check('signed out: nothing', (await fetch(B + '/api/admin/invites')).status === 401);
check('a note is needed', (await p.request.post(B + '/api/admin/invites', { data: { note: '  ' } })).status() === 400);

// On a phone.
const m = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(B + '/admin/settings'); await settle(m, 1000);
check('phone: fits', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
