// Playwright for the suites, plus settle(): wait until a page has gone quiet
// instead of sleeping a fixed time.
//
// settle(page, ms) returns once nothing is loading (no requests in flight,
// media streams aside) and no short timer is pending (setTimeout up to 1s,
// in any frame), for a short quiet spell in a row, and the page has painted.
// It doesn't wait for CSS animations (the event pages always have some
// running); a check about one waits with animationsDone().
// It never waits longer than ms, so a suite is never slower than the old
// fixed pause; when something is still busy at ms (a looping timer, a fake
// clock), it behaves exactly like waitForTimeout(ms).
import { chromium as playwright } from 'playwright';

const QUIET_MS = 120;
const inflight = new WeakMap(); // page -> Set of requests

// Counts pending short timeouts in every frame (installed before any page script).
const countTimers = () => {
  const set = window.setTimeout, clear = window.clearTimeout, live = new Set();
  window.setTimeout = function (fn, ms, ...args) {
    if (!(Number(ms) <= 1000)) return set.call(this, fn, ms, ...args);
    const id = set.call(this, function () {
      live.delete(id);
      return typeof fn === 'function' ? fn.apply(this, args) : (0, eval)(fn);
    }, ms);
    live.add(id);
    return id;
  };
  window.clearTimeout = function (id) { live.delete(id); return clear.call(this, id); };
  Object.defineProperty(window, '__pendingTimers', { value: () => live.size });
};

const IGNORED = new Set(['media', 'websocket', 'eventsource']);
function track(page) {
  if (inflight.has(page)) return;
  const live = new Set();
  inflight.set(page, live);
  page.on('request', (r) => { if (!IGNORED.has(r.resourceType())) live.add(r); });
  for (const done of ['requestfinished', 'requestfailed']) page.on(done, (r) => live.delete(r));
}

// The admin's guided tour starts by itself on a first visit to Home; suites
// see the admin as someone who has had it, except a context made with { tour: true }.
const tourSeen = () => {
  try {
    localStorage.setItem('admin_tour', 'done');
  } catch {}
};

// Pages see the run's calendar too (shift-time.cjs): the real clock plus the run's offset.
// A suite that sets a page's own clock (page.clock) switches the shift off
// for that page with its own flag, read on every call: init scripts run in
// no set order, so this script never writes the flag.
const shiftTime = (offset) => {
  if (!offset) return;
  const RealDate = Date;
  const now = () => RealDate.now() + (window.__e2eOwnClock ? 0 : offset);
  function ShiftedDate(...args) {
    if (!new.target) return new RealDate(now()).toString();
    return args.length ? new RealDate(...args) : new RealDate(now());
  }
  Object.setPrototypeOf(ShiftedDate, RealDate);
  ShiftedDate.prototype = RealDate.prototype;
  // Not enumerable, like Date's own: Playwright's fake clock copies the
  // enumerable ones onto its Date, and must keep its own now().
  for (const [name, value] of [['now', now], ['parse', RealDate.parse], ['UTC', RealDate.UTC]]) {
    Object.defineProperty(ShiftedDate, name, { value, writable: true, configurable: true, enumerable: false });
  }
  window.Date = ShiftedDate;
};
const OFFSET = Number(process.env.E2E_TIME_OFFSET_MS || 0);

/** Now on the run's calendar, for dates a suite builds (suites themselves run on the real clock). */
export const testNow = () => Date.now() + OFFSET;

