import { chromium } from 'playwright';
const S = process.argv[2]; const B = 'http://localhost:3002'; const C = 'http://localhost:54400'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await fetch(C + '/__mode', { method: 'POST', body: 'multi' });
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
process.on('uncaughtException', e => { console.log(res.join('\n')); console.log('ERR', e.message.split('\n')[0]); process.exit(1); });
await p.goto(B + '/admin'); await p.waitForTimeout(500);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(1300);
const dates = p.locator('section[aria-labelledby="dates-title"]');
const card = p.locator('section[aria-labelledby="hero-media-title"]');
const dlg = p.locator('dialog[open]');
const previewVar = async (k) => (await dlg.getByRole('img', { name: 'Preview of your opening screen' }).getAttribute('style')).match(new RegExp(k + ':\\s*(#[0-9A-Fa-f]{6})'))?.[1];

const kindBefore = await card.locator('p.text-sm.text-gray-600').first().innerText();
// 1. Import: three suggestions, pick Bold, no background
await dates.getByRole('button', { name: 'Import flyer' }).click();
await dlg.locator('input[type=file]').setInputFiles(S + '/flyer-masquerade.jpg');
await dlg.getByRole('button', { name: 'Read flyer' }).click();
await dlg.getByRole('radiogroup', { name: 'Suggested styles' }).waitFor({ timeout: 8000 });
const opts = await dlg.getByRole('radiogroup', { name: 'Suggested styles' }).getByRole('radio').allInnerTexts();
check('three suggestions in import', opts.join('|') === 'True to flyer|Bold|Elegant', opts.join('|'));
await dlg.getByRole('radio', { name: 'Bold' }).click();
check('import preview follows choice', await dlg.getByText('Bold condensed titles').isVisible());
await dlg.getByLabel('Flyer as the background').uncheck();
await p.screenshot({ path: S + '/style-import-390.jpg' });
await dlg.getByRole('button', { name: 'Use this style' }).click(); await p.waitForTimeout(200);
await dlg.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300);
check('card: bold style, background untouched', await card.getByText('Bold condensed').isVisible() && (await card.locator('p.text-sm.text-gray-600').first().innerText()).startsWith(kindBefore.split(' ·')[0]), kindBefore);

// 2. Style sheet
await card.getByRole('button', { name: 'Style', exact: true }).click(); await p.waitForTimeout(300);
check('style sheet opens', await dlg.getByRole('heading', { name: 'Style' }).isVisible());
const sugg = dlg.getByRole('radiogroup', { name: 'Suggested styles' });
check('4 cards incl. Original', await sugg.getByRole('radio').count() === 4);
check('Bold card selected', (await sugg.getByRole('radio', { name: 'Bold' }).getAttribute('aria-checked')) === 'true');
check('Done in view', (await dlg.getByRole('button', { name: 'Done' }).boundingBox()).y < 80);
await p.screenshot({ path: S + '/style-sheet-390.jpg' });

// Elegant
const before = await previewVar('--deep-navy');
await sugg.getByRole('radio', { name: 'Elegant' }).click();
check('preview recolors instantly', (await previewVar('--deep-navy')) !== before);
check('elegant font picked', (await dlg.getByRole('radiogroup', { name: 'Title typeface' }).getByRole('radio', { checked: true }).innerText()).includes('Fashion serif'));

// Remix: buttons from the flyer palette
await dlg.getByRole('button', { name: /^Buttons/ }).click();
const swatches = dlg.getByRole('radiogroup', { name: 'Buttons color' }).getByRole('radio');
check('flyer palette offered', await swatches.count() === 7, String(await swatches.count()));
await dlg.getByRole('radiogroup', { name: 'Buttons color' }).getByRole('radio', { name: '#F4D58D' }).click();
check('button color applied', (await previewVar('--teal-accent')) === '#F4D58D');
check('dark words on light button', (await previewVar('--on-accent')) !== '#FFFFFF');
check('custom: no suggestion selected', await sugg.getByRole('radio', { checked: true }).count() === 0);
await dlg.getByRole('button', { name: /^Background/ }).click();
await dlg.getByRole('radiogroup', { name: 'Background color' }).getByRole('radio', { name: '#8E3B6E' }).click();
check('too-light background adjusted, and said so', (await previewVar('--deep-navy')) !== '#8E3B6E' && await dlg.getByText('Adjusted slightly so words stay readable.').isVisible(), await previewVar('--deep-navy'));
await p.screenshot({ path: S + '/style-remix-390.jpg' });

