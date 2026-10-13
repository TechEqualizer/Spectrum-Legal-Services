// The admin's shell on a phone (docs/plans/10-mobile-shell.md): four places
// in a floating pill (Tonight, Link, People, Results), the content scrolling
// under it, and a gold + beside it for what organizers do most: post to
// their story, copy their link, a link for one place, add a video, a new
// night. On desktop the + is Create, at the top of the sidebar.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

const m = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
await m.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const p = await m.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/home'); await settle(p, 1200);

// The pill: floating clear of the edges, rounded, four labeled places, Tonight current.
const pill = p.locator('nav ul').first();
const box = await pill.boundingBox();
const radius = await pill.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
check('a floating pill: clear of the sides and the bottom, fully rounded', box && box.x >= 10 && box.x + box.width <= 390 - 60 && 844 - (box.y + box.height) >= 10 && radius >= 28, JSON.stringify({ box, radius }));
const tabs = pill.locator('a');
check('four places, each named', JSON.stringify(await tabs.allTextContents()) === '["Tonight","Link","People","Results"]', JSON.stringify(await tabs.allTextContents()));
check('Tonight is current', (await tabs.filter({ hasText: 'Tonight' }).getAttribute('aria-current')) === 'page');
const targets = await tabs.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
check('each place at least 48px to tap', targets.every(([w, h]) => w >= 48 && h >= 48), JSON.stringify(targets));
await p.screenshot({ path: 'plus-pill-390.png' });

// The +: beside the pill, gold, opens what they do most and turns into a close.
const plus = p.getByRole('button', { name: 'Create' });
const plusBox = await plus.boundingBox();
check('the + sits beside the pill, as tall as it', plusBox && Math.abs(plusBox.y - box.y) <= 2 && plusBox.x > box.x + box.width && plusBox.height >= 56, JSON.stringify(plusBox));
await plus.tap(); await settle(p, 400);
const menu = p.getByRole('group', { name: 'Create' });
const items = (await menu.getByRole('button').allTextContents()).map((t) => t.replace(/([a-z])([A-Z])/g, '$1 $2'));
check('what they do most, most used first', /^Post to your story/.test(items[0] ?? '') && /^Copy your link/.test(items[1] ?? '') && /^A link for one place/.test(items[2] ?? '') && /^Add a video/.test(items[3] ?? '') && /^New night/.test(items[4] ?? ''), JSON.stringify(items));
check('the + is now a close', await p.getByRole('button', { name: 'Close' }).first().isVisible() && (await p.getByRole('button', { name: 'Close' }).first().getAttribute('aria-expanded')) === 'true');
const menuBox = await menu.boundingBox();
check('the menu rises from the +, on screen', menuBox && menuBox.y + menuBox.height <= plusBox.y && menuBox.x >= 0 && menuBox.x + menuBox.width <= 390, JSON.stringify(menuBox));
await p.screenshot({ path: 'plus-menu-390.png' });
await p.keyboard.press('Escape'); await settle(p, 200);
check('Escape closes it', !(await menu.isVisible().catch(() => false)));

// Copy your link: the organizer's link, said so in place.
await plus.tap(); await settle(p, 300);
await menu.getByRole('button', { name: /Copy your link/ }).tap(); await settle(p, 300);
const copied = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
check('Copy your link: their link, and it says so', /\/f\/biglove$/.test(copied) && await menu.getByText('Link copied').isVisible().catch(() => false), copied);
await p.waitForTimeout(1500);

// A link for one place: the builder, in view.
await plus.tap(); await settle(p, 300);
await menu.getByRole('button', { name: /A link for one place/ }).tap();
await p.waitForURL(/\/admin\/links#place$/); await settle(p, 1200);
const builder = await p.locator('#place').boundingBox();
check('A link for one place: the link builder, in view', builder && builder.y < 300, JSON.stringify(builder));
check('the Share page sits under Results', (await tabs.filter({ hasText: 'Results' }).getAttribute('aria-current')) === 'page');

// Add a video: the new reel's editor, open at once.
await plus.tap(); await settle(p, 300);
await menu.getByRole('button', { name: /Add a video/ }).tap();
await p.waitForURL(/\/admin$/); await settle(p, 1500);
check('Add a video: the new reel, open to fill in', await p.locator('dialog[open]').count() === 1 && !p.url().includes('add='), p.url());
await p.keyboard.press('Escape'); await settle(p, 300);

// New night: its sheet, open at once, under Tonight.
await plus.tap(); await settle(p, 300);
await menu.getByRole('button', { name: /New night/ }).tap();
await p.waitForURL(/\/admin\/events$/); await settle(p, 1200);
check('New night: its sheet, open', await p.locator('dialog[open]').count() === 1 && !p.url().includes('new='));
check('Events sits under Tonight', (await tabs.filter({ hasText: 'Tonight' }).getAttribute('aria-current')) === 'page');
await p.keyboard.press('Escape'); await settle(p, 300);

// Post to your story: its sheet opens straight from the menu.
await plus.tap(); await settle(p, 300);
await menu.getByRole('button', { name: /Post to your story/ }).tap(); await settle(p, 600);
const story = p.getByTestId('post-story');
check('Post to your story: its sheet, making the video or saying what it needs', await story.isVisible() && /Post to your story/.test(await story.innerText()), (await story.innerText().catch(() => '')).slice(0, 160));
await story.getByRole('button', { name: 'Close' }).tap(); await settle(p, 300);

// Nothing hides under the pill: the end of a long page clears it.
await p.goto(B + '/admin/settings'); await settle(p, 1500);
// Settings fills in as its sections load: scroll to the end until it stops growing.
for (let i = 0, last = -1; i < 10; i++) {
  const h = await p.evaluate(() => { window.scrollTo({ top: 1e9, behavior: 'instant' }); return document.documentElement.scrollHeight; });
  if (h === last) break;
  last = h; await p.waitForTimeout(500);
}
// Where main's content ends (its bottom less the room left for the pill).
const lastBottom = await p.evaluate(() => { const main = document.querySelector('main'); return main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom); });
const pillTop = (await pill.boundingBox()).y;
check('the end of a page scrolls clear of the pill', lastBottom <= pillTop, `${Math.round(lastBottom)} vs ${Math.round(pillTop)}`);
await m.close();

// Desktop: Create at the top of the sidebar, its menu beside it.
const d = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
await d.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const dp = await d.newPage(); dp.on('pageerror', (e) => errs.push(e.message));
await dp.goto(B + '/admin/home'); await settle(dp, 1000);
const create = dp.getByRole('navigation', { name: 'Admin' }).getByRole('button', { name: 'Create' });
const shown = await create.isVisible();
await create.click(); await settle(dp, 300);
const dMenu = dp.getByRole('group', { name: 'Create' });
const dBox = await dMenu.boundingBox();
check('desktop: Create in the sidebar, its menu beside it', shown && dBox && dBox.x >= 240, JSON.stringify(dBox));
await dp.screenshot({ path: 'plus-menu-1440.png' });
check('desktop: the same four places', JSON.stringify(await dp.getByRole('navigation', { name: 'Admin' }).locator('ul a').allTextContents()) === '["Tonight","Link","People","Results"]');
await d.close();

check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
