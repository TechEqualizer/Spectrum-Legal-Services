// Eventbrite: an organizer connects their account once, orders already
// placed are imported, new orders and refunds arrive by webhook, and Results
// shows tickets SOLD per place the link was shared. Forged webhooks change
// nothing, the token never leaves the server, other businesses can't see or
// touch the connection, and disconnecting keeps the sales history.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const EB = 'http://localhost:54600'; const SB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];
const EVENT = '1998119183265'; // Big Love's Masquerade, from its ticket link
const daysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
const attendees = (aff, n, extra = {}) => Array.from({ length: n }, () => ({ affiliate: aff, status: 'Attending', cancelled: false, refunded: false, ...extra }));
const ebState = async () => (await fetch(`${EB}/__state`)).json();
const sbState = async () => (await fetch(`${SB}/__state`)).json();
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every /api/ answer the admin's browser gets, to check none carries the token.
const apiBodies = [];
const watch = (page) => page.on('response', async (r) => {
  if (r.url().includes('/api/')) apiBodies.push(await r.text().catch(() => ''));
});

// Orders already placed before connecting: TikTok (2 tickets), one without our code, Direct, an unfinished checkout.
await post(`${EB}/__orders`, [
  { id: '5001', event_id: EVENT, created: daysAgo(3), costs: { gross: { value: 9000, currency: 'USD' } }, attendees: attendees('reels_tiktok', 2) },
  { id: '5002', event_id: EVENT, created: daysAgo(3), costs: { gross: { value: 4500, currency: 'USD' } }, attendees: attendees('ebdiscovery', 1) },
  { id: '5003', event_id: EVENT, created: daysAgo(2), costs: { gross: { value: 4500, currency: 'USD' } }, attendees: attendees('reels_direct', 1) },
  { id: '5005', event_id: EVENT, created: daysAgo(1), status: 'started', attendees: attendees('reels_tiktok', 4) },
  { id: '5004', event_id: '1111111111111', created: daysAgo(1), attendees: attendees('reels_tiktok', 5) },
]);

// The organizer: runs Big Love Productions only.
const org = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Detroit' });
await org.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
const p = await org.newPage(); p.on('pageerror', (e) => errs.push(e.message)); watch(p);
const status = async (ctx = org) => ctx.request.get(B + '/api/admin/eventbrite?organizer=biglove');
const stats = async () => (await org.request.get(B + '/api/admin/stats?slug=masquerade&days=30&tz=America/Detroit')).json();
const soldOn = (s, tag) => (s.sales ?? []).filter((x) => x.tag === tag).reduce((n, x) => n + x.n, 0);

// 1. Not connected yet: Connect offered; Results keeps to clicks, with a quiet link to connect.
let st = await (await status()).json();
check('status: configured, not connected', st.configured === true && st.connected === false, JSON.stringify(st));
await p.goto(B + '/admin/settings'); await settle(p, 1500);
const section = p.getByRole('region', { name: 'Eventbrite' });
let text = await section.innerText();
check('settings: Connect Eventbrite offered', await section.getByRole('link', { name: 'Connect Eventbrite' }).isVisible() && /never see your password/.test(text), text);
const connectBox = await section.getByRole('link', { name: 'Connect Eventbrite' }).boundingBox();
check('connect button is a 44px target', connectBox && connectBox.height >= 44, JSON.stringify(connectBox));
await p.goto(B + '/admin/overview'); await settle(p, 1500);
text = await p.locator('main').innerText();
check('results: no Tickets sold before connecting', !text.includes('Tickets sold\n'), text.slice(0, 300));
check('results: link to connect', await p.getByRole('link', { name: 'Connect Eventbrite to see tickets sold' }).isVisible());

