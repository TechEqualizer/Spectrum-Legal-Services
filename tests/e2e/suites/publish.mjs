import { chromium, pickEvent, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await fetch(M + '/__reset');
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });

// 1. Signed out: redirected to sign in
await p.goto(B + '/admin/leads');
check('signed out -> sign-in page', p.url().includes('/admin/login?next=%2Fadmin%2Fleads'), p.url());
await p.screenshot({ path: S + '/login-390.jpg' });
// 2. Wrong password, then a non-admin account
await p.getByLabel('Email').fill('owner@example.com');
await p.getByLabel('Password', { exact: true }).fill('wrong-password');
await p.getByRole('button', { name: 'Sign in' }).click();
check('wrong password message', await p.getByRole('alert').filter({ hasText: "don't match" }).waitFor({ timeout: 5000 }).then(() => true, () => false));
await p.getByLabel('Email').fill('stranger@example.com');
await p.getByLabel('Password', { exact: true }).fill('stranger-pass-1');
await p.getByRole('button', { name: 'Sign in' }).click();
check('non-admin refused', await p.getByRole('alert').filter({ hasText: "doesn't have admin access" }).waitFor({ timeout: 5000 }).then(() => true, () => false));
check('non-admin gets no session', (await ctx.cookies()).every(c => c.name !== 'admin_at'));
// 3. Owner signs in, lands where they were going, must choose a password
await p.getByLabel('Email').fill('owner@example.com');
await p.getByLabel('Password', { exact: true }).fill('temp-password-1');
await p.getByRole('button', { name: 'Sign in' }).click();
await p.waitForURL(/\/admin\/leads/); await settle(p, 800);
check('signed in -> back to Leads', p.url().endsWith('/admin/leads'));
const cookies = await ctx.cookies();
check('session cookies are httpOnly', cookies.filter(c => c.name.startsWith('admin_')).every(c => c.httpOnly) && cookies.some(c => c.name === 'admin_at'));
const sheet = p.locator('dialog[open]');
check('first sign-in asks for a password', await sheet.getByText('Choose your password').isVisible());
await p.keyboard.press('Escape'); await settle(p, 200);
check("can't skip it", await sheet.isVisible());
await sheet.getByLabel('New password').fill('short');
await sheet.getByRole('button', { name: 'Save password' }).click();
check('too-short password explained', await sheet.getByRole('alert').filter({ hasText: 'at least 10' }).isVisible());
await sheet.getByLabel('New password').fill('my-own-password-42');
await sheet.getByRole('button', { name: 'Save password' }).click(); await settle(p, 500);
check('password changed', await sheet.getByText('Password changed').isVisible());
await sheet.getByRole('button', { name: 'Done' }).click(); await settle(p, 800);
check('prompt gone after refresh', await p.locator('dialog[open]').count() === 0);

