// Home: where the admin lands. The last 30 days across every event, the
// next night with its four things, top reels and where visitors came from.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

// Signing in lands on Home.
const fresh = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Detroit' });
const f = await fresh.newPage(); f.on('pageerror', (e) => errs.push(e.message));
await f.goto(B + '/admin/login');
await f.getByLabel('Email').fill('tester@example.com');
await f.getByLabel('Password', { exact: true }).fill('tester-pass-1');
await f.getByRole('button', { name: 'Sign in' }).click();
await f.waitForURL(/\/admin\/home$/, { timeout: 10000 }).catch(() => {});
check('sign-in lands on Home', f.url().endsWith('/admin/home'), f.url());
await fresh.close();

// Two visitors: one from Instagram taps Tickets, one from TikTok just watches.
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

const admin = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 }, timezoneId: 'America/Detroit' });
const p = await admin.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/home');
await p.getByRole('status').filter({ hasText: 'Loading your numbers' }).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
await settle(p, 1000);
const nav = p.getByRole('navigation', { name: 'Admin' });
const navLinks = await nav.locator('ul a').allTextContents();
check('Home first in the sidebar, and current', navLinks[0]?.includes('Home') && (await nav.getByRole('link', { name: 'Home' }).getAttribute('aria-current')) === 'page', navLinks.join(' | '));
check('welcome', /^Welcome back/.test(await p.getByRole('heading', { level: 1 }).textContent()));
const text = await p.locator('main').innerText();
check('views across events', /Reel views\s*2/.test(text), text.slice(0, 300));
check('ticket clicks across events', /Ticket clicks\s*1/.test(text), text.slice(0, 300));
check('never NaN', !/NaN/.test(text));

// Next up: the next night and its four things.
const next = p.getByRole('region', { name: /^Next up:/ });
check('next night shown', /Masquerade on the Runway/.test(await next.innerText()) && /(Tonight|Tomorrow|In \d+ days)/i.test(await next.innerText()));
check('next night: its picture shows', await next.evaluate((el) => [...el.querySelectorAll('img, video')].some((m) => m.getBoundingClientRect().width > 0)));
const steps = next.getByRole('listitem');
check('the four things, in order', JSON.stringify(await steps.evaluateAll((els) => els.map((e) => e.querySelector('.font-semibold').textContent))) === JSON.stringify(['Opening scene', 'The Night', 'Your People', 'Last Call']));
check('each says where it stands', (await next.getByRole('button', { name: /: (ready|needs video|missing)\. Open in Reels\.$/ }).count()) === 4);

// Sources and top reels.
const sources = p.getByRole('region', { name: 'Where visitors came from' });
const st = await sources.innerText();
check('sources: Instagram and TikTok', st.includes('Instagram bio') && st.includes('TikTok bio') && /Instagram bio\s*1 visitor · 1 ticket\b/.test(st), st);
const top = p.getByRole('region', { name: 'Top reels' });
check('top reels listed', await top.getByRole('button', { name: /views, .* to tickets\. Open in Reels\.$/ }).count() >= 1);
check('views by day chart', await p.getByRole('region', { name: 'Views by day' }).locator('svg').count() > 0);
await p.screenshot({ path: S + '/home-1440.jpg', fullPage: true });

// Open in Reels: the studio, on that event.
await next.getByRole('button', { name: 'Open in Reels', exact: true }).click(); await p.waitForURL(/\/admin$/); await settle(p, 800);
check('opens the event in the studio', (await p.locator('#admin-business').inputValue()) === 'masquerade');

// Phone: one column, nothing sideways.
const phone = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Detroit' });
const m = await phone.newPage(); m.on('pageerror', (e) => errs.push(e.message));
await m.goto(B + '/admin/home'); await settle(m, 1500);
check('phone: no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: S + '/home-390.jpg', fullPage: true });

// An organizer sees only their own events.
const org = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Detroit' });
await org.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
const o = await org.newPage(); o.on('pageerror', (e) => errs.push(e.message));
await o.goto(B + '/admin/home'); await settle(o, 1500);
const ot = await o.locator('main').innerText();
check('organizer: their events only', /Masquerade on the Runway/.test(ot) && !/Golden Hour|Aurelia/.test(ot), ot.slice(0, 200));

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