// 2. Someone else's business: can't see or connect Big Love's Eventbrite.
const rival = await b.newContext();
await rival.request.post(B + '/api/admin/login', { data: { email: 'rival@example.com', password: 'rival-pass-1' } });
check('other admin: status hidden', (await status(rival)).status() === 404);
const rivalConnect = await rival.request.get(B + '/api/admin/eventbrite/connect?organizer=biglove', { maxRedirects: 0 });
check('other admin: connect refused', rivalConnect.status() === 303 && /eventbrite=error&reason=access/.test(rivalConnect.headers().location ?? ''), rivalConnect.headers().location);
const anon = await b.newContext();
check('signed out: status refused', (await anon.request.get(B + '/api/admin/eventbrite?organizer=biglove')).status() === 401);

// 3. A forged return (state not this browser's) is refused before anything happens.
const started = await org.request.get(B + '/api/admin/eventbrite/connect?organizer=biglove', { maxRedirects: 0 });
check('connect: sends to Eventbrite sign-in', started.status() === 303 && (started.headers().location ?? '').startsWith(`${EB}/oauth/authorize?response_type=code&client_id=test-eb-client`), started.headers().location);
const stateCookie = (await org.cookies()).find((c) => c.name === 'eb_oauth');
check('state cookie: httpOnly, Lax', Boolean(stateCookie?.httpOnly) && stateCookie?.sameSite === 'Lax', JSON.stringify(stateCookie));
const forged = await org.request.get(B + '/api/admin/eventbrite/callback?code=code-1&state=not-the-state', { maxRedirects: 0 });
check('callback: state mismatch refused', /eventbrite=error&reason=state/.test(forged.headers().location ?? ''), forged.headers().location);
check('callback: nothing stored after a mismatch', (await sbState()).eventbriteConnections.length === 0 && (await ebState()).webhooks.length === 0);

// 4. Connect, for real: Eventbrite's sign-in, back to Settings, orders imported.
await p.goto(B + '/admin/settings'); await settle(p, 1200);
await section.getByRole('link', { name: 'Connect Eventbrite' }).click();
await p.waitForURL(/\/admin\/settings\?eventbrite=connected/, { timeout: 30000 }); await settle(p, 1500);
text = await section.innerText();
check('connected: banner', text.includes('Eventbrite connected.'), text);
check('connected: organization named (the one that owns the event)', text.includes('Connected to Big Love Productions'), text);
check('backfill: 4 tickets synced (unfinished checkouts and other events left out)', /4 tickets synced/.test(text), text);
check('connected: last sale shown', /last sale /.test(text), text);
let eb = await ebState();
let sb = await sbState();
const token = eb.tokens[0];
check('webhook made for our endpoint', eb.webhooks.length === 1 && eb.webhooks[0].endpoint_url === `${B}/api/eventbrite/webhook` && eb.webhooks[0].org === '2001' && /order\.placed/.test(eb.webhooks[0].actions), JSON.stringify(eb.webhooks));
check('redirect_uri is our callback', eb.lastToken?.redirect_uri === `${B}/api/admin/eventbrite/callback`, JSON.stringify(eb.lastToken));
const conn = sb.eventbriteConnections[0];
check('token stored encrypted', Boolean(token) && conn && !conn.token_ciphertext.includes(token) && !JSON.stringify(conn).includes(token) && conn.connected_by === 'organizer@example.com', JSON.stringify(conn).slice(0, 200));
check('backfill: orders recorded with their source', sb.ticketSales.length === 3 && sb.ticketSales.find((s) => s.eventbrite_order_id === '5001')?.source_tag === 'tiktok' && sb.ticketSales.find((s) => s.eventbrite_order_id === '5002')?.source_tag === null && sb.ticketSales.find((s) => s.eventbrite_order_id === '5001')?.funnel_id === 'masquerade-v1' && sb.ticketSales.find((s) => s.eventbrite_order_id === '5001')?.event_id === 'mr-2026', JSON.stringify(sb.ticketSales).slice(0, 400));
check('test ping answered 200, nothing recorded', (await ebState()).deliveries.some((d) => d.status === 200) && (await sbState()).ticketSales.length === 3);
await p.screenshot({ path: S + '/eventbrite-settings-1440.jpg', fullPage: true });

