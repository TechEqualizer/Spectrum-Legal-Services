// The guided tour: starts by itself on a client's first visit to Home, lights
// up each place in turn (moving between pages), and can be taken again from
// the account menu or a link with ?tour=1. Desktop and phone.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

const STEPS = [
  ['/admin/home', 'Welcome to Showlnk', null],
  ['/admin/home', 'Home: your night at a glance', 'home-next'],
  ['/admin', 'Reels: what visitors see', 'nav-reels'],
  ['/admin', 'Your reels, in order', 'reels-order'],
  ['/admin', 'Add a reel', 'add-reel'],
  ['/admin', 'Nothing goes live until you Publish', 'publish'],
  ['/admin/events', 'Events: each night and its link', 'events-list'],
  ['/admin/links', 'Your bio link', 'share-bio'],
  ['/admin/links', 'A link for every place you post', 'share-builder'],
  ['/admin/overview', 'Results', 'nav-results'],
  ['/admin/leads', 'Leads', 'nav-leads'],
  ['/admin/leads', 'Fans', 'people-tabs'],
  ['/admin/settings', 'Eventbrite', 'eventbrite'],
  ['/admin/settings', "You're all set", 'account'],
];

const organizer = async (viewport, mobile = false) => {
  const ctx = await b.newContext({ tour: true, viewport, isMobile: mobile, hasTouch: mobile, timezoneId: 'America/Detroit' });
  await ctx.request.post(B + '/api/admin/login', { data: { email: 'organizer@example.com', password: 'organizer-pass-1' } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  return { ctx, p };
};

const tourCard = (p) => p.locator('[data-testid=tour] [role=dialog]');

/** Waits for a step's card, then reports where things are. */
async function at(p, title) {
  await p.waitForFunction((t) => {
    const d = document.querySelector('[data-testid=tour] [role=dialog]');
    return d && d.querySelector('h2')?.textContent === t && getComputedStyle(d).opacity === '1';
  }, title, { timeout: 8000 }).catch(() => {});
  await settle(p, 600);
  // Smooth scrolling into view: wait until the light stops moving.
  await p.waitForFunction(() => new Promise((done) => {
    const at = () => JSON.stringify(document.querySelector('[data-testid=tour-light]')?.getBoundingClientRect() ?? null);
    const a = at(); setTimeout(() => done(at() === a), 150);
  }), null, { timeout: 4000, polling: 50 }).catch(() => {});
  return p.evaluate(() => {
    const d = document.querySelector('[data-testid=tour] [role=dialog]');
    const light = document.querySelector('[data-testid=tour-light]');
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom }; };
    return { title: d?.querySelector('h2')?.textContent ?? null, path: location.pathname, card: box(d), light: box(light), vw: innerWidth, vh: innerHeight };
  });
}

async function walk(p, label) {
  const bad = [];
  for (let i = 0; i < STEPS.length; i++) {
    const [path, title, target] = STEPS[i];
    const s = await at(p, title);
    if (s.title !== title || s.path !== path) { bad.push(`${i}: ${s.title} on ${s.path}`); break; }
    const inView = s.card && s.card.top >= 0 && s.card.left >= 0 && s.card.right <= s.vw + 0.5 && s.card.bottom <= s.vh + 0.5;
    if (!inView) bad.push(`${i}: card off screen ${JSON.stringify(s.card)}`);
    if (target) {
      const t = await p.evaluate((name) => {
        const el = [...document.querySelectorAll(`[data-tour="${name}"]`)].find((e) => e.getBoundingClientRect().width > 0);
        if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
      }, target);
      if (t) {
        const l = s.light;
        const around = l && l.top <= t.top + 1 && l.left <= t.left + 1 && l.right >= t.right - 1 && l.bottom >= t.bottom - 1;
        if (!around) bad.push(`${i}: light not on ${target}`);
        const overlap = l && !(s.card.bottom <= l.top || s.card.top >= l.bottom || s.card.right <= l.left || s.card.left >= l.right);
        // The card may sit over a light bigger than the screen allows space for, never over a small one.
        if (overlap && (l.bottom - l.top) < s.vh * 0.6 && (l.right - l.left) < s.vw * 0.6) bad.push(`${i}: card covers ${target}`);
      } else if (s.light) bad.push(`${i}: light with no ${target}`);
    }
    if (i === 5) await p.screenshot({ path: `${S}/tour-${label}-publish.png` });
    if (i === 8) await p.screenshot({ path: `${S}/tour-${label}-share.png` });
    await tourCard(p).getByRole('button', { name: i === 0 ? 'Start the tour' : i === STEPS.length - 1 ? 'Done' : 'Next' }).click();
  }
  return bad;
}

