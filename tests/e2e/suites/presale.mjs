// Fans, step 4: a presale for followers. A date's presale window is
// published with it; its link isn't (event_presales, admins and the server
// only). During the window, followers get "Get presale tickets" with the
// link, everyone else "Fans get tickets first" and Follow; outside it,
// nothing. The date sheet sets it up.
import { animationsDone, chromium, settle, testNow } from '../browser.mjs';
import { addGoldenHour } from '../fixtures/golden-hour.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const MAIL = 'http://localhost:54700';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const linkIn = (mail) => mail.text.match(/https?:\/\/\S+\/fans\/confirm\?token=[A-Za-z0-9_-]{43}/)?.[0];
const state = async () => (await fetch(DB + '/__state')).json();
// Its own test organizer and link (see follow.mjs: the app keeps what earlier suites saw).
const ORGANIZER = 'gh-presale';
const LINK = 'https://www.eventbrite.com/e/golden-hour-tickets-123456789?discount=FANSFIRST';

await fetch(DB + '/__organizer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: ORGANIZER, name: 'Golden Hour Sundays' }) });
// Presales for followers are part of Core.
const setPlan = (row) => fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: ORGANIZER, ...row }) });
// The app keeps a plan for a second, then refreshes it on the next ask: wait, ask once, then look.
const switchPlan = async (row, ask) => { await setPlan(row); await new Promise((r) => setTimeout(r, 1500)); await ask(); await new Promise((r) => setTimeout(r, 500)); };
await setPlan({ status: 'comped' });
const gh = await addGoldenHour((g) => ({ ...g, slug: 'presale-sundays', id: 'presale-sundays' }), DB, ORGANIZER);
const b = await chromium.launch();
const admin = await b.newContext({ storageState: S + '/auth.json' });