// 5. Results: tickets sold next to clicks, by source.
let s = await stats();
check('stats: sold this period', s.sold?.current === 4 && s.eventbrite === true, JSON.stringify(s.sold));
check('stats: by source (TikTok 2, Direct 1, other 1)', soldOn(s, 'tiktok') === 2 && soldOn(s, 'direct') === 1 && soldOn(s, null) === 1, JSON.stringify(s.sales));

// 6. A new order arrives by webhook: 3 tickets from Instagram.
await post(`${EB}/__orders`, [{ id: '5010', event_id: EVENT, created: daysAgo(0), costs: { gross: { value: 13500, currency: 'USD' } }, attendees: attendees('reels_instagram', 3) }]);
const fired = await (await post(`${EB}/__fire`, { order_id: '5010', action: 'order.placed' })).json();
check('webhook answered 200', fired.statuses.length === 1 && fired.statuses[0] === 200, JSON.stringify(fired));
for (let i = 0; i < 40 && soldOn(s, 'instagram') !== 3; i++) { await sleep(150); s = await stats(); }
check('webhook: Instagram sold 3', soldOn(s, 'instagram') === 3 && s.sold.current === 7, JSON.stringify(s.sales));

await p.goto(B + '/admin/overview'); await settle(p, 1500);
text = await p.locator('main').innerText();
check('results: Tickets sold tile', /Tickets sold\s*7/.test(text), text.slice(0, 400));
check('results: no connect link once connected', await p.getByRole('link', { name: 'Connect Eventbrite to see tickets sold' }).count() === 0);
check('results: never NaN', !/NaN/.test(text));
await p.screenshot({ path: S + '/eventbrite-results-1440.jpg', fullPage: true });

await p.goto(B + '/admin/links'); await settle(p, 1500);
const table = p.getByRole('table');
const head = await table.locator('thead').innerText();
check('share: Tickets sold column next to Ticket clicks', /Ticket clicks\s*Tickets sold/i.test(head), head);
const soldCell = async (name) => (await table.getByRole('row', { name }).locator('td').nth(3).innerText()).trim();
check('share: Instagram sold 3', await soldCell(/Instagram/) === '3', await table.innerText());
check('share: TikTok sold 2', await soldCell(/TikTok/) === '2');
check('share: Direct sold 1', await soldCell(/^Direct/) === '1');
check('share: Eventbrite (other) row', (await soldCell(/Eventbrite \(other\)/)) === '1');
check('share: total sold 7', /All sources[\s\S]*\b7\b/.test(await table.locator('tfoot').innerText()), await table.locator('tfoot').innerText());
await p.screenshot({ path: S + '/eventbrite-share-1440.jpg', fullPage: true });

await p.goto(B + '/admin/home'); await settle(p, 1500);
text = await p.locator('main').innerText();
check('home: Tickets sold tile', /Tickets sold\s*7/.test(text), text.slice(0, 400));
check('home: sources show sold', /Instagram bio[\s\S]{0,60}3 sold/.test(text), text.slice(0, 800));

// 7. A refund lowers it: one of the three Instagram tickets refunded.
await post(`${EB}/__orders`, [{ id: '5010', event_id: EVENT, created: daysAgo(0), attendees: [...attendees('reels_instagram', 2), ...attendees('reels_instagram', 1, { refunded: true, status: 'Not Attending' })] }]);
await post(`${EB}/__fire`, { order_id: '5010', action: 'order.refunded' });
for (let i = 0; i < 40 && soldOn(s, 'instagram') !== 2; i++) { await sleep(150); s = await stats(); }
check('refund: Instagram down to 2', soldOn(s, 'instagram') === 2 && s.sold.current === 6, JSON.stringify(s.sales));
// The whole order refunded: it no longer counts.
await post(`${EB}/__orders`, [{ id: '5003', event_id: EVENT, created: daysAgo(2), status: 'refunded', attendees: attendees('reels_direct', 1, { refunded: true }) }]);
await post(`${EB}/__fire`, { order_id: '5003', action: 'order.refunded' });
for (let i = 0; i < 40 && soldOn(s, 'direct') !== 0; i++) { await sleep(150); s = await stats(); }
check('full refund: Direct no longer counted', soldOn(s, 'direct') === 0 && s.sold.current === 5, JSON.stringify(s.sales));

