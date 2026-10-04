import { chromium } from 'playwright';
const S = process.argv[2]; const B = 'http://localhost:3002'; const C = 'http://localhost:54400';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const mode = (m) => fetch(C + '/__mode', { method: 'POST', body: m });
const last = () => fetch(C + '/__last').then(r => r.json());
const W = Number(process.argv[3] || 390);
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: W, height: W > 1000 ? 900 : 844 }, ...(W < 1000 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: B });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });

await p.goto(B + '/admin'); await p.waitForTimeout(600);
await p.evaluate(() => { localStorage.removeItem('admin_prompts_masquerade'); localStorage.removeItem('admin_draft_masquerade'); });
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(1300);
const dates = p.locator('section[aria-labelledby="dates-title"]');
const sheet = p.locator('dialog[open]');
const orderRows = () => p.locator('ol > li').filter({ has: p.getByRole('button', { name: /^Move .* down$/ }) });
const beforeTitles = await orderRows().locator('p.font-bold').allTextContents();

await mode('multi');
await dates.getByRole('button', { name: 'Import flyer' }).click();
await sheet.locator('input[type=file]').setInputFiles(S + '/sample-photo.png');
await sheet.getByRole('button', { name: 'Read flyer' }).click();
await sheet.getByText('Found 2 dates').waitFor({ timeout: 8000 }).catch(() => {});
check('draft offer shown after reading', await sheet.getByRole('heading', { name: 'Draft your whole funnel?' }).isVisible());

// Add the Oct 31 date first, so reels can link to it.
await sheet.getByRole('button', { name: /Review Golden Hour: Halloween/ }).click();
await sheet.getByRole('button', { name: 'Add date' }).click(); await p.waitForTimeout(400);
check('back to the sheet after adding', await sheet.getByRole('heading', { name: 'Draft your whole funnel?' }).isVisible());

await sheet.getByRole('button', { name: 'Draft my funnel' }).click();
check('writing state', await sheet.getByRole('button', { name: 'Writing your funnel…' }).isVisible());
await sheet.getByRole('heading', { name: 'Your funnel, drafted' }).waitFor({ timeout: 8000 }).catch(() => {});
check('draft preview', await sheet.getByRole('heading', { name: 'Your funnel, drafted' }).isVisible());
const req = await last();
check('draft request: model, schema, flyer image resent', req.body.model === 'claude-opus-5-5' && req.body.output_config?.format?.type === 'json_schema' && req.body.messages[0].content[0].type === 'image');
check('draft request: dates and brand in prompt', /2026-10-31/.test(req.body.system) && /creative director/.test(req.body.system));
check('draft request: the three core drivers', /the_night/.test(req.body.system) && /your_people/.test(req.body.system) && /last_call/.test(req.body.system) && /Never invent testimonials/.test(req.body.system));
check('draft request: price for true urgency', /From \$30/.test(req.body.system), req.body.system.slice(0, 400));
const items = sheet.locator('section ol > li');
check('three core reels, one per role', await items.count() === 3, String(await items.count()));
check('in driver order with dates', await sheet.getByText('The Night · Oct 31 · Start from your photo').isVisible() && await sheet.getByText('Your People · Start from your photo').isVisible() && await sheet.getByText('Last Call · Oct 31 · From words').isVisible());
check('each says what it answers, with its hook', await sheet.getByText('Will this be amazing?').isVisible() && await sheet.getByText('Why buy now?').isVisible() && await sheet.getByText('A gold mask turns to camera.').isVisible());
check('opening words shown', await sheet.getByText('Masks on, Detroit').isVisible() && await sheet.getByText('Step inside the night').isVisible());
await sheet.getByRole('heading', { name: 'Your funnel, drafted' }).scrollIntoViewIfNeeded();
await p.screenshot({ path: S + `/draft-preview-${W}.jpg` });

