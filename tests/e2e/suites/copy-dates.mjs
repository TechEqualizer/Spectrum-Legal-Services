import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
for (const c of [ctx]) {
  await c.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await c.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
}
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
const waitShown = (loc) => loc.waitFor({ timeout: 5000 }).then(() => true, () => false);

await p.goto(B + '/admin'); await settle(p, 600);
await p.selectOption('#admin-business', 'masquerade'); await settle(p, 1300);
const card = p.locator('section[aria-labelledby="hero-media-title"]');
check('card shows the title', await card.getByText('“Masquerade on the Runway”').isVisible());
const dates = p.locator('section[aria-labelledby="dates-title"]');
check('dates card: 1 upcoming', await dates.locator(':scope > ul > li').count() === 1);
check('dates card: no past dates', await dates.getByText(/Past dates/).count() === 0);
await p.screenshot({ path: S + '/dates-card-390.jpg', fullPage: false });

// 1. Words
await card.getByRole('button', { name: 'Edit', exact: true }).click();
const sheet = p.locator('dialog[open]');
check('sheet shows built-in words', (await sheet.getByLabel('Title').inputValue()) === 'Masquerade on the Runway');
await sheet.getByLabel('Title').fill('Masks on, Detroit.');
await sheet.getByLabel('Main button').fill('Step inside');
check('preview updates as you type', await sheet.getByText('Masks on, Detroit.').first().isVisible() && await sheet.getByText('Step inside', { exact: true }).isVisible());
const save = await sheet.getByRole('button', { name: 'Save', exact: true }).boundingBox();
check('Save in view on a phone', save.y + save.height <= 844, String(save.y + save.height));
await p.screenshot({ path: S + '/screen-sheet-390.jpg' });
await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 300);
check('words saved', await card.getByText('“Masks on, Detroit.”').isVisible() && await card.getByText('not published').isVisible());
check('toast confirms', await p.getByRole('status').filter({ hasText: 'Opening screen saved' }).isVisible());
check('publish bar appears', await p.getByRole('region', { name: 'Publish' }).getByText('Unpublished edits').isVisible());

// 2. Edit a date
await dates.locator(':scope > ul > li').first().getByRole('button').click();
const ds = p.locator('dialog[open]');
check('date sheet title', await ds.getByRole('heading', { name: 'Edit date' }).isVisible());
await ds.getByLabel('Price').fill('From $40');
await ds.getByRole('radio', { name: 'Few left' }).click();
check('segmented control selects', (await ds.getByRole('radio', { name: 'Few left' }).getAttribute('aria-checked')) === 'true');
await p.screenshot({ path: S + '/date-sheet-390.jpg' });
await ds.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 300);
const first = dates.locator(':scope > ul > li').first();
check('row shows new price and status', (await first.textContent()).includes('From $40') && (await first.textContent()).includes('Few left'));

// 3. Add a date
await dates.getByRole('button', { name: 'Add date', exact: true }).click();
check('new date prefilled', (await ds.getByLabel('Name').inputValue()) === 'Masquerade on the Runway' && (await ds.getByLabel('Date').inputValue()) !== '');
await ds.getByRole('button', { name: 'Add date' }).click(); await settle(p, 200);
check('ticket link required, explained', await waitShown(ds.getByRole('alert').filter({ hasText: 'starting with https://' })));
await ds.getByLabel('Ticket link').fill('https://example.com/tickets/new-night');
await ds.getByLabel('Name').fill('Masquerade on the Runway: After Party');
await ds.getByRole('button', { name: 'Add date' }).click(); await settle(p, 300);
// The reel editor opens for the new date; closing it keeps the date (add its reel later).
await p.keyboard.press('Escape'); await settle(p, 300);
check('date added', await dates.locator(':scope > ul > li').count() === 2 && await p.getByRole('status').filter({ hasText: 'Date added' }).isVisible());

// 4. Delete with Undo
const party = () => dates.locator(':scope > ul > li').filter({ hasText: 'After Party' });
await party().getByRole('button').click();
await ds.getByRole('button', { name: 'Delete' }).click(); await settle(p, 300);
check('deleted at once', await dates.locator(':scope > ul > li').count() === 1);
await p.getByRole('status').getByRole('button', { name: 'Undo' }).click(); await settle(p, 300);
check('Undo brings it back', await dates.locator(':scope > ul > li').count() === 2);

// 5. Reload keeps it all
await p.reload(); await settle(p, 1500);
check('after reload: words and dates kept', await card.getByText('“Masks on, Detroit.”').isVisible() && await dates.locator(':scope > ul > li').count() === 2);

// 6. Publish
await p.getByRole('region', { name: 'Publish' }).getByRole('button', { name: 'Publish' }).click();
await settle(p, 1500);
check('published', await p.getByRole('region', { name: 'Publish' }).count() === 0);
const pub = (await (await fetch(M + '/__state')).json()).publications.find(x => x.slug === 'masquerade')?.data;
check('stored words', pub?.screen?.title === 'Masks on, Detroit.' && pub?.screen?.watchLabel === 'Step inside' && !('heading' in pub.screen));
check('stored dates', pub?.events?.length === 2 && pub.events.some(e => e.name === 'Masquerade on the Runway: After Party') && pub.events.some(e => e.id === 'mr-2026' && e.price === 'From $40' && e.status === 'few_left'), JSON.stringify(pub?.events?.map(e => e.id)));
check('nothing flagged after publish', !(await card.getByText('not published').isVisible()) && !(await dates.getByText('Not published.').isVisible()));

// 7. What visitors see
const v = await b.newContext({ timezoneId: 'America/Detroit',  viewport: { width: 390, height: 844 } });
await v.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await v.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const vp = await v.newPage();
await vp.goto(B + '/f/masquerade'); await settle(vp, 2600);
check('live title', (await vp.locator('h1').innerText()).trim() === 'Masks on, Detroit.');
check('live button label', await vp.getByRole('button', { name: /^(Step inside|Watch)$/ }).isVisible());
const circles = await vp.locator('main ul > li button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
check('live dates: both nights', circles.length === 2 && circles.some(c => c.includes('After Party')), circles.join(' | '));
check('live eyebrow: few left date', await vp.getByText(/Next up/).isVisible());
check('still fits one screen', await vp.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
await vp.screenshot({ path: S + '/live-copy-dates.jpg' });

// 8. A funnel without dates: heading and intro
await p.selectOption('#admin-business', 'jlf'); await settle(p, 1300);
check('no dates card for JLF', await p.locator('section[aria-labelledby="dates-title"]').count() === 0);
await card.getByRole('button', { name: 'Edit', exact: true }).click();
check('JLF fields: heading and intro', await sheet.getByLabel('Heading').isVisible() && await sheet.getByLabel('Intro').isVisible() && await sheet.getByLabel('Title').count() === 0);
await sheet.getByLabel('Heading').fill('Hurt in a crash?');
await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 300);
await p.getByRole('region', { name: 'Publish' }).getByRole('button', { name: 'Publish' }).click(); await settle(p, 1500);
await vp.goto(B + '/f/jlf'); await settle(vp, 1500);
check('JLF live heading', (await vp.locator('h1').innerText()).trim() === 'Hurt in a crash?');
// Clearing a field goes back to the original words
await card.getByRole('button', { name: 'Edit', exact: true }).click();
await sheet.getByLabel('Heading').fill('');
await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 300);
check('empty field = original words', await card.getByText('“What happened?”').isVisible());

// Clean up: take both down
for (const slug of ['masquerade', 'jlf']) await p.request.delete(B + '/api/admin/publish?slug=' + slug);
check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