// 8. Forged deliveries change nothing.
await post(`${EB}/__orders`, [{ id: '5011', event_id: EVENT, created: daysAgo(0), attendees: attendees('reels_instagram', 10) }]);
const hookId = (await ebState()).webhooks[0].id;
const endpoint = `${B}/api/eventbrite/webhook`;
const forgedHost = await (await post(`${EB}/__fire`, { endpoint, body: { api_url: 'https://evil.example/v3/orders/5011/', config: { action: 'order.placed', webhook_id: hookId } } })).json();
const forgedPath = await (await post(`${EB}/__fire`, { endpoint, body: { api_url: `${EB}/v3/orders/5011/../../users/me/`, config: { action: 'order.placed', webhook_id: hookId } } })).json();
const unknownHook = await (await post(`${EB}/__fire`, { endpoint, body: { api_url: `${EB}/v3/orders/5011/`, config: { action: 'order.placed', webhook_id: '424242' } } })).json();
const junk = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json' });
check('forged deliveries still answered 200', [forgedHost, forgedPath, unknownHook].every((r) => r.statuses[0] === 200) && junk.status === 200);
await sleep(1500);
s = await stats();
check('forged: nothing recorded', !(await sbState()).ticketSales.some((x) => x.eventbrite_order_id === '5011') && s.sold.current === 5, JSON.stringify(s.sold));
check('webhook answer leaks nothing', (await junk.text()) === '{"ok":true}');

// 9. The new tables are closed to the publishable key (like RLS with no policies).
const direct = await fetch(`${SB}/rest/v1/eventbrite_connections?select=*`, { headers: { apikey: 'test', Authorization: 'Bearer test' } });
const directSales = await fetch(`${SB}/rest/v1/ticket_sales?select=*`, { headers: { apikey: 'test' } });
check('tables closed without the secret key', direct.status === 401 && directSales.status === 401);

