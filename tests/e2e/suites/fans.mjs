// Fans, step 1: following an organizer by email (no Follow button on links
// yet). Asking sends a single-use link through Resend (the mock keeps it);
// opening it only shows the page, the button confirms; the browser gets a
// signed cookie; links expire, work once and are rate-limited; unfollow and
// forget; the tables stay closed to anyone without the secret key.
import { chromium, settle } from '../browser.mjs';
const B = 'http://localhost:3002';
const DB = 'http://localhost:54321';
const MAIL = 'http://localhost:54700';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

const start = (body, headers = {}) => fetch(B + '/api/fans/start', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const emails = async () => (await fetch(MAIL + '/__emails')).json();
const state = async () => (await fetch(DB + '/__state')).json();
const linkIn = (mail) => mail.text.match(/https?:\/\/\S+\/fans\/confirm\?token=[A-Za-z0-9_-]{43}/)?.[0];

// Asking: one email, from the organizer via Showlnk, with the link and the postal address.
let r = await start({ email: ' Fan@Example.com ', organizer: 'biglove', sourceTag: 'Instagram', funnelId: 'masquerade-v1' }, { 'x-forwarded-for': '203.0.113.7' });
check('asking to follow answers ok', r.status === 200, String(r.status));
let mail = (await emails())[0];
check('one email, to the address given', (await emails()).length === 1 && mail?.to?.[0] === 'fan@example.com', JSON.stringify(mail?.to));
check('sent as the organizer via Showlnk', mail?.from === 'Big Love Productions via Showlnk <fans@showlnk.com>', mail?.from);
check('subject names the organizer', mail?.subject === 'Confirm you want to follow Big Love Productions', mail?.subject);
const link = linkIn(mail ?? { text: '' });
check('the email carries a confirm link', Boolean(link));
check('the HTML button has the same link', Boolean(link) && mail.html.includes(link));
check('the footer has the postal address', mail?.text.includes('1 Test Street, Detroit, MI 48201') && mail.html.includes('1 Test Street'));
let s = await state();
check('nothing followed before confirming', s.fans.length === 0 && s.follows.length === 0);
check('only the hash of the link is stored', s.fanTokens.length === 1 && /^[0-9a-f]{64}$/.test(s.fanTokens[0].token_hash) && !link.includes(s.fanTokens[0].token_hash));
check('the IP is stored only as a keyed hash', /^[0-9a-f]{64}$/.test(s.fanTokens[0].ip_hash ?? '') && !JSON.stringify(s.fanTokens).includes('203.0.113.7'));

// Bad asks.
check('a bad email is refused', (await start({ email: 'not-an-email', organizer: 'biglove' })).status === 400);
check('an unknown organizer is refused', (await start({ email: 'a@b.co', organizer: 'nobody-here' })).status === 404);
check('nothing sent for bad asks', (await emails()).length === 1);

// Opening the link shows what it's for and uses nothing up (mail scanners open links).
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(link); await settle(p, 1000);
check('the link opens a confirm page', (await p.getByRole('heading', { level: 1 }).textContent()).replace(/\s+/g, ' ') === 'Follow Big Love Productions?');
check('the page shows the words being agreed to', await p.getByText(/email me about upcoming nights, presales and fans-only reels through Showlnk/).isVisible());
s = await state();
check('opening the link follows no one', s.follows.length === 0 && s.fanTokens[0].used_at === null);
check('no cookie before confirming', !(await ctx.cookies()).some((c) => c.name === 'showlnk_fan'));

// Confirming.
await p.getByRole('button', { name: 'Confirm and follow' }).click();
await p.waitForURL(/following=biglove/); await settle(p, 1000);
await p.screenshot({ path: 'fans-confirmed-phone.png' });
check("confirmed: you're following", (await p.getByRole('heading', { level: 1 }).textContent()).replace(/\s+/g, ' ') === "You're following Big Love Productions");
check("a link to the organizer's nights", await p.getByRole('link', { name: 'See upcoming nights' }).getAttribute('href') === '/f/biglove');
s = await state();
check('one fan, lowercased email', s.fans.length === 1 && s.fans[0].email === 'fan@example.com');
const f = s.follows[0];
check('the follow keeps where it came from', f?.organizer_slug === 'biglove' && f.source_tag === 'instagram' && f.funnel_id === 'masquerade-v1', JSON.stringify(f));
check('the follow keeps the words agreed to', /^I'd like Big Love Productions to email me/.test(f?.consent_text ?? ''));
const cookie = (await ctx.cookies()).find((c) => c.name === 'showlnk_fan');
check('a signed, httpOnly cookie for about 180 days', cookie?.httpOnly && cookie.sameSite === 'Lax' && cookie.expires * 1000 - Date.now() > 179 * 864e5 && cookie.value.startsWith(s.fans[0].id + '.'), JSON.stringify(cookie));
check('the browser knows who it follows', JSON.stringify(await (await ctx.request.get(B + '/api/fans/me')).json()) === '{"following":["biglove"]}');

// A link works once.
await p.goto(link); await settle(p, 1000);
check('a used link, for a follower, says already following', (await p.getByRole('heading', { level: 1 }).textContent()).includes("You're already following Big Love Productions"));
const other = await b.newPage();
await other.goto(link); await settle(other, 1000);
check('a used link elsewhere says already used', (await other.getByRole('heading', { level: 1 }).textContent()) === 'This link was already used');
const replay = await other.request.post(B + '/api/fans/confirm', { form: { token: new URL(link).searchParams.get('token') }, maxRedirects: 0 });
check('posting a used link signs no one in', replay.status() === 303 && !(replay.headers()['set-cookie'] ?? '').includes('showlnk_fan='));
check('a made-up link says it doesn\'t work', await (async () => { await other.goto(B + '/fans/confirm?token=' + 'x'.repeat(43)); return (await other.getByRole('heading', { level: 1 }).textContent()) === "This link doesn't work"; })());

// A forged or tampered cookie isn't anyone.
const forged = await b.newContext();
await forged.addCookies([{ name: 'showlnk_fan', value: `${s.fans[0].id}.9999999999.${'A'.repeat(43)}`, url: B }]);
check('a forged cookie follows no one', JSON.stringify(await (await forged.request.get(B + '/api/fans/me')).json()) === '{"following":[]}');

// Links expire.
await start({ email: 'late@example.com', organizer: 'biglove' });
const late = linkIn((await emails()).at(-1));
await fetch(DB + '/__fan-expire', { method: 'POST' });
await other.goto(late); await settle(other, 1000);
check('an expired link says so', (await other.getByRole('heading', { level: 1 }).textContent()) === 'This link has expired');
check('an expired link offers the way back', await other.getByRole('link', { name: 'Go to Big Love Productions' }).getAttribute('href') === '/f/biglove');

// Rate limits: 3 links an hour per email.
await fetch(DB + '/__reset', { method: 'POST' });
const codes = [];
for (let i = 0; i < 4; i++) codes.push((await start({ email: 'again@example.com', organizer: 'biglove' })).status);
check('a 4th link in an hour is refused', codes.join() === '200,200,200,429', codes.join());

// The email service failing is an error, not a silent "sent".
await fetch(MAIL + '/__fail', { method: 'POST' });
check('a failed send says so', (await start({ email: 'mailfail@example.com', organizer: 'biglove' })).status === 502);

// Unfollow and forget, from the confirmed browser (state was reset: follow again).
await start({ email: 'fan@example.com', organizer: 'biglove' });
await p.goto(linkIn((await emails()).at(-1))); await settle(p, 800);
await p.getByRole('button', { name: 'Confirm and follow' }).click(); await p.waitForURL(/following=biglove/); await settle(p, 800);
await p.getByRole('button', { name: 'Unfollow Big Love Productions' }).click();
await p.getByRole('heading', { name: /not following Big Love Productions/i }).waitFor({ timeout: 5000 }).catch(() => {});
check('unfollow from the page, which then says so', (await p.getByRole('heading', { level: 1 }).textContent()) === "You're not following Big Love Productions");
check('and offers the way back', await p.getByRole('link', { name: 'Go to Big Love Productions' }).getAttribute('href') === '/f/biglove');
s = await state();
check('unfollowing keeps the row, marked', s.follows.length === 1 && s.follows[0].unfollowed_at !== null);
check('the browser follows no one now', JSON.stringify(await (await ctx.request.get(B + '/api/fans/me')).json()) === '{"following":[]}');
const crossSite = await ctx.request.post(B + '/api/fans/forget', { headers: { Origin: 'https://evil.example' } });
check('another site can\'t make you forget', crossSite.status() === 403);
const gone = await ctx.request.post(B + '/api/fans/forget', { headers: { Origin: B } });
s = await state();
check('forget deletes the fan and their follows', gone.status() === 200 && s.fans.length === 0 && s.follows.length === 0 && !s.fanTokens.some((t) => t.email === 'fan@example.com'));
check('forget signs the browser out', !(await ctx.cookies()).some((c) => c.name === 'showlnk_fan' && c.value));

// Closed to everyone but the server: the publishable key and an admin's sign-in can't call the functions.
const asVisitor = await fetch(DB + '/rest/v1/rpc/fan_following', { method: 'POST', headers: { apikey: 'test', 'Content-Type': 'application/json' }, body: JSON.stringify({ p_fan_id: '00000000-0000-0000-0000-000000000000' }) });
check('visitors can\'t call the fan functions', asVisitor.status === 401);

check('no page errors', errs.length === 0, errs.join(' | '));
console.log(res.join('\n'));
await b.close();
