// Fans, step 3: fans-only reels. A reel marked fans-only keeps its file in
// the private bucket (named "fans:<event>/<file>"); visitors get a locked
// card and never its media (not in the page, its reel page, or the public
// bucket); a follower of the organizer gets a signed address that plays;
// a follower of someone else doesn't. Admins upload privately, see their
// own private files, and get the switch with the content rule.
import { readFileSync } from 'node:fs';
import { chromium, settle } from '../browser.mjs';
import { addGoldenHour } from '../fixtures/golden-hour.mjs';
// Its own test organizer and link (see follow.mjs: the app keeps what earlier suites saw).
const ORGANIZER = 'gh-reels';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const MAIL = 'http://localhost:54700';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const linkIn = (mail) => mail.text.match(/https?:\/\/\S+\/fans\/confirm\?token=[A-Za-z0-9_-]{43}/)?.[0];
const SECRET = 'reels-sundays/secret-after-hours.webm';
const REF = 'fans:' + SECRET;

await fetch(DB + '/__organizer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: ORGANIZER, name: 'Golden Hour Sundays' }) });
const gh = await addGoldenHour((g) => ({ ...g, slug: 'reels-sundays', id: 'reels-sundays' }), DB, ORGANIZER);
await fetch(DB + '/__fan-file?path=' + SECRET, { method: 'POST', headers: { 'Content-Type': 'video/webm' }, body: readFileSync('sample-reel.webm') });

const b = await chromium.launch();
const admin = await b.newContext({ storageState: S + '/auth.json' });

// Publishing: the last reel goes fans-only, its video a private file.
const locked = gh.reels.at(-1);
const reels = gh.reels.map((r) => ({ ...r, cta: 'funnel', ...(r.id === locked.id ? { visibility: 'fans', media: { kind: 'video', src: REF } } : {}) }));
const publication = (rs) => ({ version: 1, reels: rs, funnel: { order: rs.map((r) => r.id), topics: {}, paths: {}, primaryCta: gh.primaryCta } });
const publish = (rs) => admin.request.post(B + '/api/admin/publish', { data: { slug: gh.slug, publication: publication(rs) } });
const otherFolder = await publish(reels.map((r) => (r.id === locked.id ? { ...r, media: { kind: 'video', src: 'fans:masquerade/x.webm' } } : r)));
check("a private file from another event's folder is refused", otherFolder.status() === 400, String(otherFolder.status()));
const notFans = await publish(reels.map((r) => (r.id === locked.id ? { ...r, visibility: undefined } : r)));
check('a private file on a reel that isn\'t fans-only is refused', notFans.status() === 400, String(notFans.status()));
const pub = await publish(reels);
check('publishes a fans-only reel', pub.ok(), String(pub.status()));

// Nothing visitors receive carries it. (Right after a publish, the first
// visit can still get the page from before it: wait for the new one.)
let html = '';
for (let i = 0; i < 40 && !html.includes('visibility'); i++) {
  html = await (await fetch(B + '/f/' + gh.slug)).text();
  if (!html.includes('visibility')) await new Promise((r) => setTimeout(r, 250));
}
check('the page has the fans-only reel', html.includes('visibility'));
check('the page names the reel', html.includes(locked.title.replace(/'/g, '&#x27;')) || html.includes(locked.title));
check("the page doesn't carry its file", !html.includes('secret-after-hours') && !html.includes('fans:'));
const reelPage = await (await fetch(`${B}/f/${gh.slug}/r/${locked.id}`)).text();
check("its reel page doesn't carry it", !reelPage.includes('secret-after-hours'));
check('the private bucket has no public address', (await fetch(`${DB}/storage/v1/object/public/reel-media-fans/${SECRET}`)).status === 400);
check('no cookie: no media', (await fetch(`${B}/api/fans/media?slug=${gh.slug}`)).status === 401);

// A visitor: the locked card, then Follow to watch.
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`${B}/f/${gh.slug}?start=${locked.id}`); await settle(p, 2000);
check('a visitor sees the locked card', await p.getByText('Fans only', { exact: true }).isVisible());
check('with the reel\'s title', await p.getByText(locked.title, { exact: true }).first().isVisible());
check('no video plays', await p.locator('video').count() === 0);
await p.screenshot({ path: 'fan-reel-locked-390.png' });
await p.getByRole('button', { name: 'Follow to watch' }).click(); await settle(p, 500);
const sheet = p.getByRole('dialog', { name: 'Follow Golden Hour Sundays' });
check('Follow to watch opens Follow', await sheet.isVisible());
await sheet.getByLabel('Email').fill('insider@example.com');
await sheet.getByRole('button', { name: 'Follow', exact: true }).click();
await p.getByRole('heading', { name: 'Check your email' }).waitFor({ timeout: 5000 }).catch(() => {});
const mail = (await (await fetch(MAIL + '/__emails')).json()).at(-1);
await p.goto(linkIn(mail)); await settle(p, 800);
await p.getByRole('button', { name: 'Confirm and follow' }).click(); await p.waitForURL(/following=/); await settle(p, 500);

// A follower: the reel plays from a signed address.
await p.goto(`${B}/f/${gh.slug}?start=${locked.id}`); await settle(p, 2500);
const video = p.locator('video').first();
await video.waitFor({ timeout: 8000 }).catch(() => {});
const src = await video.getAttribute('src').catch(() => null);
check('a follower gets the video', Boolean(src) && src.includes('/storage/v1/object/sign/reel-media-fans/' + SECRET + '?token='), String(src));
check('the signed address plays', Boolean(src) && (await fetch(src)).status === 200);
check('a changed token doesn\'t', Boolean(src) && (await fetch(src.replace(/token=[^&]+/, 'token=s999999'))).status === 400);
check('no locked card for a follower', await p.getByText('Fans only', { exact: true }).count() === 0);
const media = await ctx.request.get(`${B}/api/fans/media?slug=${gh.slug}`);
const body = await media.json();
check('the media answer is private and only the fans-only reel', media.headers()['cache-control']?.includes('no-store') && Object.keys(body.reels ?? {}).join() === locked.id, JSON.stringify(body).slice(0, 200));

// Following someone else doesn't unlock it.
const other = await b.newContext();
await fetch(B + '/api/fans/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'bigfan@example.com', organizer: 'biglove' }) });
const op = await other.newPage();
await op.goto(linkIn((await (await fetch(MAIL + '/__emails')).json()).at(-1))); await settle(op, 500);
await op.getByRole('button', { name: 'Confirm and follow' }).click(); await op.waitForURL(/following=/);
check("a follower of another organizer can't get it", (await other.request.get(`${B}/api/fans/media?slug=${gh.slug}`)).status() === 403);

// Admins: private uploads, and their own private files to watch.
const up = await (await admin.request.post(B + '/api/admin/upload-url', { data: { slug: gh.slug, name: 'clip.mp4', type: 'video/mp4', size: 1000, fans: true } })).json();
check('a fans-only upload goes to the private bucket', up.uploadUrl?.includes('/upload/sign/reel-media-fans/' + gh.slug + '/') && up.publicUrl?.startsWith('fans:' + gh.slug + '/'), JSON.stringify(up));
const signed = await (await admin.request.post(B + '/api/admin/fan-media', { data: { slug: gh.slug, refs: [REF, 'fans:masquerade/x.webm'] } })).json();
check("the event's admin gets its private files, not another event's", Object.keys(signed.urls ?? {}).join() === REF, JSON.stringify(signed));
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check("another organizer's admin can't", (await rival.request.post(B + '/api/admin/fan-media', { data: { slug: gh.slug, refs: [REF] } })).status() === 403);

// The editor: the switch, with the content rule beside it.
const ed = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
await ed.goto(B + '/admin', { waitUntil: 'networkidle' });
const firstRow = ed.locator('section[aria-labelledby="order-title"] ol > li').first();
const firstTitle = await firstRow.locator('p.font-bold').textContent();
await ed.getByRole('button', { name: `Edit ${firstTitle}` }).click();
const dlg = ed.getByRole('dialog');
const sw = dlg.getByRole('switch', { name: /Fans only/ });
check('the editor has a Fans only switch, off', await sw.isVisible() && (await sw.getAttribute('aria-checked')) === 'false');
await sw.click();
check('it switches on', (await sw.getAttribute('aria-checked')) === 'true');
check('turned on, it shows the content rule', await dlg.getByText('Suggestive yes, explicit no.').isVisible() && await dlg.getByText(/No nudity and no sex acts/).isVisible());
check('and says a public file stays public', await dlg.getByText(/already at a public address|YouTube link can still watch/).isVisible());
await ed.waitForTimeout(400);
await ed.screenshot({ path: 'fan-reel-editor-1279.png' });
await ed.keyboard.press('Escape');

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