// 10. Phone screenshots.
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Detroit', storageState: await org.storageState() });
const m = await phone.newPage(); m.on('pageerror', (e) => errs.push(e.message)); watch(m);
await m.goto(B + '/admin/settings#eventbrite'); await settle(m, 1500);
check('phone: settings no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.getByRole('region', { name: 'Eventbrite' }).screenshot({ path: S + '/eventbrite-settings-section-390.jpg' });
await m.screenshot({ path: S + '/eventbrite-settings-390.jpg', fullPage: true });
await m.goto(B + '/admin/overview'); await settle(m, 1500);
check('phone: results no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: S + '/eventbrite-results-390.jpg', fullPage: true });
await m.goto(B + '/admin/links'); await settle(m, 1500);
check('phone: share no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: S + '/eventbrite-share-390.jpg', fullPage: true });

// 11. Disconnect: the webhook and connection go; the sales history stays.
check('other admin: disconnect refused', (await rival.request.delete(B + '/api/admin/eventbrite?organizer=biglove')).status() === 404 && (await sbState()).eventbriteConnections.length === 1);
await p.goto(B + '/admin/settings'); await settle(p, 1500);
await section.getByRole('button', { name: 'Disconnect' }).click();
check('disconnect asks first', (await section.innerText()).includes('Disconnect? Sales so far stay.'));
await section.getByRole('button', { name: 'Disconnect' }).click(); await settle(p, 1500);
text = await section.innerText();
check('disconnected: says so, Connect offered again', text.includes('Eventbrite disconnected') && await section.getByRole('link', { name: 'Connect Eventbrite' }).isVisible(), text);
eb = await ebState(); sb = await sbState();
check('disconnected: webhook removed at Eventbrite', eb.webhooks.length === 0);
check('disconnected: connection gone, history kept', sb.eventbriteConnections.length === 0 && sb.ticketSales.length === 4);
s = await stats();
check('disconnected: results keep the sales', s.eventbrite === false && s.sold.current === 5);
// A delivery for the old webhook now does nothing.
await post(`${EB}/__orders`, [{ id: '5012', event_id: EVENT, created: daysAgo(0), attendees: attendees('reels_instagram', 1) }]);
await post(`${EB}/__fire`, { endpoint, body: { api_url: `${EB}/v3/orders/5012/`, config: { action: 'order.placed', webhook_id: hookId } } });
await sleep(1200);
check('old webhook ignored after disconnect', !(await sbState()).ticketSales.some((x) => x.eventbrite_order_id === '5012'));

// 12. Refused on Eventbrite's side: back to Settings with a plain message.
await fetch(`${EB}/__deny`, { method: 'POST' });
await section.getByRole('link', { name: 'Connect Eventbrite' }).click();
await p.waitForURL(/eventbrite=error/, { timeout: 30000 }); await settle(p, 1200);
check('denied: says how to try again', (await section.innerText()).includes("access wasn't allowed"), await section.innerText());

// 13. The token never appears in anything the app sent the browser.
for (const ctx of [org, rival]) for (const url of ['/api/admin/eventbrite?organizer=biglove', '/api/admin/stats?slug=masquerade&days=30&tz=UTC']) apiBodies.push(await (await ctx.request.get(B + url)).text());
check('token never in an API answer', apiBodies.length > 5 && !apiBodies.some((t) => t.includes(token) || t.includes('token_ciphertext') || t.includes(conn.token_ciphertext)), String(apiBodies.length));

// 14. Not configured: the same build without the Eventbrite settings (port 3003).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const env = { ...process.env, PORT: '3003' };
for (const k of ['EVENTBRITE_CLIENT_ID', 'EVENTBRITE_CLIENT_SECRET', 'EVENTBRITE_TOKEN_KEY']) delete env[k];
const bare = spawn('npx', ['next', 'start', '-p', '3003'], { cwd: root, env, stdio: 'ignore', detached: true });
try {
  for (let i = 0; i < 100 && !(await fetch('http://localhost:3003/api/admin/status').then(() => true, () => false)); i++) await sleep(300);
  const B2 = 'http://localhost:3003';
  const full = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await full.request.post(B2 + '/api/admin/login', { data: { email: 'tester@example.com', password: 'tester-pass-1' } });
  await full.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
  const fp = await full.newPage(); fp.on('pageerror', (e) => errs.push(e.message));
  await fp.goto(B2 + '/admin/settings'); await settle(fp, 1500);
  const fullText = await fp.getByRole('region', { name: 'Eventbrite' }).innerText();
  check('not configured: full admin sees the settings to add', fullText.includes("isn't turned on yet") && ['EVENTBRITE_CLIENT_ID', 'EVENTBRITE_CLIENT_SECRET', 'EVENTBRITE_TOKEN_KEY'].every((v) => fullText.includes(v)), fullText);
  await fp.getByRole('region', { name: 'Eventbrite' }).screenshot({ path: S + '/eventbrite-not-configured-1440.jpg' });
  const op = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await op.request.post(B2 + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
  await op.goto(B2 + '/admin/settings'); await settle(op, 1500);
  const orgText = await op.getByRole('region', { name: 'Eventbrite' }).innerText();
  check('not configured: organizer told plainly, no settings names', orgText.includes("Eventbrite connection isn't turned on yet") && !orgText.includes('EVENTBRITE_'), orgText);
  const connectBare = await full.request.get(B2 + '/api/admin/eventbrite/connect?organizer=biglove', { maxRedirects: 0 });
  check('not configured: connect explains', /reason=not-configured/.test(connectBare.headers().location ?? ''), connectBare.headers().location);
  check('not configured: webhook still answers 200', (await fetch(B2 + '/api/eventbrite/webhook', { method: 'POST', body: '{}' })).status === 200);
} finally {
  try { process.kill(-bare.pid); } catch {}
}

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
process.exit(0);