async function trackContext(ctx, { tour = false } = {}) {
  await ctx.addInitScript(countTimers);
  await ctx.addInitScript(shiftTime, OFFSET);
  if (!tour) await ctx.addInitScript(tourSeen);
  ctx.on('page', track);
  // A suite that sets a page's clock owns its time: the shift stops for that
  // page, and page.clock.install starts at the run's calendar unless it names a time.
  if (OFFSET) {
    // The same for a whole context's clock (ctx.clock).
    const cclock = ctx.clock;
    const ownAll = async () => { await ctx.addInitScript(() => { window.__e2eOwnClock = true; }); for (const p of ctx.pages()) await p.evaluate(() => { window.__e2eOwnClock = true; }).catch(() => {}); };
    for (const name of ['install', 'setFixedTime', 'setSystemTime']) {
      const fn = cclock[name].bind(cclock);
      cclock[name] = async (arg) => { await ownAll(); return fn(name === 'install' ? { time: testNow(), ...(arg ?? {}) } : arg); };
    }
    ctx.on('page', (page) => {
      const own = async () => {
        await page.addInitScript(() => { window.__e2eOwnClock = true; });
        await page.evaluate(() => { window.__e2eOwnClock = true; }).catch(() => {});
      };
      const clock = page.clock;
      const install = clock.install.bind(clock);
      const setFixedTime = clock.setFixedTime.bind(clock);
      const setSystemTime = clock.setSystemTime.bind(clock);
      clock.install = async (options = {}) => { await own(); return install({ time: testNow(), ...options }); };
      clock.setFixedTime = async (time) => { await own(); return setFixedTime(time); };
      clock.setSystemTime = async (time) => { await own(); return setSystemTime(time); };
    });
  }
  for (const page of ctx.pages()) track(page);
  return ctx;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function busy(page) {
  if ((inflight.get(page)?.size ?? 0) > 0) return true;
  const counts = await Promise.all(
    page.frames().map((f) =>
      f
        .evaluate(() => {
          return window.__pendingTimers ? window.__pendingTimers() : 0;
        })
        .catch(() => 0)
    )
  );
  return counts.some((n) => n > 0);
}

/** Waits until the page is quiet, for at most ms. */
export async function settle(page, ms) {
  track(page);
  const end = Date.now() + ms;
  let quietSince = null;
  while (Date.now() < end) {
    const b = await busy(page).catch(() => true);
    if (b) quietSince = null;
    else if (quietSince === null) quietSince = Date.now();
    else if (Date.now() - quietSince >= QUIET_MS) {
      // Let React paint what it just got (rAF can be faked by page.clock, hence the race).
      await Promise.race([
        page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))).catch(() => {}),
        sleep(100),
      ]);
      return;
    }
    await sleep(Math.min(25, Math.max(0, end - Date.now())));
  }
  if (process.env.SETTLE_DEBUG) {
    const what = await Promise.all(page.frames().map((f) => f.evaluate(() => ({
      url: location.pathname,
      timers: window.__pendingTimers ? window.__pendingTimers() : 0,
      anims: document.getAnimations().filter((a) => a.playState === 'running').map((a) => `${a.animationName ?? a.transitionProperty ?? 'anim'}:${a.effect?.getComputedTiming().activeDuration}`),
    })).catch(() => null)));
    console.error(`SETTLE cap ${ms}ms`, JSON.stringify({ requests: [...(inflight.get(page) ?? [])].map((r) => r.url().slice(0, 80)), frames: what.filter(Boolean) }));
  }
}

/** Waits until the page's transitions and animations have finished (endless ones aside), for at most ms. */
export async function animationsDone(page, ms) {
  await page
    .waitForFunction(
      () => !document.getAnimations().some((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity),
      null,
      { timeout: ms, polling: 50 }
    )
    .catch(() => {});
}

/** Playwright's chromium, with every page tracked for settle(). */
export const chromium = {
  async launch(options) {
    const browser = await playwright.launch(options);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async ({ tour, ...opts } = {}) => trackContext(await newContext(opts), { tour });
    browser.newPage = async (opts) => (await browser.newContext(opts)).newPage();
    return browser;
  },
};

/**
 * Shows the admin event `slug`: picks it in the nav's event picker, which
 * only appears when the admin has more than one event. With one event (Big
 * Love's, the only one seeded) it is already the one shown; the choice is
 * remembered for the next page load either way.
 */
export async function pickEvent(page, slug) {
  const picker = page.locator('#admin-business');
  if (await picker.count()) await picker.selectOption(slug);
  else await page.evaluate((s) => localStorage.setItem('admin_business', s), slug);
}
