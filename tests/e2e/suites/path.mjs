import { chromium, pickEvent, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
process.on('uncaughtException', e => { console.log(res.join('\n')); console.log('ERR', e.message.split('\n').slice(0, 3).join(' ')); process.exit(1); });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [1280, 800]]) {
  const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json', viewport: { width: w, height: h } });
  await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/admin'); await settle(p, 500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 500);
  await pickEvent(p, 'masquerade'); await settle(p, 4000);
  const strip = p.getByRole('navigation', { name: 'Path through your link' });
  const phone = p.frameLocator('iframe[title="Live preview of your link"]');
  const stops = strip.getByRole('button', { name: /^(Opening|Reel \d+|End:)/ });
  const labels = await stops.evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
  const tag = `${w}:`;
  check(`${tag} strip: opening, reels, end`, /^Opening/.test(labels[0]) && /^End: Tickets/.test(labels.at(-1)) && labels.filter(l => /^Reel \d+/.test(l)).length >= 5, labels.length + ' stops');
  check(`${tag} starts on Opening`, (await strip.locator('[aria-current="step"]').getAttribute('aria-label')).startsWith('Opening'));
  check(`${tag} dates shown on the reels they open`, labels.some(l => /opens from Oct 31/.test(l)));
  check(`${tag} detours shown`, labels.some(l => /Skipped → \d+/.test(l) || /Watched → \d+/.test(l)), labels.filter(l => /→/.test(l)).join(' | '));
  check(`${tag} date-circle reels count as reached`, !labels.some(l => /not reached/.test(l)), labels.filter(l => /not reached/.test(l)).join(' | '));
  // Tap reel 3
  await stops.nth(3).click(); await settle(p, 1500);
  const r3 = labels[3];
  check(`${tag} tap stop: phone plays it`, await phone.getByRole('region', { name: /^Video:/ }).first().isVisible());
  check(`${tag} tapped stop is current`, (await strip.locator('[aria-current="step"]').getAttribute('aria-label')) === r3);
  // Advance inside the phone: strip follows
  await phone.locator('body').press('ArrowDown'); await settle(p, 1200);
  const cur = await strip.locator('[aria-current="step"]').getAttribute('aria-label');
  check(`${tag} strip follows the phone`, cur !== r3, cur);
  // End card
  await strip.getByRole('button', { name: /^End:/ }).click(); await settle(p, 1500);
  check(`${tag} end stop: end card on screen`, await phone.getByText('Masks on?').isVisible());
  check(`${tag} end is current`, (await strip.locator('[aria-current="step"]').getAttribute('aria-label')).startsWith('End'));
  // Restart -> opening current
  await p.getByRole('button', { name: 'Restart' }).click(); await settle(p, 1500);
  check(`${tag} restart: opening current`, (await strip.locator('[aria-current="step"]').getAttribute('aria-label')).startsWith('Opening'));
  // Tapping a date circle in the phone updates the strip
  await phone.getByRole('button', { name: /Masquerade on the Runway, .*Watch$/ }).click(); await settle(p, 1500);
  check(`${tag} date card in phone: strip moves to its reel`, /opens from Oct 31/.test(await strip.locator('[aria-current="step"]').getAttribute('aria-label')));
  // Phone still fits with the strip
  const box = await p.locator('iframe[title="Live preview of your link"]').boundingBox();
  const sb = await strip.boundingBox();
  check(`${tag} phone and strip both in view`, box.y >= 0 && sb.y + sb.height <= h + 1 && box.y + box.height <= sb.y + 4, `${Math.round(box.y + box.height)} / ${Math.round(sb.y)}-${Math.round(sb.y + sb.height)}`);
  check(`${tag} page never scrolls`, await p.evaluate(() => scrollY === 0), String(await p.evaluate(() => scrollY)));
  await p.screenshot({ path: `${S}/path-${w}.jpg` });
  check(`${tag} no errors`, !errs.length, errs.join(' | '));
  await ctx.close();
}
await b.close(); console.log(res.join('\n'));
