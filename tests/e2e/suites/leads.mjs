// Real leads: a fresh event says it has none yet; a visitor who asks for
// updates on Big Love's live link shows up on its Leads page, with the reel
// they asked from, where the link was shared and the reels they watched;
// nobody else sees them; and there is no sample data anywhere in the admin.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const errs = [];
const b = await chromium.launch();
const sizes = [[390, 844], [1440, 900]];
const adminAt = async (w, h, slug) => {
  const mobile = w < 1024;
  const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, timezoneId: 'America/Detroit' });
  await ctx.addInitScript((s) => localStorage.setItem('admin_business', s), slug);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(w + ' ' + e.message));
  return { ctx, p };
};

// 1. A fresh event: nobody has asked yet.
const setup = await b.newContext({ storageState: S + '/auth.json' });
const made = await setup.request.post(B + '/api/admin/events', { data: { source: 'masquerade', name: 'Winter Ball', slug: 'masquerade-winter-ball', mode: 'fresh' } });
check('fresh event made', made.status() === 201, String(made.status()));
const freshLeads = await setup.request.get(B + '/api/admin/leads?slug=masquerade-winter-ball');
check('API: a fresh event has no leads', freshLeads.ok() && JSON.stringify(await freshLeads.json()) === '[]');
check('API: never cached', freshLeads.headers()['cache-control'] === 'private, no-store', freshLeads.headers()['cache-control']);
await setup.close();
for (const [w, h] of sizes) {
  const { ctx, p } = await adminAt(w, h, 'masquerade-winter-ball');
  await p.goto(B + '/admin/leads'); await settle(p, 1200);
  await p.getByRole('heading', { name: 'No leads yet' }).waitFor({ timeout: 5000 }).catch(() => {});
  const main = await p.locator('main').innerText();
  check(w + ': empty state', await p.getByRole('heading', { name: 'No leads yet' }).isVisible() && main.includes('When someone signs up for updates from your link, they show up here.'), main.slice(0, 300));
  check(w + ': empty state offers the link', (await p.getByRole('link', { name: 'Share your link' }).getAttribute('href')) === '/admin/links');
  check(w + ': title matches the tab', (await p.getByRole('heading', { level: 1 }).innerText()).trim().toLowerCase() === 'leads');
  check(w + ': fits width', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.screenshot({ path: `${S}/leads-empty-${w}.jpg`, quality: 80, fullPage: true });
  await ctx.close();
}

// 2. A visitor on Big Love's live link (shared on Instagram) watches the first reel to the end, then asks for updates.
const vctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Detroit' });
const v = await vctx.newPage(); v.on('pageerror', (e) => errs.push('visitor ' + e.message));
await v.clock.install();
await v.goto(B + '/f/masquerade?src=instagram', { waitUntil: 'networkidle' });
await v.getByRole('button', { name: /Sneak peek inside/ }).click();
await v.clock.runFor(1000);
check('visitor: first reel playing', await v.getByRole('region', { name: /Masks on\. Secrets revealed\./ }).isVisible());
for (let i = 0; i < 30 && !(await v.getByRole('region', { name: /Haute couture Halloween looks/ }).isVisible()); i++) await v.clock.runFor(1000);
const second = v.getByRole('region', { name: /Haute couture Halloween looks/ });
check('visitor: watched it to the end, on to the next', await second.isVisible());
await second.getByRole('button', { name: 'Updates', exact: true }).first().click();
const sheet = v.getByRole('region', { name: 'Get event updates' });
await sheet.getByLabel('First name').fill('Ava');
await sheet.getByLabel('Mobile number').fill('(313) 555-0123');
await sheet.getByRole('checkbox').check();
await sheet.getByRole('button', { name: 'Text me updates' }).click();
await v.getByText(/You're on the list, Ava/).waitFor({ timeout: 5000 }).catch(() => {});
check('visitor: signed up', await v.getByText(/You're on the list, Ava/).isVisible());
await vctx.close();

// A second, older-style request with an email and a message (straight to the API, as the form sends it).
const sent = await fetch(B + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  source: 'funnel', funnelId: 'masquerade-v1', intent: 'book', name: 'Jordan Lee', phone: '313-555-0199', email: 'Jordan@Example.com',
  caseType: 'Costume contest', message: 'Is there a prize for best mask?', referringReelId: 'mr-dress', sourceTag: 'tiktok',
}) });
check('second lead stored', sent.status === 201, String(sent.status));

// 3. The admin sees both on Big Love's Leads page, newest first.
for (const [w, h] of sizes) {
  const { ctx, p } = await adminAt(w, h, 'masquerade');
  await p.goto(B + '/admin/leads'); await settle(p, 1200);
  const list = p.getByRole('list').filter({ hasText: 'Ava' });
  await list.waitFor({ timeout: 5000 }).catch(() => {});
  const rows = list.getByRole('listitem');
  check(w + ': both leads, newest first', (await rows.count()) === 2 && (await rows.first().innerText()).includes('Jordan Lee') && (await rows.nth(1).innerText()).includes('Ava'), (await rows.allInnerTexts()).join(' | '));
  const ava = await rows.nth(1).innerText();
  check(w + ': row says what they asked for, from which reel and where', ava.includes('Updates by text') && ava.includes('Haute couture Halloween looks') && ava.includes('Instagram bio'), ava);
  check(w + ': no made-up statuses', !/Treatment booked|Consultation booked|Contacted/.test(await p.locator('main').innerText()));

  // Phones: tap a lead to open its details under it. Wide screens: the newest shows beside the list; pick Ava.
  await rows.nth(1).getByRole('button').first().click(); await settle(p, 300);
  const details = w < 1280 ? rows.nth(1) : p.getByRole('complementary', { name: 'Lead details' });
  const d = await details.innerText();
  check(w + ': details: how to reach them', (await details.getByRole('link', { name: /Call \(313\) 555-0123/ }).getAttribute('href')) === 'tel:3135550123', d.slice(0, 200));
  check(w + ': details: asked for, interest, reel, source', d.includes('Updates by text') && d.includes('Fashion show') && d.includes('Haute couture Halloween looks') && d.includes('Instagram bio'), d);
  check(w + ': details: the reel they watched first', d.includes('Masks on. Secrets revealed.') && d.includes('Watched to the end'), d);
  check(w + ': details: when, in their time zone', /[A-Z][a-z]{2}, [A-Z][a-z]{2} \d+ · \d+(:\d\d)? [AP]M/.test(d), d.slice(0, 120));
  check(w + ': fits width with details open', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.screenshot({ path: `${S}/leads-${w}.jpg`, quality: 80, fullPage: true });

  // The other lead: email, message, a call back, from TikTok.
  await rows.first().getByRole('button').first().click(); await settle(p, 300);
  const jd = await (w < 1280 ? rows.first() : p.getByRole('complementary', { name: 'Lead details' })).innerText();
  check(w + ': details: email, message, call back, TikTok', jd.includes('jordan@example.com') && jd.includes('Is there a prize for best mask?') && jd.includes('A call back') && jd.includes('TikTok bio') && jd.includes('None watched to the end'), jd);
  const targets = await p.locator('main a:visible, main button:visible').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  check(w + ': touch targets at least 44px', targets.every((t) => t >= 44), targets.join(','));
  check(w + ': fits width', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.screenshot({ path: `${S}/leads-${w}-second.jpg`, quality: 80, fullPage: true });
  await ctx.close();
}

// 4. Nobody else's leads, and nothing for signed-out visitors.
const anon = await (await b.newContext()).request.get(B + '/api/admin/leads?slug=masquerade');
check('signed out: refused', anon.status() === 401, String(anon.status()));
const stranger = await b.newContext();
await stranger.request.post(B + '/api/admin/login', { data: { email: 'stranger@example.com', password: 'stranger-pass-1' } });
const theirs = await stranger.request.get(B + '/api/admin/leads?slug=masquerade');
check('not an admin: refused', theirs.status() === 401 || theirs.status() === 403 || theirs.status() === 404, String(theirs.status()));
const sample = await (await b.newContext({ storageState: S + '/auth.json' })).request.get(B + '/api/admin/leads?slug=medspa');
check('the old sample has no leads to show', sample.status() === 404, String(sample.status()));

// 5. No sample data anywhere in the admin, and the sample links are gone.
{
  const { ctx, p } = await adminAt(1440, 900, 'masquerade');
  for (const path of ['/admin/home', '/admin/events', '/admin', '/admin/leads', '/admin/overview', '/admin/links', '/admin/settings']) {
    await p.goto(B + path); await settle(p, 1200);
    const text = await p.locator('body').innerText();
    check(`no sample wording on ${path}`, !/sample|Aurelia|med spa/i.test(text), (text.match(/.{0,40}(sample|Aurelia|med spa).{0,40}/i) ?? [''])[0]);
  }
  await ctx.close();
}
for (const gone of ['/f/medspa', '/f/events']) {
  const r = await fetch(B + gone);
  check(`${gone} is gone (404)`, r.status === 404, String(r.status));
}

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
