// The admin's look (docs/plans/11-admin-themes.md): light, dark, or the
// device's own setting, chosen in Settings and kept in a cookie so the page
// arrives in it. The bars stay dark in both; every word on every page reads
// (WCAG AA contrast) in the dark look.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

// How light a color is, 0 to 1 (WCAG relative luminance), from any CSS color.
const luminanceOf = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = getComputedStyle(el).backgroundColor; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}, sel);

// Every visible word on the page against what's behind it; the ones under AA (4.5:1, or 3:1 when large).
const lowContrast = (page) => page.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (css) => { c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = css; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  // What's behind an element: its own and its ancestors' backgrounds, composited; null over a picture or video.
  const behind = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage !== 'none' || ['IMG', 'VIDEO', 'CANVAS', 'IFRAME'].includes(n.tagName)) return null;
      const bg = rgba(s.backgroundColor);
      if (bg[3] > 0) { layers.push(bg); if (bg[3] >= 1) break; }
    }
    return layers.reduceRight((acc, l) => over(l, acc), rgba(getComputedStyle(document.documentElement).backgroundColor === 'rgba(0, 0, 0, 0)' ? '#fff' : getComputedStyle(document.documentElement).backgroundColor));
  };
  const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!t.textContent.trim() || !el || seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width < 2 || r.height < 2 || s.visibility === 'hidden' || el.closest('[aria-hidden="true"], [hidden], [inert], :disabled, [aria-disabled="true"], option, select, .sr-only, svg')) continue;
    let o = 1; for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    if (o < 0.95) continue;
    const bg = behind(el); if (!bg) continue;
    const fg = over(rgba(s.color), bg);
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(s.fontSize), weight = Number(s.fontWeight);
    const need = size >= 24 || (size >= 18.6 && weight >= 700) ? 3 : 4.5;
    if (ratio < need) bad.push(`${t.textContent.trim().slice(0, 30)} ${ratio.toFixed(2)}`);
  }
  return bad;
});

const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light' });
await ctx.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin/home'); await settle(p, 1200);
check('a light device: the light look', (await luminanceOf(p, '.admin-theme')) > 0.8);
await p.emulateMedia({ colorScheme: 'dark' }); await settle(p, 300);
check('a dark device: the dark look, at once', (await luminanceOf(p, '.admin-theme')) < 0.02);
check('the tab pill stays dark', (await luminanceOf(p, 'nav ul')) < 0.05);
check('the top bar stays dark', (await luminanceOf(p, 'nav')) < 0.05);
await p.screenshot({ path: 'theme-dark-home-390.png' });

// Settings: chosen here, kept on this device.
await p.goto(B + '/admin/settings'); await settle(p, 1200);
const looks = p.getByRole('radiogroup', { name: 'Appearance' });
check('Settings offers Match device, Light, Dark; Match device chosen', JSON.stringify(await looks.getByRole('radio').allInnerTexts()) === '["Match device","Light","Dark"]' && (await looks.getByRole('radio', { checked: true }).innerText()) === 'Match device', JSON.stringify(await looks.getByRole('radio').allInnerTexts()));
await looks.getByRole('radio', { name: 'Light' }).tap(); await settle(p, 300);
check('Light on a dark device: light at once', (await luminanceOf(p, '.admin-theme')) > 0.8);
await p.reload(); await settle(p, 1200);
check('and after a reload', (await luminanceOf(p, '.admin-theme')) > 0.8 && (await looks.getByRole('radio', { checked: true }).innerText()) === 'Light');
await p.emulateMedia({ colorScheme: 'light' });
await looks.getByRole('radio', { name: 'Dark' }).tap(); await settle(p, 300);
check('Dark on a light device: dark at once', (await luminanceOf(p, '.admin-theme')) < 0.02);
const html = await (await p.request.get(B + '/admin/home')).text();
check('the page arrives dark from the server (no flash)', /class="admin-theme[^"]*"[^>]*data-theme="dark"/.test(html));
await p.screenshot({ path: 'theme-dark-settings-390.png', fullPage: true });

// Every page, phone and computer: every word reads in the dark look.
// With the sheets the + opens: a new reel's editor, a new night.
const pages = ['/admin/home', '/admin', '/admin/leads', '/admin/leads/fans', '/admin/overview', '/admin/links', '/admin/events', '/admin/settings', '/admin?add=1', '/admin/events?new=1'];
for (const [w, h, mobile] of [[390, 844, true], [1440, 900, false]]) {
  const c2 = await b.newContext({ storageState: S + '/auth.json', viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, colorScheme: 'dark' });
  await c2.addInitScript(() => localStorage.setItem('admin_business', 'masquerade'));
  const q = await c2.newPage(); q.on('pageerror', (e) => errs.push(e.message));
  for (const path of pages) {
    await q.goto(B + path); await settle(q, 1500);
    const bad = await lowContrast(q);
    check(`${w}px ${path}: every word reads in dark`, bad.length === 0, bad.slice(0, 6).join(' | '));
    await q.screenshot({ path: `theme-dark-${w}${path.replace(/[/?=]/g, '_')}.png`, fullPage: w === 390 });
  }
  // The + menu, opened over the page.
  await q.goto(B + '/admin/home'); await settle(q, 1200);
  await q.getByRole(mobile ? 'button' : 'button', { name: 'Create' }).first().click(); await settle(q, 400);
  const menuBad = await lowContrast(q);
  check(`${w}px the + menu: every word reads in dark`, menuBad.length === 0, menuBad.slice(0, 6).join(' | '));
  await q.screenshot({ path: `theme-dark-${w}-plus.png` });
  await c2.close();
}

// Back to Match device: the cookie goes, the device decides again.
await p.goto(B + '/admin/settings'); await settle(p, 1200);
await looks.getByRole('radio', { name: 'Match device' }).tap(); await settle(p, 300);
check('Match device on a light device: light', (await luminanceOf(p, '.admin-theme')) > 0.8 && !(await ctx.cookies()).some((x) => x.name === 'admin_theme'));
await ctx.close();

check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
