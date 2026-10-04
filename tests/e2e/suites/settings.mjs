// Settings: an admin's photo and name (shown in the sidebar), their account,
// and what they can edit.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const S = process.argv[2]; const B = 'http://localhost:3002';
const PHOTO = fileURLToPath(new URL('../../../public/clients/masquerade/masks-on.jpg', import.meta.url));
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

// Desktop: Settings in the sidebar.
const desk = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
const p = await desk.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/events'); await p.waitForTimeout(1000);
await p.getByRole('link', { name: 'Settings' }).first().click(); await p.waitForURL(/\/admin\/settings$/); await p.waitForTimeout(800);
check('Settings from the sidebar', (await p.getByRole('heading', { level: 1 }).textContent()).trim() === 'Settings');
check('full access explained', (await p.locator('main').innerText()).includes('Full access.'));

// Name: saved, then shown in the sidebar instead of the email.
const nameField = p.getByLabel('Name', { exact: true });
await nameField.fill('Devante W');
await p.getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(1200);
check('name saved', await p.getByRole('button', { name: /Saved/ }).isVisible() || (await nameField.inputValue()) === 'Devante W');
check('sidebar shows the name', (await p.locator('nav').innerText()).includes('Devante W'));
check('account menu named', await p.locator('summary[aria-label="Account: Devante W"]').count() === 1);

// Photo: a big photo goes up as a small square and shows in the sidebar.
await p.locator('input[type="file"]').setInputFiles(PHOTO); await p.waitForTimeout(2000);
const navImg = p.locator('nav summary img');
const src = await navImg.getAttribute('src').catch(() => null);
check('photo in the sidebar', Boolean(src && src.includes('/storage/v1/object/public/avatars/user-tester/')), String(src));
const size = await navImg.evaluate((i) => [i.naturalWidth, i.naturalHeight]).catch(() => [0, 0]);
check('stored as a small square', size[0] === 320 && size[1] === 320, size.join('x'));
check('Change photo offered', await p.getByRole('button', { name: 'Change photo' }).isVisible());
await p.screenshot({ path: S + '/settings-1440.jpg', fullPage: true });

await p.getByRole('button', { name: 'Remove' }).click(); await p.waitForTimeout(1200);
check('photo removed: initial again', await p.locator('nav summary img').count() === 0 && await p.getByRole('button', { name: 'Add photo' }).isVisible());

const wrong = await p.request.post(B + '/api/admin/avatar', { headers: { 'Content-Type': 'text/plain' }, data: 'not a photo' });
check('only photos accepted', wrong.status() === 415, String(wrong.status()));
const anon = await (await b.newContext()).request.post(B + '/api/admin/profile', { data: { name: 'x' } });
check('signed out: refused', anon.status() === 401, String(anon.status()));

// Phone: Settings from the account menu, nothing sideways.
const phone = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await phone.newPage(); m.on('pageerror', (e) => errs.push(e.message));
await m.goto(B + '/admin/events'); await m.waitForTimeout(1000);
await m.locator('summary[aria-label^="Account"]').click();
await m.getByRole('link', { name: 'Settings' }).click(); await m.waitForURL(/\/admin\/settings$/); await m.waitForTimeout(800);
check('phone: Settings from the account menu', (await m.getByRole('heading', { level: 1 }).textContent()).trim() === 'Settings' && await m.locator('details[open]').count() === 0);
check('phone: no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: S + '/settings-390.jpg', fullPage: true });

// An organizer sees what they run.
const org = await b.newContext({ viewport: { width: 1280, height: 900 } });
await org.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
const o = await org.newPage(); o.on('pageerror', (e) => errs.push(e.message));
await o.goto(B + '/admin/settings'); await o.waitForTimeout(1000);
const access = await o.locator('main').innerText();
check("organizer: their organizer listed", access.includes('Big Love Productions') && access.includes('/f/biglove') && !access.includes('Full access'));

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
