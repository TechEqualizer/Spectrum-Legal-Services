import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const C = 'http://localhost:54400'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const mode = (m) => fetch(C + '/__mode', { method: 'POST', body: m });
const contrast = (a, b) => { const l = h => { const c = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255).map(s => s <= 0.03928 ? s/12.92 : ((s+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }; const [x,y] = [l(a),l(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(B + '/admin'); await settle(p, 600);
await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 600);
await p.selectOption('#admin-business', 'masquerade'); await settle(p, 1300);
const dates = p.locator('section[aria-labelledby="dates-title"]');
const card = p.locator('section[aria-labelledby="hero-media-title"]');

// 1. A flyer photo: look offered
await mode('multi');
await dates.getByRole('button', { name: 'Import flyer' }).click();
const sheet = p.locator('dialog[open]');
await sheet.locator('input[type=file]').setInputFiles(S + '/flyer-masquerade.jpg');
await sheet.getByRole('button', { name: 'Read flyer' }).click();
await sheet.getByText('Match your flyer’s style?').waitFor({ timeout: 8000 }).catch(() => {});
check('look offered', await sheet.getByText('Match your flyer’s style?').isVisible());
check('typeface named', await sheet.getByText('Engraved capitals titles').isVisible());
check('flyer background option on', await sheet.getByLabel('Flyer as the background').isChecked());
const req = await (await fetch(C + '/__last')).json();
check('schema asks for look', Boolean(req.body.output_config.format.schema.properties.look) && /flyer's look/.test(req.body.system));
// Colors were made readable: the gold button was too light for white text.
const vars = await sheet.locator('[style*="--teal-accent"]').first().getAttribute('style');
const get = (k) => vars.match(new RegExp(k + ':\\s*(#[0-9A-Fa-f]{6})'))?.[1];
check('gold kept, button words readable', get('--teal-accent') === '#D4AF37' && contrast(get('--teal-accent'), get('--on-accent')) >= 4.5, get('--teal-accent') + ' / ' + get('--on-accent'));
check('highlight readable on background', contrast(get('--sky-accent'), get('--deep-navy')) >= 6, get('--sky-accent'));
check('light sheet readable', contrast(get('--soft-gray'), '#1F2937') >= 11, get('--soft-gray'));
await p.screenshot({ path: S + '/look-offer-390.jpg' });

// 2. Use it
await sheet.getByRole('button', { name: 'Use this style' }).click(); await settle(p, 300);
check('applied state', await sheet.getByText('Applied.', { exact: false }).isVisible());
check('toast with undo', await p.getByRole('status').filter({ hasText: 'Look and background matched' }).isVisible());
// Dates still to review
check('dates still listed', await sheet.getByText('Found 2 dates').isVisible());
await sheet.getByRole('button', { name: 'Done' }).click(); await settle(p, 300);
check('card shows look', await card.getByText('Engraved capitals').isVisible() && await card.getByText('not published').isVisible());
await p.screenshot({ path: S + '/look-card-390.jpg' });

// 3. Undo from the toast
await p.getByRole('status').getByRole('button', { name: 'Undo' }).click(); await settle(p, 600);
check('undo removes look', await card.getByText('Engraved capitals').count() === 0);
await dates.getByRole('button', { name: 'Import flyer' }).click();
await sheet.locator('input[type=file]').setInputFiles(S + '/flyer-masquerade.jpg');
await sheet.getByRole('button', { name: 'Read flyer' }).click();
await sheet.getByRole('button', { name: 'Use this style' }).waitFor({ timeout: 8000 });
await sheet.getByRole('button', { name: 'Use this style' }).click(); await settle(p, 200);
await sheet.getByRole('button', { name: 'Done' }).click(); await settle(p, 300);
// 4. Survives reload
await p.reload(); await settle(p, 1500);
check('after reload: look kept', await card.getByText('Engraved capitals').isVisible());

// 5. Opening screen sheet preview uses the look
await card.getByRole('button', { name: 'Edit', exact: true }).click();
const os = p.locator('dialog[open]');
check('sheet preview recolored', ((await os.locator('[style*="--deep-navy"]').count()) > 0));
await p.screenshot({ path: S + '/look-sheet-390.jpg' });
await p.keyboard.press('Escape'); await settle(p, 200);

// 6. Publish
await p.getByRole('region', { name: 'Publish' }).getByRole('button', { name: 'Publish' }).click(); await settle(p, 2500);
const pub = (await (await fetch(M + '/__state')).json()).publications.find(x => x.slug === 'masquerade')?.data;
check('stored look', pub?.look?.font === 'regal' && /^#[0-9A-F]{6}$/.test(pub?.look?.colors?.['--deep-navy']), JSON.stringify(pub?.look));
check('stored poster backdrop with public link', pub?.backdrop?.kind === 'image' && pub.backdrop.fit === 'poster' && /^https?:\/\//.test(pub.backdrop.src), JSON.stringify(pub?.backdrop));

// 7. Visitor sees it
const v = await b.newContext({ timezoneId: 'America/Detroit',  viewport: { width: 390, height: 844 } });
await v.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
const vp = await v.newPage(); const verrs = []; vp.on('pageerror', e => verrs.push(e.message));
await vp.goto(B + '/f/masquerade'); await settle(vp, 3000);
const rootStyle = await vp.locator('[style*="--deep-navy"]').first().getAttribute('style');
check('visitor colors = look', rootStyle.includes(pub.look.colors['--deep-navy']), rootStyle);
const h1Font = await vp.locator('h1').evaluate(e => getComputedStyle(e).fontFamily);
check('visitor title in Cinzel', /Cinzel/i.test(h1Font), h1Font);
check('flyer poster shown', await vp.locator('img[src*="reel-media"]').count() >= 2);
const theme = await vp.locator('meta[name="theme-color"]').getAttribute('content');
check('browser bar color = look', theme?.toUpperCase() === pub.look.colors['--deep-navy'], theme);
const btn = vp.locator('main button.cine-shimmer, main a.cine-shimmer').first();
const [bg, fg] = await btn.evaluate(e => [getComputedStyle(e).backgroundColor, getComputedStyle(e).color]);
check('visitor gold button with dark words', bg.includes('212, 175, 55') && !fg.includes('255, 255, 255'), bg + ' / ' + fg);
const posterBottom = await vp.locator('img[src*="reel-media"]').nth(1).evaluate(e => e.getBoundingClientRect().bottom);
const textTop = await vp.locator('main p, main h1').evaluateAll(els => Math.min(...els.filter(e => e.getBoundingClientRect().top > 150).map(e => e.getBoundingClientRect().top)));
check('poster ends above the words', posterBottom <= textTop + 4, posterBottom + ' vs ' + textTop);
check('still fits one screen', await vp.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
await vp.screenshot({ path: S + '/look-visitor-390.jpg' });
check('visitor no errors', !verrs.length, verrs.join(' | '));

// 8. Text import offers no look
await mode('single');
await dates.getByRole('button', { name: 'Import flyer' }).click();
await sheet.getByLabel('Paste the event details').fill('Day party Nov 22 2pm');
await sheet.getByRole('button', { name: 'Read flyer' }).click();
await p.locator('dialog[open]').getByRole('heading', { name: 'Add date' }).waitFor({ timeout: 8000 }).catch(() => {});
check('text: no look, straight to review', await p.locator('dialog[open]').getByRole('heading', { name: 'Add date' }).isVisible());
await p.keyboard.press('Escape');

// Bad look rejected by the server
const bad = await p.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade', publication: { ...pub, look: { colors: { '--deep-navy': 'red' }, font: 'comic' } } } });
check('bad look rejected', bad.status() === 400, String(bad.status()));

await p.request.delete(B + '/api/admin/publish?slug=events');
await p.evaluate(() => localStorage.clear());
check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