// Desktop: starts by itself on Home, walks every step, then stays away.
{
  const { ctx, p } = await organizer({ width: 1440, height: 900 });
  await p.goto(B + '/admin/home');
  const first = await at(p, 'Welcome to Showlnk');
  check('desktop: starts by itself on first visit to Home', first.title === 'Welcome to Showlnk', JSON.stringify(first.title));
  await p.screenshot({ path: `${S}/tour-desktop-welcome.png` });
  check('desktop: focus on the main button', await p.evaluate(() => document.activeElement?.textContent) === 'Start the tour');
  // Clicks outside the card don't reach the page.
  const reels = await p.locator('[data-tour=nav-reels]').boundingBox();
  await p.mouse.click(reels.x + reels.width / 2, reels.y + reels.height / 2); await settle(p, 500);
  check('desktop: the page behind is blocked', new URL(p.url()).pathname === '/admin/home');
  const bad = await walk(p, 'desktop');
  check('desktop: every step on its page, lit and readable', bad.length === 0, bad.join(' | '));
  await settle(p, 500);
  check('desktop: Done closes it', (await p.locator('[data-testid=tour]').count()) === 0);
  await p.goto(B + '/admin/home'); await settle(p, 1500);
  check('desktop: not again after Done', (await p.locator('[data-testid=tour]').count()) === 0);

  // Again from the account menu; Back works; Escape skips.
  await p.locator('[data-tour=account]').first().click();
  await p.getByRole('button', { name: 'Take the tour' }).click();
  await at(p, 'Welcome to Showlnk');
  await tourCard(p).getByRole('button', { name: 'Start the tour' }).click();
  await at(p, 'Home: your night at a glance');
  await tourCard(p).getByRole('button', { name: 'Next' }).click();
  const r = await at(p, 'Reels: what visitors see');
  await tourCard(p).getByRole('button', { name: 'Back' }).click();
  const back = await at(p, 'Home: your night at a glance');
  check('desktop: Take the tour, Next and Back move between pages', r.path === '/admin' && back.path === '/admin/home', `${r.path} → ${back.path}`);
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  check('desktop: Tab stays in the card', await p.evaluate(() => Boolean(document.activeElement?.closest('[data-testid=tour]'))));
  await p.keyboard.press('Escape'); await settle(p, 400);
  check('desktop: Escape skips', (await p.locator('[data-testid=tour]').count()) === 0);
  await ctx.close();
}

// "Not now" on the first card: skipped for good.
{
  const { ctx, p } = await organizer({ width: 1280, height: 800 });
  await p.goto(B + '/admin/home'); await at(p, 'Welcome to Showlnk');
  await tourCard(p).getByRole('button', { name: 'Not now' }).click(); await settle(p, 300);
  await p.reload(); await settle(p, 1500);
  check('Not now: stays away after reload', (await p.locator('[data-testid=tour]').count()) === 0);
  // Somewhere other than Home: never by itself, only with ?tour=1.
  await ctx.close();
}

// Phone: started from a link with ?tour=1 on another page; every card on screen.
{
  const { ctx, p } = await organizer({ width: 390, height: 844 }, true);
  await p.goto(B + '/admin/leads'); await settle(p, 1500);
  // Not Home: it doesn't start by itself.
  check('phone: not by itself off Home', (await p.locator('[data-testid=tour]').count()) === 0);
  await p.goto(B + '/admin/leads?tour=1');
  const s = await at(p, 'Welcome to Showlnk');
  check('phone: ?tour=1 starts it, on Home', s.title === 'Welcome to Showlnk' && s.path === '/admin/home' && !p.url().includes('tour=1'), p.url());
  const bad = await walk(p, 'phone');
  check('phone: every step on its page, lit and readable', bad.length === 0, bad.join(' | '));
  check('phone: no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
}

// Suites (and anyone who has had it) never see it unasked.
{
  const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + '/admin/home'); await settle(p, 1500);
  check('seen before: no tour', (await p.locator('[data-testid=tour]').count()) === 0);
  await ctx.close();
}

check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
console.log(res.join('\n'));
