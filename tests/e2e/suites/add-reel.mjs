// Adding a reel from the path strip: a + between stops puts a new reel right
// there, and a missing core reel (The Night, Your People, Last Call) shows in
// its place as a dashed card.
import { chromium, pickEvent, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit', storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(B + '/admin'); await settle(p, 500);
await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 500);
await pickEvent(p, 'masquerade'); await settle(p, 3000);

const strip = p.getByRole('navigation', { name: 'Path through your link' });
const reelStops = async () => (await strip.getByRole('button', { name: /^Reel \d+: / }).evaluateAll(els => els.map(e => e.getAttribute('aria-label').replace(/^Reel \d+: /, '').split(/[.,]/)[0])));
const dialog = p.locator('dialog[open]');

// Plenty of reels: a + in each gap, no missing core reels.
const many = (await reelStops()).length;
check('a + before each reel and before the end', await strip.getByRole('button', { name: /^Add a reel here/ }).count() === many + 1, String(await strip.getByRole('button', { name: /^Add a reel here/ }).count()));
check('no core reel missing', await strip.getByRole('button', { name: /^Add (The Night|Your People|Last Call)/ }).count() === 0);
check('no + before the opening', (await strip.getByRole('button').first().getAttribute('aria-label')).startsWith('Opening'));

// The + shows on hover (a chevron otherwise).
const gap2 = strip.getByRole('button', { name: 'Add a reel here, as reel 2' });
await gap2.hover(); await settle(p, 200);
await strip.screenshot({ path: S + '/add-reel-hover-1440.jpg' });
check('+ shown on hover', await gap2.locator('svg path[d="M12 5v14M5 12h14"]').isVisible());

// Insert at reel 2.
const first = (await reelStops())[0];
await gap2.click();
check('Add reel opens', (await dialog.getByRole('heading', { level: 2 }).textContent()).trim() === 'Add reel');
await dialog.getByLabel('Title').fill('Afterparty');
await dialog.getByRole('button', { name: 'Add reel' }).click(); await settle(p, 800);
let now = await reelStops();
check('new reel lands where the + was', now[0] === first && now[1] === 'Afterparty', now.join(' | '));

// Down to two reels: the two fill The Night and Your People, so Last Call is missing.
while ((await reelStops()).length > 2) {
  await p.getByRole('button', { name: / from this funnel$/ }).last().click(); await settle(p, 250);
}
const lastCall = strip.getByRole('button', { name: 'Add Last Call: Why buy now?' });
check('missing Last Call shown in its place', await lastCall.isVisible());
check('only the missing one', await strip.getByRole('button', { name: /^Add (The Night|Your People)/ }).count() === 0);
check('it takes the place of the + before the end', await strip.getByRole('button', { name: 'Add a reel here, as reel 3' }).count() === 0);
await lastCall.scrollIntoViewIfNeeded(); await settle(p, 300);
await strip.screenshot({ path: S + '/add-reel-missing-1440.jpg' });
await lastCall.click();
check('Add Last Call opens, with its question', (await dialog.getByRole('heading', { level: 2 }).textContent()).trim() === 'Add Last Call' && await dialog.getByText(/Why buy now\?/).isVisible());
check('Last Call starts bold', (await dialog.locator('select').filter({ hasText: 'Builds up' }).inputValue()) === 'bold');
await dialog.getByLabel('Title').fill('Last chance');
await dialog.getByRole('button', { name: 'Add reel' }).click(); await settle(p, 800);
now = await reelStops();
check('Last Call added third', now.length === 3 && now[2] === 'Last chance', now.join(' | '));
check('nothing missing now', await strip.getByRole('button', { name: /^Add (The Night|Your People|Last Call)/ }).count() === 0 && await strip.getByRole('button', { name: 'Add a reel here, as reel 4' }).isVisible());
await p.getByRole('button', { name: 'Edit Last chance' }).click();
check('it stays Last Call', (await dialog.getByRole('heading', { level: 2 }).textContent()).trim() === 'Edit Last Call');
await p.keyboard.press('Escape'); await settle(p, 300);

await p.evaluate(() => localStorage.clear());
check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
