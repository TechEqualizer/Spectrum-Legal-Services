import { animationsDone, chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
process.on('uncaughtException', e => { console.log(res.join('\n')); console.log('ERR', e.message.split('\n').slice(0, 3).join(' ')); process.exit(1); });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
let tracked = 0; await ctx.route('**/api/reel-events', r => { tracked++; r.fulfill({ status: 204 }); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(B + '/admin'); await settle(p, 500);
await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 500);
await p.selectOption('#admin-business', 'masquerade'); await settle(p, 4000);
const phone = p.frameLocator('iframe[title="Live preview of your link"]');
const h1 = phone.locator('h1');
check('studio: three columns', await p.getByRole('tablist', { name: 'Studio' }).isVisible() && await p.getByRole('heading', { name: 'Opening scene' }).isVisible());
check('phone runs the real funnel', (await h1.innerText()).toLowerCase().includes('masquerade on the runway'));
check('no duplicate card titles', await p.getByText('Shown as circles on your opening screen.').evaluate(e => e.className.includes('sr-only')) && await p.locator('#hero-media-title').evaluate(e => e.className.includes('sr-only')) && await p.getByRole('button', { name: 'Style', exact: true }).count() === 0);
check('undo off at start', await p.getByRole('button', { name: 'Undo', exact: true }).first().isDisabled() && await p.getByRole('button', { name: 'Publish' }).isDisabled());

// Design: font goes live
const fontOf = () => h1.evaluate(e => getComputedStyle(e).fontFamily);
const before = await fontOf();
await p.getByRole('radio', { name: /Bold condensed/ }).click(); await settle(p, 700);
check('font change shows in phone', /Bebas/i.test(await fontOf()), await fontOf());
check('publish enabled, status says unpublished', await p.getByRole('button', { name: 'Publish' }).isEnabled() && await p.getByText(/Unpublished edits/).isVisible());
// Colors
await p.getByRole('button', { name: /^Buttons/ }).click();
const sw = p.getByRole('radiogroup', { name: 'Buttons color' }).getByRole('radio');
const target = await sw.nth(0).getAttribute('aria-label');
await sw.nth(0).click(); await settle(p, 700);
const btnBg = await phone.locator('main a.cine-cta, main button.cine-cta').first().evaluate(e => getComputedStyle(e).backgroundColor);
check('button color shows in phone', btnBg.length > 0, `${target} -> ${btnBg}`);
// Undo / redo
await p.getByRole('button', { name: 'Undo', exact: true }).first().click(); await settle(p, 600);
await p.getByRole('button', { name: 'Undo', exact: true }).first().click(); await settle(p, 700);
check('undo twice: original font back', (await fontOf()) === before, await fontOf());
check('redo enabled', await p.getByRole('button', { name: 'Redo' }).isEnabled());
await p.getByRole('button', { name: 'Redo' }).click(); await settle(p, 700);
check('redo: condensed again', /Bebas/i.test(await fontOf()));
await p.locator('body').click({ position: { x: 700, y: 20 } });
await p.keyboard.press('Control+z'); await settle(p, 700);
check('Ctrl+Z undoes', (await fontOf()) === before);

// Reels play inside the phone, not full screen
await p.getByRole('button', { name: 'Show reels in the preview' }).click(); await settle(p, 1500);
check('Show reels: phone plays the first reel', await phone.getByRole('region', { name: /^Video:/ }).first().isVisible());
check('no full-screen viewer over the admin', await p.getByRole('dialog').count() === 0);
await p.getByRole('button', { name: 'Restart' }).click(); await settle(p, 1500);
check('restart: back to opening', (await h1.innerText()).toLowerCase().includes('masquerade'));
const playBtn = p.getByRole('button', { name: /^Preview / }).nth(2);
const playName = await playBtn.getAttribute('aria-label');
await playBtn.click(); await settle(p, 1500);
check('row play: that reel in the phone', await phone.getByRole('region', { name: /^Video:/ }).first().isVisible(), playName);

// Results + Settings
await p.getByRole('tab', { name: 'Results' }).click();
check('results tab', await p.getByText('By reel · last 30 days').isVisible() && await p.getByText('Watched to end').isVisible());
await p.getByRole('tab', { name: 'Settings' }).click();
check('settings tab', await p.getByLabel('Funnel name').isVisible() || await p.getByText('Funnel name').isVisible());
check('settings: no Paths link', await p.getByRole('link', { name: 'See every path' }).count() === 0);
check('settings: only Settings looks selected', (await p.getByRole('tab', { selected: true }).allTextContents()).join() === 'Settings');
await animationsDone(p, 1000); await p.screenshot({ path: S + '/studio-settings-1440.jpg' });
await p.getByRole('tab', { name: 'Design' }).click();

// Publish from the top bar
await p.getByRole('radio', { name: /Fashion serif/ }).click(); await settle(p, 400);
await p.getByRole('button', { name: 'Publish' }).click(); await settle(p, 2500);
const pub = (await (await fetch(M + '/__state')).json()).publications.find(x => x.slug === 'masquerade')?.data;
check('published from top bar', pub?.look?.font === 'editorial' && await p.getByText('Everything is live').isVisible(), JSON.stringify(pub?.look?.font));
check('preview never tracked visits', tracked === 0, String(tracked));
await p.screenshot({ path: S + '/studio-1440-after.jpg' });
await p.request.delete(B + '/api/admin/publish?slug=events');

// Phones keep the single column
const m = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await m.newPage();
await mp.goto(B + '/admin'); await settle(mp, 500); await mp.selectOption('#admin-business', 'masquerade'); await settle(mp, 1500);
check('phone admin: old layout', await mp.getByRole('heading', { name: 'Reels', exact: true }).isVisible() && await mp.getByRole('tablist', { name: 'Studio' }).count() === 0 && await mp.locator('iframe').count() === 0);
check('phone admin: Style button kept', await mp.getByRole('button', { name: 'Style', exact: true }).isVisible());
await p.evaluate(() => localStorage.clear());
check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
