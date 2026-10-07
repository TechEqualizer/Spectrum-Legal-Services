// Showlnk's home page: the waitlist. "Get on the list" saves an email and an
// Instagram handle; full admins see the list in Settings → Waitlist.
import { animationsDone, chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

// Desktop: the flyer, the reels and the stub.
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/?src=instagram'); await settle(p, 1500);
check('Showlnk title', /^Showlnk/.test(await p.title()), await p.title());
check('the promise in one line', (await p.getByRole('heading', { level: 1 }).innerText()).replace(/\s+/g, ' ').toLowerCase() === "don't just announce the night. invite them into it.");
check('no law firm left', !/attorney|injury|law firm/i.test(await p.locator('body').innerText()));
check('the form is on the first screen', (await p.locator('#join').boundingBox()).y < 900);
check('the board has no sample label', await p.getByText(/Sample numbers/).count() === 0);
check('the opening scene is in the hero', await p.getByRole('img', { name: /Big Love Productions' Showlnk link/ }).isVisible());
check('headings read light on the night', await p.getByRole('heading', { level: 1 }).evaluate((h) => getComputedStyle(h).color) === 'rgb(244, 238, 228)');
await animationsDone(p, 2500);
await p.screenshot({ path: S + '/landing-1440.jpg' });
await p.screenshot({ path: S + '/landing-1440-full.jpg', fullPage: true });

// The board runs up when it scrolls into view, and lands on its numbers.
const board = p.getByRole('figure').filter({ hasText: 'Ticket clicks by source' });
check('the board waits below the fold', /^0 visitors/.test(await board.locator('tbody tr').first().locator('td').nth(1).innerText()));
await board.evaluate((f) => f.scrollIntoView({ block: 'center' }));
await p.waitForFunction(() => document.body.innerText.includes('61 tickets') && document.body.innerText.includes('12 tickets'), null, { timeout: 6000 }).catch(() => {});
check('the board counts up to its numbers', await board.getByText('412 visitors').isVisible() && await board.getByText('61 tickets').isVisible());
await animationsDone(p, 500);
await board.screenshot({ path: S + '/landing-board.jpg' });
await p.evaluate(() => scrollTo(0, 0));

// Errors name the field and the fix.
const stub = p.locator('#join');
await stub.getByRole('button', { name: 'Get on the list' }).click(); await settle(p, 200);
check('needs an email', await stub.getByRole('alert').filter({ hasText: 'Enter your email' }).isVisible() && (await stub.getByLabel('Email').getAttribute('aria-invalid')) === 'true');
await stub.getByLabel('Email').fill('Promo@NightOwls.com');
await stub.getByRole('button', { name: 'Get on the list' }).click(); await settle(p, 200);
check('needs an Instagram', await stub.getByRole('alert').filter({ hasText: 'Add your Instagram' }).isVisible());
await stub.getByLabel('Instagram').fill('not a handle!');
await stub.getByRole('button', { name: 'Get on the list' }).click(); await settle(p, 200);
check('says when the handle is wrong', await stub.getByRole('alert').filter({ hasText: "doesn't look like an Instagram handle" }).isVisible());

// On the list: the stub is stamped.
await stub.getByLabel('Instagram').fill('https://instagram.com/NightOwls.Det/');
await stub.getByRole('button', { name: 'Get on the list' }).click(); await settle(p, 1200);
check("stamped: you're on the list", await stub.getByText("You're on the list").isVisible() && await stub.getByText('promo@nightowls.com', { exact: false }).count() + await stub.getByText('Promo@NightOwls.com').count() > 0);
await animationsDone(p, 1500);
await stub.screenshot({ path: S + '/landing-stub-done.jpg' });

// The API: one entry per email, bots ignored, bad input refused.
const again = await p.request.post(B + '/api/waitlist', { data: { email: 'promo@nightowls.com', instagram: '@nightowls_det' } });
const bot = await p.request.post(B + '/api/waitlist', { data: { email: 'bot@spam.com', instagram: 'bot', website: 'http://spam' } });
const bad = await p.request.post(B + '/api/waitlist', { data: { email: 'nope', instagram: 'x' } });
check('joining twice is fine', again.ok());
check('a bad email is refused', bad.status() === 400 && (await bad.json()).field === 'email');

// Settings → Waitlist, for full admins.
const admin = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
const a = await admin.newPage(); a.on('pageerror', (e) => errs.push(e.message));
await a.goto(B + '/admin/settings'); await settle(a, 1500);
const list = a.getByRole('region', { name: 'Waitlist' });
const text = await list.innerText();
check('waitlist in Settings', /1 person asked for early access/.test(text), text.slice(0, 200));
check('one entry per email, newest handle, source kept', text.includes('promo@nightowls.com') && text.includes('@nightowls_det') && !text.includes('bot@spam.com') && text.includes('Instagram'), text.slice(0, 300));
check('their Instagram opens', (await list.getByRole('link', { name: '@nightowls_det' }).getAttribute('href')) === 'https://instagram.com/nightowls_det');
check('CSV offered', await list.getByRole('button', { name: 'Download CSV' }).isVisible());
const org = await b.newContext();
await org.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check('organizers can\'t read it', (await org.request.get(B + '/api/admin/waitlist')).status() === 403);
const op = await org.newPage(); await op.goto(B + '/admin/settings'); await settle(op, 1200);
check('organizers: no Waitlist section', await op.getByRole('region', { name: 'Waitlist' }).count() === 0);
check('signed out: refused', (await (await b.newContext()).request.get(B + '/api/admin/waitlist')).status() === 401);

// Phone: "Get on the list" in thumb reach until a stub is in view.
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
m.on('pageerror', (e) => errs.push(e.message));
await m.goto(B + '/'); await settle(m, 1500); await animationsDone(m, 2500);
const dock = m.locator('.sl-dock');
check('phone: the stub is on the first screen, so no dock', (await m.locator('#join').boundingBox()).y < 844 && (await dock.getAttribute('data-hidden')) === '');
check('phone: no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: S + '/landing-390.jpg' });
await m.getByRole('heading', { name: /Know which post/ }).evaluate((h) => h.scrollIntoView({ block: 'center' }));
// The page scrolls smoothly: wait for the dock to answer, not a fixed time.
await m.waitForFunction(() => !document.querySelector('.sl-dock').hasAttribute('data-hidden'), null, { timeout: 5000 }).catch(() => {}); await animationsDone(m, 1000);
check('phone: past the stub, the dock shows', (await dock.getAttribute('data-hidden')) === null && await dock.getByRole('link', { name: 'Get on the list' }).isVisible());
await dock.getByRole('link', { name: 'Get on the list' }).tap();
await m.waitForFunction(() => document.querySelector('.sl-dock').hasAttribute('data-hidden'), null, { timeout: 5000 }).catch(() => {}); await animationsDone(m, 1000);
check('phone: the dock takes you to the stub, then steps aside', (await dock.getAttribute('data-hidden')) === '' && await m.locator('#join').getByLabel('Email').isVisible());
await m.screenshot({ path: S + '/landing-390-stub.jpg' });
// Each section rises in as it scrolls into view, and ends fully shown.
const reveal = async (name) => {
  await m.getByRole('heading', { name }).evaluate((h) => h.scrollIntoView({ block: 'center' }));
  await m.waitForFunction((n) => [...document.querySelectorAll('h2')].some((h) => h.textContent.includes(n) && getComputedStyle(h).opacity === '1'), name.source, { timeout: 5000 }).catch(() => {});
  return m.getByRole('heading', { name }).evaluate((h) => getComputedStyle(h).opacity);
};
const below = await m.getByRole('heading', { name: /The night ends/ }).evaluate((h) => Number(getComputedStyle(h).opacity));
check('phone: a section waits below until you reach it', below < 1, String(below));
check('phone: board numbers stay on one line', await m.locator('[data-tickets], [data-visitors]').evaluateAll((tds) => tds.every((td) => { const r = document.createRange(); r.selectNodeContents(td); return r.getClientRects().length === 1; })));
check('phone: the lineup arrives', (await reveal(/lineup/)) === '1');
await m.waitForFunction(() => new Promise((r) => { const y = scrollY; requestAnimationFrame(() => requestAnimationFrame(() => r(scrollY === y))); })); await animationsDone(m, 800); await m.screenshot({ path: S + '/landing-390-lineup.jpg' });
check('phone: the last call arrives', (await reveal(/The night ends/)) === '1');
await m.waitForFunction(() => new Promise((r) => { const y = scrollY; requestAnimationFrame(() => requestAnimationFrame(() => r(scrollY === y))); })); await animationsDone(m, 800); await m.screenshot({ path: S + '/landing-390-after.jpg' });



check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