// The next date still to come gets a presale, open now for two days.
const now = testNow();
const next = gh.events.filter((e) => Date.parse(e.startsAt) > now + 3 * 864e5).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
const window = { opensAt: new Date(now - 3600e3).toISOString(), endsAt: new Date(now + 2 * 864e5).toISOString() };
const reels = gh.reels.map((r) => ({ ...r, cta: 'funnel' }));
const publication = (events) => ({ version: 1, reels, funnel: { order: reels.map((r) => r.id), topics: {}, paths: {}, primaryCta: gh.primaryCta }, events });
const withPresale = (presale) => gh.events.map((e) => (e.id === next.id ? { ...e, presale } : e));
const publish = (events) => admin.request.post(B + '/api/admin/publish', { data: { slug: gh.slug, publication: publication(events) } });
// Right after a publish, the first visit can still get the page from before it
// (it's rebuilt in the background): wait until the page shows `marker`, or stops showing it.
async function pageShows(marker, shown = true) {
  for (let i = 0; i < 40; i++) {
    if ((await (await fetch(B + '/f/' + gh.slug)).text()).includes(marker) === shown) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

check('a presale without a link is refused', (await publish(withPresale(window))).status() === 400);
check('a presale link must be https', (await publish(withPresale({ ...window, url: 'http://example.com/p' }))).status() === 400);
const pub = await publish(withPresale({ ...window, url: LINK }));
check('publishes a presale', pub.ok(), String(pub.status()));
let s = await state();
check('the link is kept privately', s.presales[gh.id]?.[0]?.url === LINK && s.presales[gh.id][0].date_id === next.id, JSON.stringify(s.presales));
const stored = s.publications.find((p) => p.slug === gh.slug);
check('the published edits keep the window, not the link', JSON.stringify(stored).includes(window.opensAt) && !JSON.stringify(stored).includes('FANSFIRST'));
const back = await (await admin.request.get(`${B}/api/admin/publish?slug=${gh.slug}`)).json();
check('the editor gets the link back', back.publication?.events?.find((e) => e.id === next.id)?.presale?.url === LINK);

// Nothing visitors receive carries the link.
check('the page shows the window', await pageShows(window.opensAt));
const html = await (await fetch(B + '/f/' + gh.slug)).text();
check("the page doesn't carry the link", !html.includes('FANSFIRST'));
check('no cookie: no link', (await fetch(`${B}/api/fans/presale?slug=${gh.slug}`)).status === 401);

// A visitor: "Fans get tickets first", and Follow.
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/f/' + gh.slug); await settle(p, 2000);
check('a visitor sees the presale for fans', await p.getByText(/Presale for fans/).isVisible());
check('fans get tickets first', await p.getByText(/Fans get tickets first/).isVisible());
check('no presale link for a visitor', await p.locator(`a[href*="FANSFIRST"]`).count() === 0);
await animationsDone(p, 4000); await p.screenshot({ path: 'presale-visitor-390.png' });
await p.getByRole('button', { name: 'Follow for presale' }).click(); await settle(p, 400);
const sheet = p.getByRole('dialog', { name: 'Follow Golden Hour Sundays' });
check('Follow for presale opens Follow', await sheet.isVisible());
await sheet.getByLabel('Email').fill('presale.fan@example.com');
await sheet.getByRole('button', { name: 'Follow', exact: true }).click();
await p.getByRole('heading', { name: 'Check your email' }).waitFor({ timeout: 5000 }).catch(() => {});
await p.goto(linkIn((await (await fetch(MAIL + '/__emails')).json()).at(-1))); await settle(p, 500);
await p.getByRole('button', { name: 'Confirm and follow' }).click(); await p.waitForURL(/following=/);

// A follower: the presale button, with the link.
await p.goto(B + '/f/' + gh.slug); await settle(p, 2500);
const buy = p.getByRole('link', { name: 'Get presale tickets' });
await buy.waitFor({ timeout: 5000 }).catch(() => {});
check('a follower gets the presale button', await buy.isVisible());
check('with the presale link', (await buy.getAttribute('href')) === LINK, await buy.getAttribute('href').catch(() => ''));
check('it opens in a new tab', (await buy.getAttribute('target')) === '_blank');
await animationsDone(p, 4000); await p.screenshot({ path: 'presale-follower-390.png' });

// Without Core (Free): no presale, for anyone; back with Core, it's there again.
await switchPlan({}, () => ctx.request.get(`${B}/api/fans/presale?slug=${gh.slug}`));
check('on Free: no presale link, even for a follower', JSON.stringify(await (await ctx.request.get(`${B}/api/fans/presale?slug=${gh.slug}`)).json()) === '{"dates":{}}');
// The page is rebuilt in the background once its plan is a second old: the second visit has it.
await p.goto(B + '/f/' + gh.slug); await settle(p, 1500);
await p.goto(B + '/f/' + gh.slug); await settle(p, 2000);
check('on Free: no presale notice', await p.getByText(/Presale for fans/).count() === 0);
await switchPlan({ status: 'trialing', trial_ends_at: new Date(Date.now() + 5 * 864e5).toISOString() }, () => ctx.request.get(`${B}/api/fans/presale?slug=${gh.slug}`));
check('on the trial: the presale link again', Object.values((await (await ctx.request.get(`${B}/api/fans/presale?slug=${gh.slug}`)).json()).dates ?? {}).includes(LINK));
await switchPlan({ status: 'comped' }, () => ctx.request.get(`${B}/api/fans/presale?slug=${gh.slug}`));
await p.goto(B + '/f/' + gh.slug); await settle(p, 1500);

// Following someone else: no link.
const other = await b.newContext();
await fetch(B + '/api/fans/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'elsewhere@example.com', organizer: 'biglove' }) });
const op = await other.newPage();
await op.goto(linkIn((await (await fetch(MAIL + '/__emails')).json()).at(-1))); await settle(op, 500);
await op.getByRole('button', { name: 'Confirm and follow' }).click(); await op.waitForURL(/following=/);
check("a follower of another organizer gets no link", (await other.request.get(`${B}/api/fans/presale?slug=${gh.slug}`)).status() === 403);

// Outside the window: nothing, for anyone.
const closed = { opensAt: new Date(now - 3 * 864e5).toISOString(), endsAt: new Date(now - 2 * 864e5).toISOString(), url: LINK };
check('republished with the window over', (await publish(withPresale(closed))).ok() && await pageShows(closed.opensAt));
check('a follower gets no link after the window', JSON.stringify(await (await ctx.request.get(`${B}/api/fans/presale?slug=${gh.slug}`)).json()) === '{"dates":{}}');
await p.goto(B + '/f/' + gh.slug); await settle(p, 2000);
check('no presale notice after the window', await p.getByText(/Presale for fans/).count() === 0);

// Taking the edits down clears the links.
await admin.request.delete(`${B}/api/admin/publish?slug=${gh.slug}`);
check('taken down: no presale links kept', ((await state()).presales[gh.id] ?? []).length === 0);

// Others can't read or write an event's links.
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check("another organizer's admin can't read them", (await rival.request.get(`${B}/api/admin/publish?slug=${gh.slug}`)).status() === 403);
check('visitors can\'t read the table', (await fetch(`${DB}/rest/v1/event_presales?funnel_id=eq.${gh.id}`, { headers: { apikey: 'test' } })).status === 401);

// The date sheet: a presale switch with the link and window.
const ed = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ed.goto(B + '/admin'); await settle(ed, 800);
await ed.locator('section[aria-labelledby="dates-title"]').locator(':scope > ul > li').first().getByRole('button').click();
const ds = ed.locator('dialog[open]');
const sw = ds.getByRole('switch', { name: 'Presale for followers' });
check('the date sheet has a presale switch, off', await sw.isVisible() && (await sw.getAttribute('aria-checked')) === 'false');
await sw.click();
check('on, it asks for the link and the window', await ds.getByLabel('Presale link').isVisible() && await ds.getByLabel('Opens', { exact: true }).isVisible() && await ds.getByLabel('Ends', { exact: true }).isVisible());
await ds.getByRole('button', { name: 'Save', exact: true }).click(); await settle(ed, 200);
check('saving without a link says what to do', await ds.getByText(/Paste the presale link/).isVisible());
await ds.getByLabel('Presale link').fill(LINK);
await ds.getByRole('button', { name: 'Save', exact: true }).click(); await settle(ed, 300);
check('with a link, it saves', await ed.locator('dialog[open]').count() === 0);
await ed.screenshot({ path: 'presale-editor-390.png' });

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
