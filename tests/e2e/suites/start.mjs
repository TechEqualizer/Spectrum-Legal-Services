// Sign-up, step 1: /start. With a usable invite, an organizer says what
// they run and drops their flyer; the phone beside the wizard (the real link
// player) fills in with the night's name, poster and colors; what the flyer
// said is shown to check; the draft survives a reload. Without one, the page
// says why. Each flyer read counts against the invite (5 at most).
import { readFileSync } from 'node:fs';
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const CLAUDE = 'http://localhost:54400';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
// Big Love's flyer (the mock reader answers the same for any picture).
const flyer = new URL('../fixtures/flyer-masquerade.jpg', import.meta.url).pathname;
const png = readFileSync(flyer);

const b = await chromium.launch();
const errs = [];
// An invite, made the way Showlnk makes one.
const admin = await b.newContext({ storageState: S + '/auth.json' });
const made = await (await admin.request.post(B + '/api/admin/invites', { data: { note: 'Velvet Room' } })).json();
const code = new URL(made.link).searchParams.get('invite');
const setInvite = (set) => fetch(DB + '/__invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'Velvet Room', set }) });

// No invite, or a wrong one: invite-only, and what to do.
const anon = await b.newContext({ viewport: { width: 1279, height: 900 } });
let p = await anon.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/start'); await settle(p, 500);
check('no invite: says Showlnk is invite-only', await p.getByRole('heading', { name: 'Showlnk is invite-only for now' }).isVisible());
await p.goto(B + '/start?invite=' + 'x'.repeat(32)); await settle(p, 500);
check('a wrong invite: the same', await p.getByRole('heading', { name: 'Showlnk is invite-only for now' }).isVisible());
check('not for search engines', (await p.locator('meta[name="robots"]').getAttribute('content'))?.includes('noindex'));

// The wizard.
const reelEvents = [];
await p.route('**/api/reel-events', (r) => { reelEvents.push(r.request().url()); r.fulfill({ status: 204 }); });
await p.goto(B + '/start?invite=' + code); await settle(p, 1200);
check('step 1: drop your flyer', await p.getByRole('heading', { name: 'Drop your flyer.' }).isVisible());
check('the step bar: 3 steps, on the first', (await p.getByRole('list', { name: 'Steps' }).getByRole('listitem').allTextContents()).join('|') === 'Your flyer|Watch it|Your link' && (await p.locator('[aria-current="step"]').textContent()) === 'Your flyer');
const phone = p.frameLocator('iframe[title="Your link, as fans will see it"]');
await phone.locator('main').first().waitFor({ timeout: 10000 }).catch(() => {});
check('the phone is live before the flyer: the link player', await phone.getByText('Your night').first().isVisible().catch(() => false));
const next = p.getByRole('button', { name: /^(Continue|Watch your night)$/ });
check('Continue waits for the flyer', await next.isDisabled() && await p.getByText('Add your flyer to continue.').isVisible());

await p.getByRole('radio', { name: 'Venue' }).click();
check('what they run: picked', (await p.getByRole('radio', { name: 'Venue' }).getAttribute('aria-checked')) === 'true');

await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'multi' });
await p.locator('input[type=file]').setInputFiles(flyer);
await p.getByText('From your flyer', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
const card = await p.locator('section').first().innerText();
check('what the flyer said, to check', card.toLowerCase().includes('golden hour: halloween') && card.includes('The Rooftop, Downtown') && card.includes('From $30'), card.slice(0, 300));
check('and the other dates', card.includes('And 1 more date from the flyer.'), card);
await p.waitForTimeout(1500);
check('the phone: their night', await phone.getByText('Golden Hour: Halloween').first().isVisible().catch(() => false));
check('the phone: their flyer behind it', (await phone.locator('img[src^="data:image/jpeg"]').count()) > 0);
check('Continue, now: into watching the night', await next.isEnabled() && (await next.textContent()) === 'Watch your night');
// Right after the scan, step 1 shows what the flyer is becoming, each line ticked as it lands, while the phone builds it.
const built = p.getByText('Your link is built.');
await built.waitFor({ timeout: 15000 }).catch(() => {});
const ticks = await p.locator('li').filter({ has: p.locator('.start-tick') }).allTextContents();
check('step 1: everything the flyer became, ticked off', await built.isVisible() && ['Your night, its dates and venue', 'Your colors and type', 'Three reels that sell your night', 'An opening and every reel, cut from your flyer'].every((t) => ticks.some((x) => x.includes(t))), ticks.join(' | '));
check('step 1: the reels by name, the shots counted', ticks.some((x) => x.includes('Masks on · Bring your crew · Last call')) && ticks.some((x) => x.includes('The opening and 3 reels, shot by shot like a trailer')), ticks.join(' | '));
check('step 1: the phone already plays the story written from the flyer', await phone.getByText('Masks on, Detroit').first().waitFor({ timeout: 15000 }).then(() => true, () => false));
await p.screenshot({ path: 'start-flyer-1279.png' });
check('the preview counts no visits', reelEvents.length === 0, reelEvents.join(' '));
const list = await (await admin.request.get(B + '/api/admin/invites')).json();
check('the read counted against the invite', list.invites.find((i) => i.note === 'Velvet Room')?.flyer_reads === 1);

// Coming back: carries on. (After the whole draft, words then shots: a reload mid-draft keeps only the stages that came.)
await p.waitForFunction(() => Object.keys(localStorage).some((k) => { try { return Boolean(JSON.parse(localStorage.getItem(k))?.reels?.opening); } catch { return false; } }), null, { timeout: 15000 }).catch(() => {});
await p.reload(); await settle(p, 1500);
check('a reload keeps the draft', await p.getByText('From your flyer', { exact: true }).isVisible() && (await p.getByRole('radio', { name: 'Venue' }).getAttribute('aria-checked')) === 'true');

await next.click();
check('step 2 is next', await p.getByRole('heading', { name: 'Watch your night.' }).isVisible() && (await p.locator('[aria-current="step"]').textContent()) === 'Watch it');

// Step 2: watch the story drafted from the flyer (in the same answer as the read): each part named with why
// it sells, a tap plays it; the words fold away under Change the words.
const story = p.getByRole('list', { name: 'Your story' });
const part = (label) => p.getByRole('button', { name: `Play ${label} in the phone` });
const words = p.locator('details').filter({ hasText: 'Change the words' });
const openWords = async () => { if (!(await words.getAttribute('open').catch(() => null) !== null)) await words.locator('summary').click(); };
const reel = (label) => words.locator('fieldset').filter({ hasText: label });
await part('The Night').filter({ hasText: 'Masks on' }).waitFor({ timeout: 15000 }).catch(() => {});
check('the story, in order', (await story.locator('li span.uppercase').allTextContents()).join('|') === 'Opening|The Night|Your People|Last Call', (await story.locator('li span.uppercase').allTextContents()).join('|'));
check('drafted from the flyer', /Masks on, Detroit/.test(await part('Opening').innerText()) && /Masks on/.test(await part('The Night').innerText()));
check('each says why it sells', /people like them/.test(await part('Your People').innerText()) && /reason to buy now/.test(await part('Last Call').innerText()));
await p.screenshot({ path: 'start-watch-1279.png' });
check('the words are folded away', !(await reel('Opening').getByLabel('Title').isVisible().catch(() => false)));
// The words come first, then the shots: the phone starts over with them, and the opening plays.
await p.getByText('One flyer in. An opening and three reels out', { exact: false }).waitFor({ timeout: 15000 }).catch(() => {});
// The opening cut from the flyer plays first, with the flyer's own words; the title comes up as it settles.
const playing = await phone.getByText('Masks on.', { exact: true }).first().waitFor({ timeout: 8000 }).then(() => true, () => false);
check('the phone: the opening plays, with the flyer\'s words', playing && !(await phone.getByText('Masks on, Detroit').first().isVisible().catch(() => false)));
check('the phone: a shot too small to stay sharp was widened, an unknown move dropped', !(await phone.getByText('Dropped', { exact: true }).count()));
await phone.getByText('Masks on, Detroit').first().waitFor({ timeout: 15000 }).catch(() => {});
check('the phone: then the drafted opening\'s title', await phone.getByText('Masks on, Detroit').first().isVisible().catch(() => false));
check('the drafting read counted once', (await (await admin.request.get(B + '/api/admin/invites')).json()).invites.find((i) => i.note === 'Velvet Room')?.flyer_reads === 1);

// Words change under Change the words, and the phone keeps up.
await openWords();
await reel('Opening').getByLabel('Title').fill('Masks on, Motor City');
await p.waitForTimeout(500);
check('an edit shows in the phone', await phone.getByText('Masks on, Motor City').first().isVisible().catch(() => false));
await reel('The Night').getByLabel('Title').fill('You, in gold');
await part('The Night').click();
await p.waitForTimeout(1200);
check('Play: the reel, in the phone', await phone.getByText('You, in gold', { exact: true }).first().isVisible().catch(() => false));
check('Play: marks the part playing', (await part('The Night').getAttribute('aria-pressed')) === 'true' && (await part('Opening').getAttribute('aria-pressed')) === 'false');
// Only a flyer, and every reel is cut from it: The Night plays its own shots and words, then moves on to Your People, cut its own way.
check('the reels are sold as cut from the flyer', await p.getByText('One flyer in. An opening and three reels out', { exact: false }).isVisible());
check('The Night: its cut from the flyer, with its own words', await phone.getByText('Gold all night', { exact: true }).first().waitFor({ timeout: 8000 }).then(() => true, () => false));
check('then Your People, cut its own way', await phone.getByText('Thirty and up', { exact: true }).first().waitFor({ timeout: 15000 }).then(() => true, () => false));

// Building is free and there is no trial: no Core card here, and the phone shows
// only what going live gives (no Follow, presale or fans-only reel; those are the Fans add-on).
check('no trial card', !(await p.getByText(/free for 14 days|Already on your link/).count()));
check('the phone: no Follow, presale or locked reel', !(await phone.getByText('Follow', { exact: true }).count()) && !(await phone.getByText(/Presale for fans|Follow to watch/).count()));
check('still no visits', reelEvents.length === 0, reelEvents.join(' '));

// Edits survive coming back.
await p.reload(); await settle(p, 1500);
await next.click();
await openWords();
check('a reload keeps the edits', (await reel('Opening').getByLabel('Title').inputValue()) === 'Masks on, Motor City');
await p.getByRole('button', { name: 'Claim this link' }).click();
check('step 3 is next', await p.getByRole('heading', { name: 'Claim your link.' }).isVisible() && (await p.locator('[aria-current="step"]').textContent()) === 'Your link');
await p.getByRole('button', { name: 'Back to your reels' }).click();
await p.getByRole('button', { name: 'Back to your flyer' }).click();

// Reels that couldn't be drafted: they start from the flyer's basics.
await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'nodraft' });
await p.getByRole('button', { name: 'Use a different flyer' }).click();
await p.locator('input[type=file]').setInputFiles(flyer);
await p.getByText('From your flyer', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
await p.waitForTimeout(2000);
await next.click();
await openWords();
check("no draft: says so, and starts from the flyer", await p.getByText("We couldn't write these from your flyer just now", { exact: false }).isVisible() && (await reel('Opening').getByLabel('Title').inputValue()) === 'Golden Hour: Halloween', await reel('Opening').getByLabel('Title').inputValue().catch(() => ''));
await p.getByRole('button', { name: 'Back to your flyer' }).click();

// A flyer with no date.
await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'none' });
await p.getByRole('button', { name: 'Use a different flyer' }).click();
await p.locator('input[type=file]').setInputFiles(flyer);
await p.locator('p[role=alert]').waitFor({ timeout: 15000 }).catch(() => {});
check("no date found: says what to try", (await p.locator('p[role=alert]').textContent())?.includes("couldn't find a date"));
check('and keeps the last flyer', await p.getByText('Golden Hour: Halloween').first().isVisible());
await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'multi' });

