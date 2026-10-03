import { chromium } from 'playwright';
const S = process.argv[2]; const B = 'http://localhost:3002'; const C = 'http://localhost:54400';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const mode = (m) => fetch(C + '/__mode', { method: 'POST', body: m });
const last = () => fetch(C + '/__last').then(r => r.json());
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });

await p.goto(B + '/admin'); await p.waitForTimeout(600);
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(1300);
const dates = p.locator('section[aria-labelledby="dates-title"]');
const rows = () => dates.locator(':scope > ul > li').count();
const before = await rows();
await p.screenshot({ path: S + '/flyer-card-390.jpg' });

// 1. A photo with several dates
await mode('multi');
await dates.getByRole('button', { name: 'Import flyer' }).click();
const sheet = p.locator('dialog[open]');
check('sheet opens', await sheet.getByRole('heading', { name: 'Import from flyer' }).isVisible());
check('Read disabled until something is chosen', await sheet.getByRole('button', { name: 'Read flyer' }).isDisabled());
await p.screenshot({ path: S + '/flyer-sheet-390.jpg' });
await sheet.locator('input[type=file]').setInputFiles(S + '/sample-photo.png');
check('photo preview shows', await sheet.getByRole('button', { name: 'Remove' }).isVisible() && await sheet.getByLabel('Paste the event details').count() === 0);
await sheet.getByRole('button', { name: 'Read flyer' }).click();
check('reading state', await sheet.getByRole('button', { name: 'Reading…' }).isVisible());
await sheet.getByText('Found 2 dates').waitFor({ timeout: 8000 }).catch(() => {});
check('found 2 good dates, bad one dropped', await sheet.getByText('Found 2 dates').isVisible());
const req = await last();
check('model + fallbacks', req.body.model === 'claude-opus-5-5' && req.body.fallbacks === 'default' && /server-side-fallback-2026-07-01/.test(req.headers['anthropic-beta']), JSON.stringify([req.body.model, req.body.fallbacks, req.headers['anthropic-beta']]));
check('sent as a shrunk JPEG image', req.body.messages[0].content[0].type === 'image' && req.body.messages[0].content[0].source.media_type === 'image/jpeg');
check('json schema output', req.body.output_config?.format?.type === 'json_schema');
check('today in prompt', /Today is \d{4}-\d{2}-\d{2}/.test(req.body.system) && /Golden Hour/.test(req.body.system));
check('note shown', await sheet.getByText('no time on the flyer').isVisible());
check('missing ticket link flagged', await sheet.getByText('Needs a ticket link').isVisible());
await p.screenshot({ path: S + '/flyer-found-390.jpg' });

// 2. Review the first
await sheet.getByRole('button', { name: /Review Golden Hour: Halloween/ }).click();
const ds = p.locator('dialog[open]');
check('date sheet prefilled', (await ds.getByLabel('Name').inputValue()) === 'Golden Hour: Halloween' && (await ds.getByLabel('Date').inputValue()) === '2026-10-31' && (await ds.getByLabel('Starts').inputValue()) === '19:00');
check('venue, price, https link', (await ds.getByLabel('Venue').inputValue()) === 'The Rooftop, Downtown' && (await ds.getByLabel('Price').inputValue()) === 'From $30' && (await ds.getByLabel('Ticket link').inputValue()) === 'https://eventbrite.com/e/golden-hour-halloween');
check('from-flyer banner', await ds.getByText('Filled in from your flyer.').isVisible());
check('opens with: first reel', (await ds.getByLabel('Opens with').inputValue()) === '');
await p.screenshot({ path: S + '/flyer-review-390.jpg' });
await ds.getByRole('button', { name: 'Add date' }).click(); await p.waitForTimeout(400);
check('back to list, first marked added', await sheet.getByText('Added ✓').isVisible());
check('row added', await rows() === before + 1);

// 3. Second: missing details
await sheet.getByRole('button', { name: /Review Golden Hour/ }).click();
check('banner lists what is missing', await ds.getByText(/didn’t show the start time, venue, price and ticket link/).isVisible());
await ds.getByRole('button', { name: 'Add date' }).click(); await p.waitForTimeout(200);
check('ticket link still required', await ds.getByRole('alert').filter({ hasText: 'https://' }).isVisible());
await ds.getByLabel('Ticket link').fill('https://example.com/t/nov8');
await ds.getByRole('button', { name: 'Add date' }).click(); await p.waitForTimeout(400);
check('all added: back to the unused look offer', await sheet.getByText('Match your flyer’s style?').isVisible() && await rows() === before + 2);
await sheet.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300);
check('Done closes', await p.locator('dialog[open]').count() === 0);

// 4. Pasted text, single date: straight to review
await mode('single');
await dates.getByRole('button', { name: 'Import flyer' }).click();
await sheet.getByLabel('Paste the event details').fill('Golden Hour Day Party, Sun Nov 22 2pm at Pier 9, $20, posh.vip/e/day-party');
await sheet.getByRole('button', { name: 'Read flyer' }).click();
await ds.getByRole('heading', { name: 'Add date' }).waitFor({ timeout: 8000 }).catch(() => {});
check('single date opens review directly', (await ds.getByLabel('Name').inputValue()) === 'Golden Hour: Day Party');
check('text sent as text', (await last()).body.messages[0].content[0].type === 'text');
await ds.getByRole('button', { name: 'Close' }).click(); await p.waitForTimeout(300);
check('closing review closes import (single)', await p.locator('dialog[open]').count() === 0 && await rows() === before + 2);

// 5. Nothing found, and a refusal
await mode('none');
await dates.getByRole('button', { name: 'Import flyer' }).click();
await sheet.getByLabel('Paste the event details').fill('Brunch menu: eggs $12');
await sheet.getByRole('button', { name: 'Read flyer' }).click(); await p.waitForTimeout(1500);
check('none found explained', await sheet.getByRole('alert').filter({ hasText: 'menu' }).isVisible());
await sheet.getByRole('button', { name: 'Import another' }).click();
await mode('refusal');
await sheet.getByLabel('Paste the event details').fill('something');
await sheet.getByRole('button', { name: 'Read flyer' }).click(); await p.waitForTimeout(1500);
check('refusal explained', await sheet.getByRole('alert').filter({ hasText: 'by hand' }).isVisible());
await p.keyboard.press('Escape'); await p.waitForTimeout(200);

// 6. Signed out: rejected
const anon = await b.newContext();
const r = await anon.request.post(B + '/api/admin/import-event', { data: { slug: 'masquerade', text: 'x' } });
check('signed out: 401', r.status() === 401);
check('no errors', !errs.length, errs.join(' | '));
// Leave drafts as they were
await p.evaluate(() => localStorage.clear());
await b.close(); console.log(res.join('\n'));
