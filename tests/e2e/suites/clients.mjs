// New client: Showlnk adds a client (their bio link and a first event),
// builds it, then hands it off with the client's own login.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 }, timezoneId: 'America/Detroit' });
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));

// Only Showlnk adds clients.
const org = await b.newContext();
await org.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
const refused = await org.request.post(B + '/api/admin/clients', { data: { name: 'Sneaky', slug: 'sneaky', eventName: 'Sneaky night', eventSlug: 'sneaky-night' } });
check("an organizer can't add clients", refused.status() === 403, String(refused.status()));
const op = await org.newPage();
await op.goto(B + '/admin/events'); await settle(op, 1200);
check('organizer: no New client button', await op.getByRole('button', { name: 'New client' }).count() === 0 && await op.getByRole('link', { name: /^Hand off/ }).count() === 0);
await org.close();

// New client: the links follow the names.
await p.goto(B + '/admin/events'); await settle(p, 1200);
await p.getByRole('button', { name: 'New client' }).click();
const sheet = p.locator('dialog[open]');
check('New client sheet', (await sheet.getByRole('heading', { level: 2 }).textContent()) === 'New client');
await sheet.getByLabel('Client name').fill('Velvet Nights');
await sheet.getByLabel('First event', { exact: true }).locator('xpath=self::input').fill('Velvet Halloween');
check('links follow the names', (await sheet.getByLabel('Bio link').inputValue()) === 'velvet-nights' && (await sheet.getByLabel('Event link').inputValue()) === 'velvet-halloween');
await p.screenshot({ path: S + '/new-client-1440.jpg' });

// A taken link is named where it is.
await sheet.getByLabel('Bio link').fill('biglove');
await sheet.getByRole('button', { name: 'Create client' }).click(); await settle(p, 800);
check('taken bio link: said under it', await sheet.getByRole('alert').filter({ hasText: '/f/biglove is taken' }).isVisible());
await sheet.getByLabel('Bio link').fill('velvet-nights');
await sheet.getByRole('button', { name: 'Create client' }).click();
await p.waitForURL(/\/admin$/); await settle(p, 1500);
check('their first event opens in the studio', (await p.locator('#admin-business').inputValue()) === 'velvet-halloween');
check('on Import flyer', await p.locator('dialog[open]').filter({ hasText: /flyer/i }).count() === 1);
await p.keyboard.press('Escape'); await settle(p, 300);
const groups = await p.locator('#admin-business optgroup').evaluateAll((gs) => gs.map((g) => g.label + ': ' + [...g.children].map((o) => o.textContent).join(', ')));
check('dropdown: the client with its event, no demos', groups.includes('Velvet Nights: Velvet Halloween') && !groups.some((g) => g.startsWith('Demos:')), groups.join(' | '));

// Their links work for visitors.
const v = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const ev = await v.goto(B + '/f/velvet-halloween'); await settle(v, 1000);
check('event link live', ev.status() === 200 && /velvet halloween/i.test(await v.locator('h1').innerText()), String(ev.status()));
const bio = await v.goto(B + '/f/velvet-nights'); await settle(v, 1000);
check('bio link live', bio.status() === 200 && /velvet/i.test(await v.locator('body').innerText()), String(bio.status()));

// Hand off: Add account, already set to the client.
await p.goto(B + '/admin/events'); await settle(p, 1200);
const section = p.getByRole('region', { name: 'Velvet Nights' });
check('their section on Events', await section.getByRole('button', { name: 'Open Velvet Halloween' }).isVisible());
await section.getByRole('link', { name: /^Hand off Velvet Nights/ }).click();
await p.waitForURL(/\/admin\/settings/); await settle(p, 1500);
const hand = p.locator('dialog[open]');
check('Hand off opens Add account for them', (await hand.getByRole('heading', { level: 2 }).textContent()) === 'Hand off Velvet Nights' && await hand.getByLabel(/^Velvet Nights/).isChecked() && !(await hand.getByLabel(/^Big Love Productions/).isChecked()));
check('the address is cleared, so a reload won\'t reopen it', !p.url().includes('handoff'), p.url());
await hand.getByLabel('Email').fill('owner@velvetnights.com');
await hand.getByRole('button', { name: 'Add account' }).click(); await settle(p, 1200);
const list = await p.getByRole('region', { name: 'Accounts' }).innerText();
check('their account, for their events only', /owner@velvetnights\.com\s*Velvet Nights/.test(list), list.slice(0, 400));
check('Send login offered', await p.getByRole('button', { name: 'Send login to owner@velvetnights.com' }).isVisible());

// Phone: the sheet fits.
const m = await (await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await m.goto(B + '/admin/events'); await settle(m, 1200);
await m.getByRole('button', { name: 'New client' }).click(); await settle(m, 300);
check('phone: sheet fits, no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await m.locator('dialog[open]').getByRole('button', { name: 'Create client' }).isVisible());
await m.screenshot({ path: S + '/new-client-390.jpg' });

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