// The draft starts with the reading and streams in stages, never before the reading: the words alone, then the shots.
await setInvite({ flyer_reads: 0 });
const staged = await anon.request.post(B + '/api/start/flyer', { data: { invite: code, type: 'image/jpeg', data: png.toString('base64'), today: '2026-10-01' } });
const lines = (await staged.text()).trim().split('\n').map((l) => JSON.parse(l));
const shape = lines.map((l) => (l.read ? 'read' : l.draft ? (l.draft.opening ? 'shots' : 'words') : Object.keys(l).join('+'))).join(' > ');
check('the draft streams in stages: the reading, the words, then the shots', lines[0]?.read && lines[1]?.draft && !lines[1].draft.opening && lines.at(-1)?.draft?.opening && lines.at(-1).draft.reels.some((r) => r.cut), shape);

// The invite's limit.
await setInvite({ flyer_reads: 5 });
const direct = await anon.request.post(B + '/api/start/flyer', { data: { invite: code, type: 'image/jpeg', data: png.toString('base64') } });
check('after 5 reads: no more', direct.status() === 403 && (await direct.json()).error.includes('read 5 flyers'));
check('no invite: no reading', (await anon.request.post(B + '/api/start/flyer', { data: { invite: 'nope', type: 'image/jpeg', data: png.toString('base64') } })).status() === 403);