// Shuffle
const s0 = await previewVar('--teal-accent') + await previewVar('--deep-navy');
await dlg.getByRole('button', { name: 'Shuffle' }).click();
const s1 = await previewVar('--teal-accent') + await previewVar('--deep-navy');
await dlg.getByRole('button', { name: 'Shuffle' }).click();
const s2 = await previewVar('--teal-accent') + await previewVar('--deep-navy');
check('shuffle gives new combinations', s0 !== s1 && s1 !== s2, [s0, s1, s2].join(' '));

// Font + background
await dlg.getByRole('radiogroup', { name: 'Title typeface' }).getByRole('radio', { name: /Engraved capitals/ }).click();
check('flyer backgrounds available (flyer kept)', await dlg.getByRole('radio', { name: 'Blurred', exact: true }).isEnabled());
await dlg.getByRole('radio', { name: 'Blurred', exact: true }).click();
check('preview shows blurred flyer', await dlg.getByRole('img', { name: 'Preview of your opening screen' }).locator('img').count() === 1);

// Cancel keeps everything as it was
await dlg.getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(300);
check('cancel changes nothing', await card.getByText('Bold condensed').isVisible());

// Again, and Done
await card.getByRole('button', { name: 'Style', exact: true }).click(); await p.waitForTimeout(300);
await sugg.getByRole('radio', { name: 'Elegant' }).click();
await dlg.getByRole('radiogroup', { name: 'Title typeface' }).getByRole('radio', { name: /Engraved capitals/ }).click();
await dlg.getByRole('radio', { name: 'Blurred', exact: true }).click();
await dlg.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300);
check('done: card updated', await card.getByText('Engraved capitals').isVisible() && await card.getByText('Photo').isVisible());
check('toast with undo', await p.getByRole('status').filter({ hasText: 'Style saved' }).getByRole('button', { name: 'Undo' }).isVisible());

// Publish
await p.getByRole('region', { name: 'Publish' }).getByRole('button', { name: 'Publish' }).click(); await p.waitForTimeout(2500);
const pub = (await (await fetch(M + '/__state')).json()).publications.find(x => x.slug === 'masquerade')?.data;
check('stored: palette + suggestions', pub?.look?.palette?.length === 7 && pub?.look?.suggestions?.length === 3, JSON.stringify(pub?.look)?.slice(0, 200));
check('stored: flyer as public link', /^http:\/\/localhost:54321\/storage/.test(pub?.look?.flyer ?? ''), pub?.look?.flyer);
check('stored: blurred backdrop', pub?.backdrop?.fit === 'blur' && pub.backdrop.src === pub.look.flyer, JSON.stringify(pub?.backdrop));

// After a reload (fresh browser): the Style sheet still has everything
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(1500);
await card.getByRole('button', { name: 'Style', exact: true }).click(); await p.waitForTimeout(300);
check('after reload: suggestions kept', await sugg.getByRole('radio').count() === 4);
check('after reload: flyer kept', await dlg.getByRole('radio', { name: 'Flyer', exact: true }).isEnabled() && (await dlg.getByRole('radio', { name: 'Blurred', exact: true }).getAttribute('aria-checked')) === 'true');
await dlg.getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(200);

// Visitor
const v = await b.newContext({ timezoneId: 'America/Detroit',  viewport: { width: 390, height: 844 } });
const vp = await v.newPage();
await vp.goto(B + '/f/masquerade'); await vp.waitForTimeout(3000);
check('visitor: blurred flyer only', await vp.locator('img[src*="reel-media"]').count() === 1);
check('visitor: Cinzel title', /Cinzel/.test(await vp.locator('h1').evaluate(e => getComputedStyle(e).fontFamily)));
await vp.screenshot({ path: S + '/style-visitor-390.jpg' });

// Original
await p.screenshot({ path: S + '/style-dbg.jpg' });
await card.getByRole('button', { name: 'Style', exact: true }).click(); await p.waitForTimeout(600);
await p.screenshot({ path: S + '/style-dbg2.jpg' });
await sugg.getByRole('radio', { name: 'Original' }).click();
await dlg.getByRole('radio', { name: 'Glow', exact: true }).click();
await dlg.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300);
check('original: look removed', await card.getByText('Engraved capitals').count() === 0 && await card.getByText('No background').isVisible());

// Desktop
await p.setViewportSize({ width: 1279, height: 900 });
await p.getByRole('status').getByRole('button', { name: 'Undo' }).click().catch(() => {}); await p.waitForTimeout(200);
await card.getByRole('button', { name: 'Style', exact: true }).click(); await p.waitForTimeout(400);
await p.screenshot({ path: S + '/style-sheet-1440.jpg' });
await dlg.getByRole('button', { name: 'Cancel' }).click();

await p.request.delete(B + '/api/admin/publish?slug=events');
await p.evaluate(() => localStorage.clear());
check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
