// The admin on a phone: every page fits 390px with nothing sliding sideways,
// the top bar keeps the event and account on screen, and all six tabs show
// their labels. For a short and a long event name, at normal and large text
// (Android and iOS text size settings).
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

// A client whose name is long, the case that pushed the bar off the screen.
const admin = await b.newContext({ storageState: S + '/auth.json' });
const made = await admin.request.post(B + '/api/admin/clients', { data: { name: 'The Book Signing Collective', slug: 'book-signing-collective', eventName: 'Book Signing at the Grand Library', eventSlug: 'book-signing-grand' } });
check('long-named client added', made.ok(), String(made.status()));
await admin.close();

const PAGES = ['/admin/home', '/admin/events', '/admin', '/admin/leads', '/admin/overview', '/admin/links', '/admin/settings'];
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, timezoneId: 'America/Detroit' });
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));

// What spills past the right edge, named so a failure says where to look.
// Measured against the phone's 390px, not innerWidth: a too-wide page makes a
// phone browser zoom out, which widens innerWidth and hides the problem.
const W = 390;
// Inside a box that clips or scrolls on purpose (a table, a truncated name) is fine;
// the page column's own clip is only a safety net, so content it cuts off still fails.
const clipped = (el) => {
  for (let a = el.parentElement; a && a.tagName !== 'MAIN' && a.tagName !== 'NAV'; a = a.parentElement) {
    if (/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX) && a.getBoundingClientRect().right <= 391) return true;
  }
  return false;
};
const measure = () => p.evaluate(([w, clippedSrc]) => {
  const isClipped = new Function('return ' + clippedSrc)();
  const out = [...document.querySelectorAll('body *')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed' && !isClipped(el);
  }).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')}`);
  const tabs = [...document.querySelectorAll('nav[aria-label="Admin"] ul a')].map((a) => {
    const r = a.getBoundingClientRect(); const label = a.querySelector('span'); const lr = label?.getBoundingClientRect();
    return { name: a.textContent.trim(), ok: r.left >= 0 && r.right <= w + 1 && r.bottom <= 844 + 1 && lr && lr.bottom <= r.bottom + 1 && lr.right <= r.right + 1 && lr.left >= r.left - 1 };
  });
  return { scroll: Math.max(document.documentElement.scrollWidth, innerWidth), w, out, badTabs: tabs.filter((t) => !t.ok).map((t) => t.name) };
}, [W, clipped.toString()]);
const topBar = () => p.evaluate((w) => {
  const nav = document.querySelector('nav[aria-label="Admin"]');
  const hits = [...nav.querySelectorAll('summary, select, a, button')].filter((el) => !el.closest('ul') && el.getBoundingClientRect().width > 0);
  return hits.length > 0 && hits.every((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= w + 1; });
}, W);

for (const [event, label] of [['masquerade', 'short name'], ['book-signing-grand', 'long name']]) {
  for (const scale of [100, 130]) {
    await p.goto(B + '/admin/home'); await settle(p, 800);
    await p.evaluate((slug) => { try { localStorage.setItem('admin_business', slug); } catch {} }, event);
    const sel = p.locator('#admin-business');
    if (await sel.count()) await sel.selectOption(event).catch(() => {});
    for (const path of PAGES) {
      await p.goto(B + path); await settle(p, 900);
      if (scale !== 100) { await p.addStyleTag({ content: `html{font-size:${scale}%}` }); await settle(p, 200); }
      const m = await measure();
      check(`${label}, text ${scale}%: ${path} fits`, m.scroll <= m.w && m.out.length === 0, m.scroll + 'px; ' + m.out.join(', '));
      check(`${label}, text ${scale}%: ${path} tabs and top bar on screen`, m.badTabs.length === 0 && await topBar(), m.badTabs.join(','));
      if (path === '/admin' || path === '/admin/home') await p.screenshot({ path: S + `/phone-${event}-${path.split('/').pop()}-${scale}.jpg` });
    }
  }
}
// The public links fans open: the organizer's and the event's, with the long name.
for (const path of ['/f/book-signing-collective', '/f/book-signing-grand']) {
  await p.goto(B + path); await settle(p, 1200);
  const m = await measure();
  check(`public ${path} fits`, m.scroll <= m.w && m.out.length === 0, m.scroll + 'px; ' + m.out.join(', '));
  await p.screenshot({ path: S + `/phone-public-${path.split('/').pop()}.jpg` });
}

// Desktop keeps its sidebar: the event's logo, Admin and the switcher.
const desk = await b.newPage({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
await desk.goto(B + '/admin/home'); await settle(desk, 900);
check('desktop: sidebar head unchanged', await desk.getByRole('link', { name: 'Back to the site' }).isVisible() && await desk.locator('#admin-business').isVisible() && await desk.locator('nav').getByText('Admin', { exact: true }).isVisible());
check('desktop: a long name stays inside the sidebar', await desk.locator('nav[aria-label="Admin"] a[aria-label="Back to the site"]').evaluate((a) => a.getBoundingClientRect().right <= a.closest('nav').getBoundingClientRect().right));
await desk.screenshot({ path: S + '/phone-desktop.jpg' });
await b.close();
console.log(res.join('\n')); console.log('console:', errs.length ? errs : 'none');