// Expired.
await setInvite({ expires_at: '2026-01-01T00:00:00.000Z' });
await p.goto(B + '/start?invite=' + code); await settle(p, 500);
check('an expired invite: says so', await p.getByRole('heading', { name: 'This invite has expired' }).isVisible());
await setInvite({ expires_at: new Date(Date.now() + 864e5).toISOString(), flyer_reads: 1 });

// On a phone: the phone below, nothing sideways.
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
m.on('pageerror', (e) => errs.push(e.message));
await m.goto(B + '/start?invite=' + code); await settle(m, 1200);
check('phone: fits', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: 'start-390.png', fullPage: true });
// Step 2 on a phone, with the draft made above.
const saved = await p.evaluate(() => Object.entries(localStorage).filter(([k]) => k.startsWith('showlnk-start-')));
await m.evaluate((entries) => entries.forEach(([k, v]) => localStorage.setItem(k, v)), saved);
await m.reload(); await settle(m, 1200);
await m.getByRole('button', { name: 'Watch your night' }).click(); await m.waitForTimeout(800);
check('phone: step 2 fits', await m.getByRole('heading', { name: 'Watch your night.' }).isVisible() && await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const claimBar = await m.getByRole('button', { name: 'Claim this link' }).boundingBox();
check('phone: Claim this link stays in reach at the bottom', Boolean(claimBar) && claimBar.y + claimBar.height <= 844 && claimBar.y > 700, JSON.stringify(claimBar));
await m.screenshot({ path: 'start-reels-390.png', fullPage: true });

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
