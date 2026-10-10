// Fans, step 6: the organizer's fans in the admin, beside Leads
// (/admin/leads/fans). Who follows (newest first), where from, how many
// unfollowed, the list as a CSV, removing a fan from this organizer only,
// and only the organizer's own admins see any of it.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const MAIL = 'http://localhost:54700';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const linkIn = (mail) => mail.text.match(/https?:\/\/\S+\/fans\/confirm\?token=[A-Za-z0-9_-]{43}/)?.[0];
const b = await chromium.launch();

// Three people follow Big Love (one later unfollows), and one of them follows another organizer too.
async function follow(email, organizer, extra = {}) {
  await fetch(B + '/api/fans/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, organizer, ...extra }) });
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(linkIn((await (await fetch(MAIL + '/__emails')).json()).at(-1))); await settle(p, 300);
  await p.getByRole('button', { name: 'Confirm and follow' }).click(); await p.waitForURL(/following=/);
  return ctx;
}
await fetch(DB + '/__organizer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'gh-admin', name: 'Golden Hour Sundays' }) });
await follow('first@example.com', 'biglove', { sourceTag: 'instagram', funnelId: 'masquerade-v1' });
await follow('first@example.com', 'gh-admin');
await follow('=cmd|evil@example.com', 'biglove', { sourceTag: 'tiktok' });
const leaving = await follow('leaving@example.com', 'biglove');
await leaving.request.post(B + '/api/fans/unfollow', { headers: { Origin: B }, data: { organizer: 'biglove' } });

// The page, beside Leads.
const p = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 1279, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/leads'); await settle(p, 800);
const tabs = p.getByRole('navigation', { name: 'Leads and fans' });
check('Leads has a Leads | Fans switch', await tabs.getByRole('link', { name: 'Leads' }).getAttribute('aria-current') === 'page' && await tabs.getByRole('link', { name: 'Fans' }).isVisible());
await tabs.getByRole('link', { name: 'Fans' }).click(); await p.waitForURL('**/admin/leads/fans'); await settle(p, 800);
check('the Fans page', (await p.getByRole('heading', { level: 1 }).textContent()) === 'Fans');
check('the nav keeps Leads current', (await p.locator('nav [aria-current="page"]').first().textContent())?.includes('Leads'));
check('it names the organizer', await p.getByText(/People following Big Love Productions/).isVisible());
const list = p.getByRole('list').filter({ hasText: 'first@example.com' });
const rows = await list.getByRole('listitem').allTextContents();
check('two following, newest first', rows.length === 2 && rows[0].includes('evil@example.com') && rows[1].includes('first@example.com'), rows.join(' | '));
check('where each followed from', rows[1]?.includes('Instagram') && rows[1].includes('Masquerade on the Runway'), rows[1]);
check('counts: following and unfollowed', (await p.locator('dl').first().innerText()).replace(/\s+/g, ' ').toLowerCase().includes('following 2 unfollowed 1'), await p.locator('dl').first().innerText());
check('says Follow isn\'t on for these links yet', await p.getByText(/Follow isn.t switched on for your links yet/).isVisible());
await p.screenshot({ path: 'fans-admin-1279.png' });

// The CSV: theirs to keep, current fans only, spreadsheet-safe.
const csvRes = await p.request.get(B + '/api/admin/fans/export?slug=masquerade');
const csv = await csvRes.text();
check('a CSV download', csvRes.headers()['content-type']?.startsWith('text/csv') && csvRes.headers()['content-disposition']?.includes('biglove-fans.csv'));
check('header and current fans only', csv.startsWith('"Email","Followed","Shared on","Followed from"') && csv.includes('"first@example.com"') && !csv.includes('leaving@example.com'), csv.slice(0, 200));
check("a cell that looks like a formula can't run", csv.includes(`"'=cmd|evil@example.com"`));

// The numbers on Home and Results: new followers (no one's email), against the period before.
const counts = await (await p.request.get(B + '/api/admin/fans/counts?slug=masquerade&days=30&funnel=masquerade-v1')).json();
check('counts: new follows, following now, and from this link', counts.current === 3 && counts.previous === 0 && counts.following === 2 && counts.fromLink?.current === 1, JSON.stringify(counts));
check('counts carry no emails', !JSON.stringify(counts).includes('@'));
check('counts: only 7, 30 or 90 days', (await p.request.get(B + '/api/admin/fans/counts?slug=masquerade&days=5')).status() === 400);
await p.goto(B + '/admin/home'); await settle(p, 1500);
const homeTile = p.getByRole('link', { name: /New followers/ });
await homeTile.waitFor({ timeout: 8000 }).catch(() => {});
check('Home: a New followers tile', /New followers\s*3/.test(await homeTile.innerText().catch(() => '')) && (await homeTile.innerText()).includes('2 following in all'), await homeTile.innerText().catch(() => 'missing'));
check('it opens Fans', (await homeTile.getAttribute('href')) === '/admin/leads/fans');
await p.screenshot({ path: 'fans-home-1279.png' });
await p.goto(B + '/admin/overview'); await settle(p, 1500);
await p.getByText('New followers').waitFor({ timeout: 8000 }).catch(() => {});
const resultsText = await p.locator('main').innerText();
check('Results: new followers from this link', /New followers\s*1/.test(resultsText) && resultsText.includes('From this link · 2 following in all'), resultsText.slice(0, 400));
await p.goto(B + '/admin/leads/fans'); await settle(p, 800);

// Removing a fan: asked first, then gone from this organizer only.
await p.getByRole('button', { name: 'Remove first@example.com' }).click();
check('asks before removing', await p.getByText('Remove from your list?').isVisible());
await p.getByRole('button', { name: 'Keep' }).click();
check('Keep leaves them', await list.getByText('first@example.com').isVisible());
await p.getByRole('button', { name: 'Remove first@example.com' }).click();
await p.getByRole('button', { name: 'Remove', exact: true }).click();
await p.getByRole('status').filter({ hasText: 'Removed first@example.com' }).waitFor({ timeout: 5000 }).catch(() => {});
check('removed, and it says so', await p.getByRole('status').filter({ hasText: 'Removed first@example.com' }).isVisible() && await p.getByText('first@example.com', { exact: true }).count() === 0);
const st = await (await fetch(DB + '/__state')).json();
const fanId = st.fans.find((f) => f.email === 'first@example.com')?.id;
check('only from this organizer', !st.follows.some((f) => f.fan_id === fanId && f.organizer_slug === 'biglove') && st.follows.some((f) => f.fan_id === fanId && f.organizer_slug === 'gh-admin'));

// Who may see them: the organizer's own admins only.
const own = await b.newContext();
await own.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
check("the organizer's own admin can", (await own.request.get(B + '/api/admin/fans?slug=masquerade')).ok());
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'rival@example.com', password: 'rival-pass-1' } });
check("another business's admin can't list them", (await rival.request.get(B + '/api/admin/fans?slug=masquerade')).status() === 403);
check("or export them", (await rival.request.get(B + '/api/admin/fans/export?slug=masquerade')).status() === 403);
check("or remove one", (await rival.request.delete(B + '/api/admin/fans?slug=masquerade&email=evil@example.com')).status() === 403);
check('signed out: nothing', (await fetch(B + '/api/admin/fans?slug=masquerade')).status === 401);

// On a phone.
const phone = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await phone.goto(B + '/admin/leads/fans'); await settle(phone, 800);
check('fits a phone', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await phone.screenshot({ path: 'fans-admin-390.png' });

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
