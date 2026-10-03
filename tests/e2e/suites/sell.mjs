import { chromium } from 'playwright';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
for (const [w, h] of [[390, 844], [360, 640], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500, deviceScaleFactor: 2 });
  await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/f/events'); await p.waitForTimeout(3000);
  const tag = `${w}x${h}`;
  const tickets = p.locator('main a', { hasText: /^Tickets/ }).first();
  const tClass = await tickets.getAttribute('class');
  check(`${tag} tickets is the primary (shimmer) button`, /cine-shimmer/.test(tClass) && /order-1/.test(tClass));
  check(`${tag} tickets says the date`, /Tickets · Sun, Oct 4/.test(await tickets.innerText()), await tickets.innerText());
  check(`${tag} watch is secondary`, (await p.locator('main button', { hasText: /^Watch$/ }).count()) === 1);
  const info = await p.locator('main p', { hasText: 'From $25' }).first().innerText().catch(() => '');
  check(`${tag} info line: date, time, price, 21+`, /Sun, Oct 4, 3 PM · From \$25 · 21\+/.test(info), info);
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
    await p.locator('main ul > li').filter({ hasText: 'Sold out' }).getByRole('button').click(); await p.waitForTimeout(1200);
    check('sold-out reel: Waitlist is the main action', await p.getByRole('button', { name: 'Join the waitlist', exact: true }).first().isVisible());
    check('sold-out reel: no silent Tickets pill', await p.getByRole('link', { name: /^Get tickets$/ }).count() === 0);
    check('sold-out reel: other date named', await p.getByRole('link', { name: 'Get Oct 4' }).first().isVisible());
    await p.screenshot({ path: `${S}/sell-soldout-reel.jpg` });
    await p.getByRole('button', { name: 'Join the waitlist', exact: true }).first().click(); await p.waitForTimeout(500);
    check('waitlist sheet says so', await p.getByRole('heading', { name: 'Join the waitlist' }).isVisible() && await p.getByText(/sold out\. If tickets come back/).isVisible());
    await p.screenshot({ path: `${S}/sell-waitlist-sheet.jpg` });
  }
  check(`${tag} no errors`, !errs.length, errs.join(' | '));
  await ctx.close();
}
await b.close(); console.log(res.join('\n'));
