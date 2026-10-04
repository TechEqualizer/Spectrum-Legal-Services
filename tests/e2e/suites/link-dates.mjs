import { chromium } from 'playwright';
const S = process.argv[2]; const B = 'http://localhost:3002'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });

await p.goto(B + '/admin'); await p.waitForTimeout(600);
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(1300);
const dates = p.locator('section[aria-labelledby="dates-title"]');
const row = (text) => dates.locator(':scope > ul > li').filter({ hasText: text });
const reelRows = p.locator('section[aria-labelledby="order-title"] ol > li');
const reelRow = (title) => reelRows.filter({ has: p.locator('p.font-bold', { hasText: title }) });
check('row shows its reel', (await row('Oct 31').textContent()).includes('Masks on. Secrets revealed.'));
check('reel rows show their date', (await reelRow('Masks on').textContent()).includes('Oct 31'));

// 1. Pick which reel the date opens
await row('Oct 31').getByRole('button').click();
const ds = p.locator('dialog[open]');
const pick = ds.getByLabel('Opens with');
check('picker starts on the current reel', (await pick.inputValue()) === 'mr-masks-on', await pick.inputValue());
await pick.selectOption('mr-runway');
check('help says it plays and sells this date', await ds.getByText('Plays when someone taps this date').isVisible());
await p.screenshot({ path: S + '/opens-with-390.jpg' });
await ds.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(300);
check('Oct 31 now opens the runway reel', (await row('Oct 31').textContent()).includes('Haute couture'));

// 2. New date with a new reel
await dates.getByRole('button', { name: 'Add date', exact: true }).click();
check('new date defaults to a new reel', (await pick.inputValue()) === 'new' && await ds.getByText('After saving, add its video').isVisible());
await ds.getByLabel('Name').fill('Masquerade on the Runway: After Party');
await ds.getByLabel('Ticket link').fill('https://example.com/tickets/after-party');
await ds.getByRole('button', { name: 'Add date' }).click(); await p.waitForTimeout(400);
const rd = p.locator('dialog[open]');
check('reel editor opens for it', (await rd.getByLabel('Title').inputValue()) === 'Masquerade on the Runway: After Party');
check('…already selling the new date', (await rd.getByLabel('Sells tickets for').locator('option:checked').textContent()).includes('After Party'));
await rd.getByLabel('Title').fill('The after party, upstairs');
await rd.getByRole('button', { name: 'Add reel' }).click(); await p.waitForTimeout(400);
check('new date opens the new reel', (await row('After Party').textContent()).includes('The after party, upstairs'));
check('new reel added to the funnel', await reelRow('The after party, upstairs').count() === 1);
const partyDay = (await reelRow('The after party, upstairs').textContent()).match(/Nov \d+/)?.[0];
check('new reel sells the new date', Boolean(partyDay));

// 3. Move a reel from one date to another
await row('Oct 31').getByRole('button').click();
const partyReel = await pick.locator('option', { hasText: 'The after party, upstairs' }).getAttribute('value');
await pick.selectOption(partyReel);
check('moving is explained', await ds.getByText(`Moves this reel from ${partyDay}`).isVisible());
await ds.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(300);
check('Oct 31 opens the moved reel', (await row('Oct 31').textContent()).includes('The after party, upstairs'));
check('moved reel now sells Oct 31', (await reelRow('The after party, upstairs').textContent()).includes('Oct 31'));

// 4. The reel editor's date picker
await reelRow('Dress to impress').getByRole('button', { name: /^Edit / }).click();
await rd.getByLabel('Sells tickets for').selectOption({ label: (await rd.getByLabel('Sells tickets for').locator('option', { hasText: 'After Party' }).textContent()) });
await rd.getByRole('button', { name: 'Save reel' }).click(); await p.waitForTimeout(300);
check('reel editor changes its date', (await reelRow('Dress to impress').textContent()).includes(partyDay));

// 5. Publish and tap the dates as a visitor
await p.getByRole('region', { name: 'Publish' }).getByRole('button', { name: 'Publish' }).click(); await p.waitForTimeout(1500);
const pub = (await (await fetch(M + '/__state')).json()).publications.find(x => x.slug === 'masquerade')?.data;
const ev = (id) => pub?.events?.find(e => e.id === id);
check('published links', ev('mr-2026')?.reelId === partyReel && pub.events.length === 2, JSON.stringify(pub?.events?.map(e => [e.id, e.reelId])));
const v = await b.newContext({ timezoneId: 'America/Detroit',  viewport: { width: 390, height: 844 } });
await v.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await v.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const vp = await v.newPage();
const opens = async (label) => {
  await vp.goto(B + '/f/masquerade'); await vp.waitForTimeout(2200);
  await vp.locator(`main ul > li button[aria-label*="${label}"]`).first().click();
  await vp.waitForTimeout(700);
  return vp.locator('body').innerText();
};
check('visitor: Oct 31 opens the moved reel', (await opens('Oct 31')).includes('The after party, upstairs'));
check('visitor: After Party opens the reel that sells it', (await opens('After Party')).includes('Dress to impress'));
await vp.screenshot({ path: S + '/visitor-after-party.jpg' });

await p.request.delete(B + '/api/admin/publish?slug=masquerade');
check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
