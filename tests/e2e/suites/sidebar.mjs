// The admin sidebar folds down to its icons on desktop; phones keep the bottom tab bar.
import { animationsDone, chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();

const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 }, timezoneId: 'America/Detroit' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(B + '/admin/overview'); await settle(p, 800);
const nav = p.getByRole('navigation', { name: 'Admin' });
const width = async () => Math.round((await nav.boundingBox()).width);
const toggle = nav.getByRole('button', { name: /sidebar$/ });
check('starts open', await width() === 240 && (await toggle.getAttribute('aria-label')) === 'Collapse sidebar' && (await toggle.getAttribute('aria-expanded')) === 'true', String(await width()));
check('open: labels and business picker shown', await nav.getByRole('link', { name: 'Leads' }).getByText('Leads').isVisible() && await p.locator('#admin-business').isVisible());
const column = p.locator('main').locator('xpath=..');
const mainBefore = (await column.boundingBox()).width;

await toggle.click(); await animationsDone(p, 1000);
check('collapses to an icon rail', await width() === 72, String(await width()));
check('toggle now expands', (await toggle.getAttribute('aria-label')) === 'Expand sidebar' && (await toggle.getAttribute('aria-expanded')) === 'false');
check('main area gets the room', (await column.boundingBox()).width > mainBefore + 150);
const leads = nav.getByRole('link', { name: 'Leads' });
check('icons keep their names (screen readers, tooltips)', await leads.count() === 1 && (await leads.getAttribute('title')) === 'Leads' && (await leads.getByText('Leads').boundingBox()).width <= 1);
check('current page still marked', (await nav.locator('[aria-current="page"]').getAttribute('title')) === 'Results');
check('business picker tucked away', !(await p.locator('#admin-business').isVisible()));
const links = await nav.getByRole('link').evaluateAll(els => els.filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }));
check('icon targets at least 44px', links.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(links));
await p.screenshot({ path: S + '/sidebar-collapsed-1440.jpg' });

await leads.click(); await p.waitForURL(/\/admin\/leads/); await settle(p, 500);
check('stays collapsed between pages', await width() === 72);
await p.reload(); await settle(p, 800);
check('remembered after reload', await width() === 72);

// The studio gets the extra width too.
await p.goto(B + '/admin'); await settle(p, 1500);
check('studio fits, no page scroll', await p.evaluate(() => scrollY === 0 && document.documentElement.scrollWidth <= innerWidth));
await p.screenshot({ path: S + '/sidebar-collapsed-studio-1440.jpg' });

await toggle.click(); await animationsDone(p, 1000);
check('expands again', await width() === 240 && await p.locator('#admin-business').isVisible());
check('expanded is remembered', await p.evaluate(() => localStorage.getItem('admin_nav_collapsed') === null));
check('no errors', !errs.length, errs.join(' | '));
await ctx.close();

// Phones: the bottom tab bar, no collapse button, even if it was folded on desktop.
const m = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await m.newPage();
await mp.goto(B + '/admin/overview'); await mp.evaluate(() => localStorage.setItem('admin_nav_collapsed', '1')); await mp.reload(); await settle(mp, 800);
const tabs = mp.locator('nav ul a');
check('phone: 5 tabs with labels', await tabs.count() === 5 && await tabs.first().getByText('Events').isVisible());
check('phone: no collapse button', !(await mp.getByRole('button', { name: /sidebar$/ }).isVisible()));
check('phone: business picker shown', await mp.locator('#admin-business').isVisible());
await m.close();

await b.close(); console.log(res.join('\n'));
