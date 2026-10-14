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
// A phone's share sheet, recorded: each call's files, and a refusal when asked for one (a tap too long ago).
await m.addInitScript(() => {
  window.__shared = []; window.__refuse = 0;
  navigator.canShare = () => true;
  navigator.share = (data) => {
    window.__shared.push(data.files.map((f) => [f.name, f.type, f.size]));
    if (window.__refuse > 0) { window.__refuse--; return Promise.reject(new DOMException('No tap', 'NotAllowedError')); }
    return Promise.resolve();
  };
});
const p = await m.newPage(); p.on('pageerror', (e) => errs.push(e.message));
// Big Love's link, published with an opening on its flyer: what the story video is made from.
const opening = { mood: 'glamour', beats: [{ box: { x: 0.2, y: 0.1, w: 0.6, h: 0.4 }, move: 'pull', seconds: 2, text: { lines: ['Masks on.'], at: 'bottom', size: 'big' } }, { box: { x: 0.1, y: 0.5, w: 0.8, h: 0.4 }, move: 'tilt-up', seconds: 1.7 }], hold: { x: 0.2, y: 0.3, w: 0.6, h: 0.4 } };
const reels = [{ id: 'mr-masks-on', title: 'Masks on. Secrets revealed.', summary: 'x', practiceArea: 'The night', cta: 'funnel' }];
const published = await m.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade', publication: { version: 1, reels, funnel: { order: reels.map((r) => r.id), topics: {}, paths: {}, primaryCta: 'tickets' }, backdrop: { kind: 'image', src: '/clients/masquerade/flyer.jpg', fit: 'poster', opening } } } });
check('published with an opening', published.ok(), String(published.status()));
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
// In view: scrolled to it, or as far as the page goes (its top, and room below it, on screen).
check('A link for one place: the link builder, in view', builder && builder.y >= 0 && builder.y < 844 - 300, JSON.stringify(builder));
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
const input = await story.locator('[data-story]').getAttribute('data-story');
await story.getByRole('button', { name: 'Close' }).tap(); await settle(p, 300);

// Made once, it stays on this phone: the next post is one tap from the menu.
// (This test browser can't encode H.264, so a made video is put where the app keeps it.)
const keep = (input) => p.evaluate(async (input) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('showlnk-stories', 1); r.onupgradeneeded = () => r.result.createObjectStore('videos'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const tx = db.transaction('videos', 'readwrite'); tx.objectStore('videos').put({ input, video: new Blob([new Uint8Array(2048)], { type: 'video/mp4' }) }, 'biglove-story.mp4'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
}, input);
const storyItem = () => menu.getByRole('button', { name: /Post to your story/ });
await keep('{"an":"older cut"}');
await plus.tap(); await settle(p, 400);
check('a video made for another cut is not offered', /Your opening as a video/.test(await storyItem().innerText()), await storyItem().innerText());
await p.keyboard.press('Escape'); await settle(p, 200);
await keep(input);
await p.evaluate(() => navigator.clipboard.writeText(''));
await plus.tap(); await settle(p, 400);
check('the menu says it is ready to post', /Ready: one tap/.test(await storyItem().innerText()), await storyItem().innerText());
await storyItem().tap(); await settle(p, 500);
const shared = await p.evaluate(() => window.__shared);
check('one tap: the share sheet opens with the video', JSON.stringify(shared) === '[[["biglove-story.mp4","video/mp4",2048]]]', JSON.stringify(shared));
check('and the link is copied for the Link sticker', /\/f\/biglove$/.test(await p.evaluate(() => navigator.clipboard.readText())));
check('no sheet in between, and the menu closes', !(await story.isVisible()) && !(await menu.isVisible().catch(() => false)));

// The phone refuses (the tap was too long ago): the sheet, ready, with Share to tap again.
await p.evaluate(() => { window.__refuse = 1; });
await plus.tap(); await settle(p, 400);
await storyItem().tap(); await settle(p, 600);
check('refused: the sheet opens with the video ready', await story.isVisible() && await story.getByRole('button', { name: 'Share video' }).isVisible());
check('it says how to post it, sticker included', /Link sticker/.test(await story.getByRole('list', { name: 'How to post it' }).innerText().catch(() => '')));
await p.screenshot({ path: 'plus-story-ready-390.png' });
await story.getByRole('button', { name: 'Share video' }).tap(); await settle(p, 400);
check('Share again: the share sheet opens', (await p.evaluate(() => window.__shared.length)) === 3 && /link is copied/.test(await story.getByRole('status').innerText()));
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

// Desktop: no floating + (that's the phone's); the sidebar lists the same actions under Create.
const d = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
await d.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const dp = await d.newPage(); dp.on('pageerror', (e) => errs.push(e.message));
await dp.goto(B + '/admin/home'); await settle(dp, 1000);
const side = dp.getByRole('navigation', { name: 'Admin' });
check('desktop: no floating + button', (await dp.getByRole('button', { name: 'Create', exact: true }).filter({ visible: true }).count()) === 0);
const group = side.getByRole('region', { name: 'Create' });
const rows = (await group.getByRole('button').allInnerTexts()).map((t) => t.trim());
check('desktop: Create lists the actions as sidebar rows', JSON.stringify(rows) === '["Post to your story","Copy your link","A link for one place","Add a video","New night"]', JSON.stringify(rows));
const placeBox = await side.locator('ul a').first().boundingBox(), rowBox = await group.getByRole('button').first().boundingBox();
check('desktop: rows line up with the places', placeBox && rowBox && Math.abs(placeBox.x - rowBox.x) < 1 && Math.abs(placeBox.width - rowBox.width) < 1 && rowBox.height >= 44, JSON.stringify({ placeBox, rowBox }));
await group.getByRole('button', { name: 'Copy your link' }).click(); await settle(dp, 300);
check('desktop: Copy your link copies it, and says so', /\/f\/biglove$/.test(await dp.evaluate(() => navigator.clipboard.readText())) && await group.getByText('Link copied').isVisible());
await dp.screenshot({ path: 'plus-menu-1440.png' });
check('desktop: the same four places', JSON.stringify(await side.locator('ul a').allTextContents()) === '["Tonight","Link","People","Results"]');
await group.getByRole('button', { name: 'Add a video' }).click();
await dp.waitForURL(/\/admin$/); await settle(dp, 1500);
check('desktop: Add a video opens the new reel', await dp.locator('dialog[open]').count() === 1);
await dp.keyboard.press('Escape'); await settle(dp, 300);
// Folded to icons: each row names itself in a tooltip.
await side.getByRole('button', { name: 'Collapse sidebar' }).click(); await settle(dp, 400);
await group.getByRole('button', { name: 'Post to your story' }).hover(); await settle(dp, 200);
check('desktop folded: icons, with a tooltip naming each', (await dp.getByRole('tooltip').innerText().catch(() => '')) === 'Post to your story');
await dp.screenshot({ path: 'plus-folded-1440.png' });
await side.getByRole('button', { name: 'Expand sidebar' }).click(); await settle(dp, 300);
await d.close();

check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
