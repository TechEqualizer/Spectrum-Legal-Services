// The admin fits every screen: from a small phone to a big monitor, in
// portrait and landscape, scrolling never shows a gap below the page, nothing
// slides sideways, and on desktop the whole sidebar (the Core trial card
// included) stays reachable inside its own column, however short the window.
import { chromium, settle, testNow } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
// On a trial: the sidebar's tallest state (the Core card with its days left).
await fetch(DB + '/__plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: 'biglove', status: 'trialing', trial_ends_at: new Date(testNow() + 13 * 864e5).toISOString() }) });

// Browser viewports (the window less the browser's own bars).
const screens = [
  { name: 'phone 360x640', width: 360, height: 640, mobile: true },
  { name: 'phone 390x844', width: 390, height: 844, mobile: true },
  { name: 'phone landscape 844x390', width: 844, height: 390, mobile: true },
  { name: 'tablet 768x1024', width: 768, height: 1024, mobile: true },
  { name: 'tablet landscape 1024x768', width: 1024, height: 768, mobile: true },
  { name: 'laptop 1280x600', width: 1280, height: 600 },
  { name: 'laptop 1366x657', width: 1366, height: 657 },
  { name: 'laptop at 125% 1536x730', width: 1536, height: 730 },
  { name: 'desktop 1440x900', width: 1440, height: 900 },
  { name: 'desktop 1920x1080', width: 1920, height: 1080 },
];
const pages = ['/admin/home', '/admin/events', '/admin', '/admin/leads', '/admin/overview', '/admin/links', '/admin/settings'];

const b = await chromium.launch();
const errs = [];
for (const s of screens) {
  const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: s.width, height: s.height }, isMobile: Boolean(s.mobile), hasTouch: Boolean(s.mobile), timezoneId: 'America/Detroit' });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${s.name}: ${e.message}`));
  const gaps = []; const sideways = [];
  for (const path of pages) {
    await p.goto(B + path); await settle(p, 1500);
    // Scrolled to the very bottom, the admin's own background reaches the bottom of the window.
    const fit = await p.evaluate(() => {
      scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      const frame = document.getElementById('main-content').parentElement.parentElement.getBoundingClientRect();
      return { below: Math.round(innerHeight - frame.bottom), wide: document.documentElement.scrollWidth - innerWidth };
    });
    if (fit.below > 0) gaps.push(`${path} ${fit.below}px`);
    if (fit.wide > 0) sideways.push(`${path} ${fit.wide}px`);
  }
  check(`${s.name}: no gap below the page when scrolled down`, !gaps.length, gaps.join(', '));
  check(`${s.name}: nothing slides sideways`, !sideways.length, sideways.join(', '));
  if (s.width >= 1024 && !s.mobile) {
    // Desktop: the sidebar is exactly the window's height, and everything in it can be reached inside it.
    await p.goto(B + '/admin/events'); await settle(p, 1000);
    const nav = p.getByRole('navigation', { name: 'Admin' });
    const side = await nav.evaluate((n) => {
      const box = n.getBoundingClientRect();
      const button = n.querySelector('button[aria-label$="sidebar"]');
      button.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      const collapse = button.getBoundingClientRect();
      return { height: Math.round(box.height), top: Math.round(box.top), collapseBottom: Math.round(collapse.bottom), collapseTop: Math.round(collapse.top) };
    });
    check(`${s.name}: sidebar fills the window's height`, side.top === 0 && side.height === s.height, JSON.stringify(side));
    check(`${s.name}: Collapse is reachable inside the sidebar`, side.collapseTop >= 0 && side.collapseBottom <= s.height, JSON.stringify(side));
    check(`${s.name}: Keep Core is reachable`, await nav.getByRole('link', { name: 'Keep Core' }).isVisible());
    check(`${s.name}: the page itself still doesn't scroll`, await p.evaluate(() => scrollY === 0));
    await p.screenshot({ path: `${S}/admin-fit-${s.width}x${s.height}.jpg`, type: 'jpeg', quality: 70 });
  }
  await ctx.close();
}
check('no errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.join('\n'));