// 4. Reels: events business, nothing published yet
await p.goto(B + '/admin'); await settle(p, 600);
await pickEvent(p, 'masquerade'); await settle(p, 1200);
check('live: original reels', await p.getByText(/Live\s*·\s*original reels/).isVisible());
check('no publish bar yet', await p.getByRole('region', { name: 'Publish' }).count() === 0);
// 5. Edit: YouTube link on reel 1, uploaded video as the opening background
await p.getByRole('button', { name: 'Edit Burlesque, performances and a live DJ' }).click();
await p.getByRole('button', { name: 'Paste a link' }).click();
await p.getByPlaceholder(/youtube\.com\/shorts/).fill('https://youtube.com/shorts/8U1ok3oEq8Q');
await p.getByRole('button', { name: 'Save reel' }).click(); await settle(p, 400);
const bar = p.getByRole('region', { name: 'Publish' });
check('publish bar appears', await bar.getByText('Unpublished edits').isVisible());
const card = p.locator('section[aria-labelledby="hero-media-title"]');
await card.getByRole('button', { name: 'Edit', exact: true }).click();
const dlg = p.locator('dialog[open]');
await dlg.getByRole('group', { name: 'Add media by' }).getByRole('button', { name: 'Upload' }).click();
await dlg.getByLabel('Upload a video or photo').setInputFiles(S + '/sample-reel.webm');
await dlg.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 400);
check('opening screen marked not published', await card.getByText('not published').isVisible());
await p.screenshot({ path: S + '/publish-bar-390.jpg' });
const bb = await bar.boundingBox();
check('publish bar above the tab bar', bb.y + bb.height <= 844 - 56, JSON.stringify(bb));
// 6. Publish
await bar.getByRole('button', { name: 'Publish' }).click();
await settle(p, 1500);
check('published toast', await p.getByRole('status').filter({ hasText: 'Published' }).isVisible());
check('bar gone after publish', await p.getByRole('region', { name: 'Publish' }).count() === 0);
check('live: published time', await p.getByText(/Live\s*·\s*published/).isVisible());
const state = await (await fetch(M + '/__state')).json();
const pub = state.publications.find(x => x.slug === 'masquerade');
check('stored with the admin email', pub?.published_by === 'owner@example.com');
check('video uploaded to the funnel folder', state.files.length === 1 && state.files[0].startsWith('masquerade/'), state.files.join());
check('backdrop is the public link', pub?.data.backdrop?.src?.startsWith(M + '/storage/v1/object/public/reel-media/masquerade/'));
check('performances reel has the YouTube link', pub?.data.reels.find(r => r.id === 'mr-performances')?.media?.id === '8U1ok3oEq8Q');
check('no blob links published', !JSON.stringify(pub?.data).includes('blob:'));
// 7. Visitors see it straight away
const v = await b.newContext({ timezoneId: 'America/Detroit',  viewport: { width: 390, height: 844 } });
await v.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await v.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const vp = await v.newPage();
await vp.goto(B + '/f/masquerade'); await settle(vp, 1500);
check('live link plays the uploaded background', await vp.evaluate(() => document.querySelector('video')?.src || '').then(s => s.includes('/reel-media/masquerade/')));
await vp.goto(B + '/f/masquerade?start=mr-performances'); await settle(vp, 1500);
check('live reel uses the published YouTube link', await vp.evaluate(() => [...document.querySelectorAll('iframe')].some(f => f.src.includes('/embed/8U1ok3oEq8Q'))));
await vp.screenshot({ path: S + '/live-after-publish.jpg' });
// 8. Reload admin: in sync, nothing to publish
await p.reload(); await settle(p, 1500);
check('after reload: nothing unpublished', await p.getByRole('region', { name: 'Publish' }).count() === 0);
// 9. Discard an edit
await p.getByRole('button', { name: "Move Haute couture Halloween looks up" }).click(); await settle(p, 300);
await bar.getByRole('button', { name: 'Discard' }).click(); await settle(p, 400);
check('discard goes back to live', await p.getByRole('region', { name: 'Publish' }).count() === 0 && (await p.locator('section[aria-labelledby="order-title"] ol > li').first().textContent()).includes('Masks on'));
// 10. Take down
await p.getByText('Funnel settings').click();
await p.getByRole('button', { name: 'Take down published edits' }).click(); await settle(p, 800);
check('taken down', !(await (await fetch(M + '/__state')).json()).publications.some(x => x.slug === 'masquerade'));
await vp.goto(B + '/f/masquerade'); await settle(vp, 1500);
check('live link back to original', await vp.evaluate(() => !document.querySelector('video')));
// 11. New reels are accepted by the tracking API once published (Big Love's live event)
const r = await p.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade', publication: { version: 1, reels: [{ id: 'brand-new-reel', title: 'New', summary: '', practiceArea: 'The night', cta: 'funnel' }], funnel: { order: ['brand-new-reel'], topics: {}, paths: {}, primaryCta: 'tickets' } } } });
check('API publish ok', r.ok(), String(r.status()));
const ev = await p.request.post(B + '/api/reel-events', { data: { visitorId: '11111111-1111-4111-8111-111111111111', funnelId: 'masquerade-v1', reelId: 'brand-new-reel', event: 'viewed' } });
check('tracking accepts a newly published reel', ev.ok(), String(ev.status()));
const bad = await p.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade', publication: { version: 1, reels: [{ id: 'x', title: 'T', summary: '', practiceArea: 'The night', cta: 'funnel', media: { kind: 'video', src: 'blob:http://evil/1' } }], funnel: { order: ['x'], topics: {}, paths: {}, primaryCta: 'tickets' } } } });
check('blob links rejected', bad.status() === 400);
const down = await p.request.delete(B + '/api/admin/publish?slug=masquerade');
check('test publication taken down', down.ok());
// 12. Sign out
await p.getByRole('group').first().evaluate(() => {}).catch(() => {});
await p.locator('nav details summary').click();
await p.getByRole('button', { name: 'Sign out' }).click();
await p.waitForURL(/\/admin\/login/);
await p.goto(B + '/admin');
check('signed out stays out', p.url().includes('/admin/login'));
const anon = await p.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade' } });
check('API refuses signed-out publish', anon.status() === 401);
// 13. Expired sign-in token gets refreshed
await fetch(M + '/__ttl?s=30');
await p.getByLabel('Email').fill('owner@example.com');
await p.getByLabel('Password', { exact: true }).fill('my-own-password-42');
await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL(/\/admin\/home$/); await settle(p, 500);
await p.goto(B + '/admin/overview'); await settle(p, 500);
const log = await (await fetch(M + '/__log')).json();
check('expiring token refreshed', log.some(l => l.includes('grant_type=refresh_token')) && p.url().endsWith('/admin/overview'));
check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
