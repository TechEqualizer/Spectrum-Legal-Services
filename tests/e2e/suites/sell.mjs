import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// The sample's dates move with the calendar (src/data/events-sample.ts): its
// "this Sunday" is today until 9pm, then next Sunday. Visit on that Sunday
// morning, so the page always sells a date under 48 hours away.
const now = new Date();
const sunday = new Date(now);
sunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || (now.getHours() >= 21 ? 7 : 0)));
sunday.setHours(10, 0, 0, 0);
const day = sunday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); // "Sun, Oct 11"
const short = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Oct 11"
const b = await chromium.launch();
for (const [w, h] of [[390, 844], [360, 640], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500, deviceScaleFactor: 2 });
  await ctx.clock.setFixedTime(sunday);
  await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/f/events'); await settle(p, 3000);
  const tag = `${w}x${h}`;
  const tickets = p.locator('main a', { hasText: /^Tickets/ }).first();
  const tClass = await tickets.getAttribute('class');
  check(`${tag} tickets is the primary (shimmer) button`, /cine-shimmer/.test(tClass) && /order-1/.test(tClass));
  check(`${tag} tickets says the date`, (await tickets.innerText()).includes(`Tickets · ${day}`), await tickets.innerText());
  check(`${tag} watch is secondary`, (await p.locator('main button', { hasText: /^Watch$/ }).count()) === 1);
  const info = await p.locator('main p', { hasText: 'From $25' }).first().innerText().catch(() => '');
  check(`${tag} info line: date, time, price, 21+`, info.includes(`${day}, 3 PM · From $25 · 21+`), info);
  const labels = await p.locator('main ul > li button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
  check(`${tag} sold-out after buyable dates, before recap`, /Sold out/.test(labels[labels.length - 2]) && /Watch last time/.test(labels[labels.length - 1]) && !/Sold out/.test(labels[0]), labels.join(' | '));
  check(`${tag} no repeated date in labels`, labels.every(l => { const m = l.match(/(Sun, \w+ \d+)/g); return !m || m.length === 1; }), labels.join(' | '));
  check(`${tag} sold-out circle says Waitlist`, await p.locator('main ul > li').filter({ hasText: 'Sold out' }).getByText('Waitlist').isVisible());
  const small = await p.locator('main *').evaluateAll(els => els.filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11 && e.offsetParent).map(e => e.textContent.trim().slice(0, 30)));
  check(`${tag} no text under 11px`, small.length === 0, small.join(' | '));
  check(`${tag} fits one screen`, await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), String(await p.evaluate(() => document.documentElement.scrollHeight)));
  await p.screenshot({ path: `${S}/sell-${tag}.jpg` });
  if (w === 390) {
    // Sold-out date: waitlist first
    await p.locator('main ul > li').filter({ hasText: 'Sold out' }).getByRole('button').click(); await settle(p, 1200);
    check('sold-out reel: Waitlist is the main action', await p.getByRole('button', { name: 'Join the waitlist', exact: true }).first().isVisible());
    check('sold-out reel: no silent Tickets pill', await p.getByRole('link', { name: /^Get tickets$/ }).count() === 0);
    check('sold-out reel: other date named', await p.getByRole('link', { name: `Get ${short}` }).first().isVisible());
    await p.screenshot({ path: `${S}/sell-soldout-reel.jpg` });
    await p.getByRole('button', { name: 'Join the waitlist', exact: true }).first().click(); await settle(p, 500);
    check('waitlist sheet says so', await p.getByRole('heading', { name: 'Join the waitlist' }).isVisible() && await p.getByText(/sold out\. If tickets come back/).isVisible());
    await p.screenshot({ path: `${S}/sell-waitlist-sheet.jpg` });
  }
  check(`${tag} no errors`, !errs.length, errs.join(' | '));
  await ctx.close();
}
await b.close(); console.log(res.join('\n'));