await sheet.getByRole('button', { name: 'Use this draft' }).click(); await p.waitForTimeout(500);
check('sheet stays for the look/date left', await sheet.getByText('Funnel drafted').isVisible());
await sheet.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300);
const titles = await orderRows().locator('p.font-bold').allTextContents();
check('funnel order replaced', JSON.stringify(titles) === JSON.stringify(['Masks on', 'Bring your crew', 'Last call']), JSON.stringify(titles));
check('Needs video chips', await orderRows().filter({ hasText: 'Needs video' }).count() === 3);
check('date chip on linked reels', await orderRows().nth(0).getByText('Oct 31').isVisible() && await orderRows().nth(2).getByText('Oct 31').isVisible());
check('last call is bold', await orderRows().nth(2).getByText('Bold', { exact: true }).isVisible());
check('toast', await p.getByText('Funnel drafted: 3 reels, each with a video prompt').isVisible());
const hero = p.locator('section[aria-labelledby="hero-media-title"]');
check('opening title updated', await hero.getByText('“Masks on, Detroit”').isVisible());
check('hero prompt on opening card', await hero.getByText('Video prompt').isVisible());
const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('admin_prompts_masquerade') || '{}'));
check('captions ride with the prompt', /Captions to add when editing \(not in the video\): "\$31 GA ends Oct 30"/.test(stored['last-call'] ?? ''), (stored['last-call'] ?? '').slice(-120));
check('prompts kept', Object.keys(stored).length === 4 && /seamless loop/.test(stored['#opening']) && /Avoid: on-screen text/.test(stored['masks-on']), Object.keys(stored).join(','));
check('prompt assembled', /^Camera: rack focus\. Length: 6s, vertical 9:16\./.test(stored['masks-on']) && /Style: Anamorphic/.test(stored['masks-on']));
await p.screenshot({ path: S + `/draft-applied-${W}.jpg`, fullPage: W < 1000 });

// The reel's prompt, with Copy
await p.getByRole('button', { name: 'Edit Masks on' }).click();
const dlg = p.locator('dialog[open]');
await dlg.getByText('Video prompt').click();
await dlg.getByRole('button', { name: 'Copy prompt' }).click(); await p.waitForTimeout(200);
check('copied', await dlg.getByRole('button', { name: 'Copied' }).isVisible());
check('clipboard has the prompt', (await p.evaluate(() => navigator.clipboard.readText())).startsWith('Camera: rack focus'));
await dlg.getByText('Video prompt').scrollIntoViewIfNeeded();
await p.screenshot({ path: S + `/draft-reel-prompt-${W}.jpg` });
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// Undo puts everything back
await p.getByRole('button', { name: 'Undo' }).first().click(); await p.waitForTimeout(400);
const back = await orderRows().locator('p.font-bold').allTextContents();
check('undo restores reels', JSON.stringify(back) === JSON.stringify(beforeTitles), JSON.stringify(back));
check('undo restores title', await hero.getByText('“Masquerade on the Runway”').isVisible() && !(await hero.getByText('“Masks on, Detroit”').isVisible()));

// Errors: refusal
await mode('refusal');
await dates.getByRole('button', { name: 'Import flyer' }).click();
await sheet.getByLabel('Paste the event details').fill('Masquerade, Oct 31');
await mode('multi');
await sheet.getByRole('button', { name: 'Read flyer' }).click();
await sheet.getByText('Found 2 dates').waitFor({ timeout: 8000 }).catch(() => {});
await mode('refusal');
await sheet.getByRole('button', { name: 'Draft my funnel' }).click();
await sheet.getByRole('alert').waitFor({ timeout: 8000 }).catch(() => {});
check('refusal message', await sheet.getByRole('alert').filter({ hasText: 'build the funnel by hand' }).isVisible().catch(() => false) || /by hand/.test(await sheet.getByRole('alert').first().textContent()));
check('text resent for draft', (await last()).body.messages[0].content[0].type === 'text');
await mode('multi');

check('no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
console.log(res.join('\n')); console.log(res.filter(r => r.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASS');
await b.close();
