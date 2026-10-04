// Settings: an admin's photo and name (shown in the sidebar), their account,
// and what they can edit.
import { chromium, settle } from '../browser.mjs';
import { fileURLToPath } from 'node:url';
const S = process.argv[2]; const B = 'http://localhost:3002';
const PHOTO = fileURLToPath(new URL('../../../public/clients/masquerade/masks-on.jpg', import.meta.url));
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

// Desktop: Settings in the sidebar.
const desk = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
const p = await desk.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/events'); await settle(p, 1000);
await p.getByRole('link', { name: 'Settings' }).first().click(); await p.waitForURL(/\/admin\/settings$/); await settle(p, 800);
check('Settings from the sidebar', (await p.getByRole('heading', { level: 1 }).textContent()).trim() === 'Settings');
check('full access explained', (await p.locator('main').innerText()).includes('Full access.'));

// Name: saved, then shown in the sidebar instead of the email.
const nameField = p.getByLabel('Name', { exact: true });
await nameField.fill('Devante W');
await p.getByRole('button', { name: 'Save' }).click(); await settle(p, 1200);
check('name saved', await p.getByRole('button', { name: /Saved/ }).isVisible() || (await nameField.inputValue()) === 'Devante W');
check('sidebar shows the name', (await p.locator('nav').innerText()).includes('Devante W'));
check('account menu named', await p.locator('summary[aria-label="Account: Devante W"]').count() === 1);

// Photo: a big photo goes up as a small square and shows in the sidebar.
await p.getByLabel('Choose a photo', { exact: true }).setInputFiles(PHOTO); await settle(p, 2000);
const navImg = p.locator('nav summary img');
const src = await navImg.getAttribute('src').catch(() => null);
check('photo in the sidebar', Boolean(src && src.includes('/storage/v1/object/public/avatars/user-tester/')), String(src));
const size = await navImg.evaluate((i) => [i.naturalWidth, i.naturalHeight]).catch(() => [0, 0]);
check('stored as a small square', size[0] === 320 && size[1] === 320, size.join('x'));
check('Change photo offered', await p.getByRole('button', { name: 'Change photo', exact: true }).isVisible());
await p.screenshot({ path: S + '/settings-1440.jpg', fullPage: true });

await p.getByRole('button', { name: 'Remove photo' }).click(); await settle(p, 1200);
check('photo removed: initial again', await p.locator('nav summary img').count() === 0 && await p.getByRole('button', { name: 'Add photo', exact: true }).isVisible());

const wrong = await p.request.post(B + '/api/admin/avatar', { headers: { 'Content-Type': 'text/plain' }, data: 'not a photo' });
check('only photos accepted', wrong.status() === 415, String(wrong.status()));
const anon = await (await b.newContext()).request.post(B + '/api/admin/profile', { data: { name: 'x' } });
check('signed out: refused', anon.status() === 401, String(anon.status()));

// Superadmin: every account, and managing their access.
await p.reload(); await settle(p, 1500);
const accounts = p.getByRole('region', { name: 'Accounts' });
let list = await accounts.innerText();
check('accounts listed', list.includes('tester@example.com') && list.includes('You') && list.includes('organizer@example.com') && list.includes('Big Love Productions'), list.slice(0, 300));
check("can't change yourself", await accounts.getByRole('button', { name: 'Change access for tester@example.com' }).count() === 0);
await accounts.getByRole('button', { name: 'Add account' }).click();
const sheet = p.locator('dialog[open]');
await sheet.getByLabel('Email').fill('Promoter@Example.com');
await sheet.getByRole('button', { name: 'Add account' }).click(); await settle(p, 500);
check('needs some access', await sheet.getByRole('alert').filter({ hasText: 'at least one organizer' }).isVisible());
await sheet.getByLabel(/Big Love Productions/).check();
await sheet.getByRole('button', { name: 'Add account' }).click(); await settle(p, 1200);
list = await accounts.innerText();
check('account added with its organizer', /promoter@example\.com\s*Big Love Productions/.test(list), list.slice(0, 400));
check('says to send their login', list.includes('Send their login next') && /promoter@example\.com\s*Big Love Productions · No login yet/.test(list), list.slice(0, 400));

