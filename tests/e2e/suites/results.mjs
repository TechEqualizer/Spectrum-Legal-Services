// Real results: an organizer's event shows what visitors actually did (from
// funnel_stats), the demos keep their sample data, and nobody sees numbers
// that aren't theirs.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];
const admin = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1280, height: 900 }, timezoneId: 'America/Detroit' });
await admin.addInitScript(() => { if (!localStorage.getItem('admin_business')) localStorage.setItem('admin_business', 'masquerade'); });
const p = await admin.newPage(); p.on('pageerror', (e) => errs.push(e.message));

// 1. Nothing yet: an honest empty state, not sample numbers.
await p.goto(B + '/admin/overview'); await settle(p, 1500);
let text = await p.locator('main').innerText();
check('no views yet says so', text.includes('No views in this period yet'), text.slice(0, 200));
check('banner: only leads are sample', (await p.locator('body').innerText()).includes('Leads are sample data.'));
check('event wording: ticket clicks', text.includes('Ticket clicks') && !text.includes('Bookings from reels'));
check('never NaN', !/NaN/.test(text));

// 2. Two visitors: one from Instagram watches and taps Tickets; one from TikTok just looks.
for (const [src, buy] of [['instagram', true], ['tiktok', false]]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Detroit' });
  const v = await ctx.newPage(); v.on('pageerror', (e) => errs.push(e.message));
  await v.goto(`${B}/f/masquerade?src=${src}`); await settle(v, 1500);
  if (buy) {
    const [popup] = await Promise.all([ctx.waitForEvent('page').catch(() => null), v.getByRole('link', { name: /tickets/i }).first().click()]);
    await popup?.close().catch(() => {});
    await settle(v, 800);
  }
  await v.getByRole('button', { name: /^(Sneak peek|Watch)/ }).first().click(); await settle(v, 1500);
  await ctx.close();
}

// 3. The admin sees exactly that.
await p.goto(B + '/admin/overview'); await settle(p, 1500);
text = await p.locator('main').innerText();
check('views counted', /Reel views\s*2/.test(text) || /\n2\nReel views/.test(text) || text.includes('2\nReel views'), text.slice(0, 300));
check('ticket click counted', /1\s*\n?\s*Ticket clicks/.test(text) || /Ticket clicks\s*1/.test(text), text.slice(0, 300));
check('still never NaN', !/NaN/.test(text));
await p.screenshot({ path: S + '/results-real-1280.jpg', fullPage: true });

await p.goto(B + '/admin/links'); await settle(p, 1500);
const table = p.getByRole('table');
const instagram = table.getByRole('row', { name: /Instagram/ });
check('Share: Instagram brought 1 visitor and 1 ticket click', /Instagram[\s\S]*\b1\b[\s\S]*\b1\b[\s\S]*100\.0/.test(await instagram.innerText()), await instagram.innerText());
const tiktok = table.getByRole('row', { name: /TikTok/ });
check('Share: TikTok brought 1 visitor, no clicks', /TikTok[\s\S]*\b1\b[\s\S]*\b0\b/.test(await tiktok.innerText()), await tiktok.innerText());
check('Share: not labeled sample', !(await p.locator('main').innerText()).includes('Sample data.'));

await p.goto(B + '/admin'); await settle(p, 1500);
check('studio rows show real views', (await p.locator('section[aria-labelledby="order-title"]').innerText()).includes('Results: last 30 days.'));

// 4. A demo keeps its sample data.
await p.evaluate(() => localStorage.setItem('admin_business', 'jlf'));
await p.goto(B + '/admin/links'); await settle(p, 1200);
check('demo stays sample', (await p.locator('main').innerText()).includes('Sample data.') && (await p.locator('body').innerText()).includes('Results and leads are sample data.'));

// 5. Nobody else's numbers.
const demoStats = await p.request.get(B + '/api/admin/stats?slug=jlf&days=30&tz=America/Detroit');
check('no real stats for a demo', demoStats.status() === 404, String(demoStats.status()));
const anon = await (await b.newContext()).request.get(B + '/api/admin/stats?slug=masquerade&days=30&tz=UTC');
check('signed out: refused', anon.status() === 401, String(anon.status()));
const odd = await p.request.get(B + '/api/admin/stats?slug=masquerade&days=12&tz=UTC');
check('only 7, 30 or 90 days', odd.status() === 400, String(odd.status()));

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
