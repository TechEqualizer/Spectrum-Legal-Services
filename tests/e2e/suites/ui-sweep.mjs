// The production UI floor, measured on every main screen at a phone
// (390×844) and a desktop (1440×900): nothing wider than the screen, text
// contrast at WCAG AA (4.5:1, or 3:1 for large text), text no smaller than
// 11px, touch targets of 44px on a phone (Apple's 44pt, Material's 48dp)
// and 24px with a mouse (WCAG 2.2's minimum), links inside a sentence
// excepted, a name on
// every control, alt on every image, and native menus (select options)
// readable on their white popup. Findings go to ui-sweep.json; each check
// names the screens that fail it.
import { writeFileSync } from 'node:fs';
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));

const SIGNED_OUT = ['/', '/start', '/admin/login', '/terms', '/privacy', '/f/masquerade', '/f/biglove'];
const SIGNED_IN = ['/admin/home', '/admin', '/admin/events', '/admin/leads', '/admin/overview', '/admin/links', '/admin/fans', '/admin/settings'];
const SIZES = [{ name: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { name: '1440', viewport: { width: 1440, height: 900 } }];

// Runs in the page: every measurable floor breach, as plain records.
const measure = (touch) => {
  const out = [];
  const add = (rule, el, detail) => {
    const name = (el.getAttribute?.('aria-label') || el.textContent || el.getAttribute?.('alt') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
    out.push({ rule, el: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`, name, detail });
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    for (let p = el; p; p = p.parentElement) { const ps = getComputedStyle(p); if (Number(ps.opacity) === 0 || ps.visibility === 'hidden') return false; }
    return true;
  };
  // Inside the live phone preview, a scaled picture of the visitor screen: not text to read at that size.
  const inPreview = (el) => Boolean(el.closest('[data-preview], iframe, [aria-hidden="true"], .sr-only'));
  // Parked off-screen until focused (the skip link): measured when it shows, not here.
  const offscreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom <= 0 || r.right <= 0 || r.left >= innerWidth; };
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // The color behind an element: the first opaque background up the tree; null when an image or video is behind it (not measurable).
  const backdrop = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null;
      if (/gradient/.test(s.backgroundImage)) return null;
      if (p.querySelector(':scope > video, :scope > img, :scope > canvas') && p !== el) return null;
      const c = rgba(s.backgroundColor);
      if (c && c.a >= 0.95) return c;
      if (c && c.a > 0.05) return null; // translucent layers over unknown content
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  // Overflow.
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push({ rule: 'overflow', el: 'html', name: '', detail: `${document.documentElement.scrollWidth} > ${innerWidth}` });

  // Text: contrast and size, per element that directly holds text.
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'OPTION', 'OPTGROUP'].includes(el.tagName.toUpperCase())) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own || !visible(el) || inPreview(el) || el.closest('.sr-only')) continue;
    const s = getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    if (size < 11) add('text-size', el, `${size}px`);
    const fg = rgba(s.color); const bg = backdrop(el);
    if (!fg || !bg || fg.a < 0.1) continue;
    // Blend a translucent text color over its background.
    const mix = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    const r = ratio(mix, bg);
    if (r < (large ? 3 : 4.5) && !el.closest('button:disabled, [aria-disabled="true"], fieldset:disabled')) add('contrast', el, `${r.toFixed(2)}:1 at ${size}px`);
  }

  // Controls: names and touch targets.
  for (const el of document.querySelectorAll('a[href], button, [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"], input:not([type="hidden"]), select, textarea, summary')) {
    if (!visible(el) || inPreview(el) || offscreen(el)) continue;
    const label = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent.trim() || el.getAttribute('title') || el.getAttribute('alt') || el.querySelector('img[alt]')?.getAttribute('alt')
      || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label') || el.getAttribute('placeholder');
    if (!label) add('name', el, 'no accessible name');
    const r = el.getBoundingClientRect();
    // Checkboxes and radios inside a label take the label's size.
    const box = (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) ? el.closest('label').getBoundingClientRect() : r;
    // A link inside a sentence is exempt (WCAG 2.5.8); its line sets its size.
    const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && /^(P|LI|SPAN|DD|TD|LABEL|SMALL)$/.test(el.parentElement?.tagName ?? '');
    const min = touch ? 44 : 24;
    if (!inline && (Math.round(box.height) < min || Math.round(box.width) < min)) add('target', el, `${Math.round(box.width)}×${Math.round(box.height)}`);
  }

  // Images.
  for (const img of document.querySelectorAll('img')) if (visible(img) && !img.hasAttribute('alt')) add('alt', img, img.getAttribute('src')?.slice(0, 60) ?? '');

  // Native menus: options (also inside groups) must read on the white popup.
  for (const sel of document.querySelectorAll('select')) {
    for (const o of sel.querySelectorAll('option, optgroup')) {
      const s = getComputedStyle(o); const fg = rgba(s.color); const bg = rgba(s.backgroundColor);
      const behind = bg && bg.a > 0.5 ? bg : { r: 255, g: 255, b: 255, a: 1 };
      if (fg && ratio(fg, behind) < 4.5) { add('menu', sel, `${o.tagName.toLowerCase()} "${(o.label || o.textContent).trim().slice(0, 30)}" ${ratio(fg, behind).toFixed(2)}:1`); break; }
    }
  }
  return out;
};

const b = await chromium.launch();
const errs = [];
const all = {};
for (const size of SIZES) {
  for (const [signedIn, routes] of [[false, SIGNED_OUT], [true, SIGNED_IN]]) {
    const ctx = await b.newContext({ ...size, ...(signedIn ? { storageState: S + '/auth.json' } : {}) });
    await ctx.addInitScript(() => { try { localStorage.setItem('admin_business', 'masquerade'); localStorage.setItem('admin_tour', 'done'); } catch {} });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    for (const route of routes) {
      await p.goto(B + route); await settle(p, 1500);
      const found = await p.evaluate(measure, Boolean(size.hasTouch));
      all[`${size.name} ${route}`] = found;
      await p.screenshot({ path: `sweep-${size.name}${route.replace(/\//g, '_') || '_home'}.png`, fullPage: true });
    }
    await ctx.close();
  }
  // The sheets and dialogs organizers work in, measured open.
  const ctx = await b.newContext({ ...size, storageState: S + '/auth.json' });
  await ctx.addInitScript(() => { try { localStorage.setItem('admin_business', 'masquerade'); localStorage.setItem('admin_tour', 'done'); } catch {} });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  const sheets = [
    ['reel editor', '/admin', async () => { const t = await p.locator('section[aria-labelledby="order-title"] ol > li').first().locator('p.font-bold').textContent(); await p.getByRole('button', { name: `Edit ${t}` }).click(); }],
    ['date sheet', '/admin', async () => { await p.locator('section[aria-labelledby="dates-title"]').locator(':scope > ul > li').first().getByRole('button').first().click(); }],
    ['new event', '/admin/events', async () => { await p.getByRole('button', { name: 'New event' }).first().click(); }],
  ];
  for (const [name, route, open] of sheets) {
    await p.goto(B + route); await settle(p, 1500);
    const ok = await open().then(() => true).catch(() => false);
    await settle(p, 600);
    all[`${size.name} ${name}`] = ok ? await p.evaluate(measure, Boolean(size.hasTouch)) : [{ rule: 'open', el: '', name, detail: "couldn't open" }];
    await p.screenshot({ path: `sweep-${size.name}-${name.replace(/ /g, '-')}.png` });
    await p.keyboard.press('Escape');
  }
  await ctx.close();
}
writeFileSync('ui-sweep.json', JSON.stringify(all, null, 1));

for (const rule of ['open', 'overflow', 'contrast', 'text-size', 'target', 'name', 'alt', 'menu']) {
  const where = Object.entries(all).flatMap(([page, f]) => f.filter((x) => x.rule === rule).map((x) => `${page}: ${x.el} "${x.name}" ${x.detail}`));
  check(`${rule}: none`, where.length === 0, where.slice(0, 12).join(' | ') + (where.length > 12 ? ` | …${where.length - 12} more` : ''));
}
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