// Send login: a temporary password, shown once, that really signs them in.
await accounts.getByRole('button', { name: 'Send login to promoter@example.com' }).click(); await settle(p, 1500);
const card = await accounts.innerText();
const temp = card.match(/temporary password\s+([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})/)?.[1];
check('login created, password shown once', Boolean(temp) && card.includes("Email isn't set up") && card.includes('/admin/login'), card.slice(0, 300));
check('copy login details offered', await accounts.getByRole('button', { name: 'Copy login details' }).isVisible());
const promo = await b.newContext({ viewport: { width: 1280, height: 900 } });
const signIn = await promo.request.post(B + '/api/admin/login', { data: { email: 'promoter@example.com', password: temp ?? 'x' } });
check('they can sign in with it', signIn.ok(), String(signIn.status()));
const pp = await promo.newPage();
await pp.goto(B + '/admin/events'); await settle(pp, 1200);
check('they must choose their own password', await pp.locator('dialog[open]').count() === 1 && /password/i.test(await pp.locator('dialog[open]').innerText()));
await promo.close();
await accounts.getByRole('button', { name: 'Done' }).click();
await p.reload(); await settle(p, 1500);
list = await accounts.innerText();
check('now shows their sign-in', /promoter@example\.com\s*Big Love Productions · Last signed in/.test(list), list.slice(0, 400));
check('reset offered once they have a login', await accounts.getByRole('button', { name: 'Reset password for promoter@example.com' }).isVisible());
const notListed = await p.request.post(B + '/api/admin/accounts/invite', { data: { email: 'nobody@example.com' } });
check('only listed accounts get logins', notListed.status() === 404, String(notListed.status()));
await accounts.getByRole('button', { name: 'Change access for promoter@example.com' }).click();
await sheet.getByLabel(/^Full access/).check();
await sheet.getByRole('button', { name: 'Save' }).click(); await settle(p, 1200);
check('access changed to full', /promoter@example\.com\s*Full access/.test(await accounts.innerText()));
await accounts.getByRole('button', { name: 'Remove promoter@example.com' }).click();
await accounts.getByRole('button', { name: 'Remove', exact: true }).click(); await settle(p, 1200);
check('account removed', !(await accounts.getByRole('list').innerText()).includes('promoter@example.com') && (await accounts.innerText()).includes("can't sign in to the admin any more"));
const self = await p.request.post(B + '/api/admin/accounts', { data: { email: 'tester@example.com', full: false, organizers: ['biglove'] } });
check("can't demote yourself", self.status() === 400, String(self.status()));
await p.screenshot({ path: S + '/accounts-1440.jpg', fullPage: true });

// Organizers: each one's photo, shown beside their name on every reel.
const orgs = p.getByRole('region', { name: 'Organizers' });
check('organizers listed with their initial', (await orgs.innerText()).includes('Big Love Productions') && await orgs.getByRole('button', { name: 'Add photo for Big Love Productions' }).isVisible());
await orgs.locator('input[type="file"]').first().setInputFiles(PHOTO); await settle(p, 2000);
const orgImg = orgs.locator('img').first();
const orgSrc = await orgImg.getAttribute('src').catch(() => null);
check('organizer photo saved', Boolean(orgSrc && orgSrc.includes('/storage/v1/object/public/avatars/organizers/biglove/')), String(orgSrc));
check('Change and Remove offered', await orgs.getByRole('button', { name: 'Change photo for Big Love Productions' }).isVisible() && await orgs.getByRole('button', { name: 'Remove photo for Big Love Productions' }).isVisible());
const visitor = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await visitor.goto(B + '/f/masquerade'); await settle(visitor, 1000);
await visitor.getByRole('button', { name: /Sneak peek/ }).first().click(); await settle(visitor, 1500);
check('reels show the organizer photo instead of the initial', await visitor.locator(`img[src="${orgSrc}"]`).count() > 0);
await orgs.getByRole('button', { name: 'Remove photo for Big Love Productions' }).click(); await settle(p, 1500);
check('organizer photo removed: initial again', await orgs.locator('img').count() === 0 && await orgs.getByRole('button', { name: 'Add photo for Big Love Productions' }).isVisible());
await visitor.reload(); await settle(visitor, 1000);
await visitor.getByRole('button', { name: /Sneak peek/ }).first().click(); await settle(visitor, 1500);
check('reels back to the initial', await visitor.locator('img[src*="/avatars/organizers/"]').count() === 0);
await visitor.context().close();
const strangerCtx = await b.newContext();
await strangerCtx.request.post(B + '/api/admin/login', { data: { email: 'stranger@example.com', password: 'stranger-pass-1' } });
const notTheirs = await strangerCtx.request.post(B + '/api/admin/organizer-photo?organizer=biglove', { headers: { 'Content-Type': 'image/jpeg' }, data: Buffer.from('x') });
check("someone else's organizer: refused", [401, 403].includes(notTheirs.status()), String(notTheirs.status()));
await strangerCtx.close();

// Phone: Settings from the account menu, nothing sideways.
const phone = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await phone.newPage(); m.on('pageerror', (e) => errs.push(e.message));
await m.goto(B + '/admin/events'); await settle(m, 1000);
await m.locator('summary[aria-label^="Account"]').click();
await m.getByRole('link', { name: 'Settings' }).click(); await m.waitForURL(/\/admin\/settings$/); await settle(m, 800);
check('phone: Settings from the account menu', (await m.getByRole('heading', { level: 1 }).textContent()).trim() === 'Settings' && await m.locator('details[open]').count() === 0);
check('phone: no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: S + '/settings-390.jpg', fullPage: true });

// An organizer sees what they run.
const org = await b.newContext({ viewport: { width: 1280, height: 900 } });
await org.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
const o = await org.newPage(); o.on('pageerror', (e) => errs.push(e.message));
await o.goto(B + '/admin/settings'); await settle(o, 1000);
const access = await o.locator('main').innerText();
check('organizer: no Accounts', await o.getByRole('region', { name: 'Accounts' }).count() === 0);
check('organizer: accounts API refused', (await o.request.get(B + '/api/admin/accounts')).status() === 403);
check('organizer: cannot send logins', (await o.request.post(B + '/api/admin/accounts/invite', { data: { email: 'promoter@example.com' } })).status() === 403);
check("organizer: their organizer listed", access.includes('Big Love Productions') && access.includes('/f/biglove') && !access.includes('Full access'));
check('organizer: can set their photo', await o.getByRole('button', { name: 'Add photo for Big Love Productions' }).isVisible());

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
