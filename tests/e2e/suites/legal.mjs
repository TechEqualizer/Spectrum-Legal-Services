// Showlnk's organizer terms and privacy note: reachable from the home page,
// the content rule in the terms, and readable on a phone.
import { chromium, settle } from '../browser.mjs';
const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const errs = [];

const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));

// The home page's footer leads to both.
await p.goto(B + '/'); await settle(p, 1500);
const footer = p.getByRole('navigation', { name: 'Showlnk footer' });
check('the footer links Terms and Privacy', await footer.getByRole('link', { name: 'Terms' }).isVisible() && await footer.getByRole('link', { name: 'Privacy' }).isVisible());
await footer.getByRole('link', { name: 'Terms' }).click(); await p.waitForURL('**/terms'); await settle(p, 1000);

// Terms: the content rule, and the promise that fans can be removed.
check('terms title', (await p.title()).startsWith('Organizer terms'), await p.title());
check('terms heading', (await p.getByRole('heading', { level: 1 }).innerText()).toLowerCase() === 'organizer terms');
const terms = await p.locator('main').innerText();
check('the content rule, in one line', terms.includes('Suggestive yes, explicit no.'));
check('no nudity or sex acts', /No nudity and no sex acts/.test(terms));
check('consent from anyone identifiable in a fans-only reel', /recognize in a fans-only reel has agreed/.test(terms));
check('AI footage never passed off as real', /AI-made footage is never presented as real/.test(terms));
check('the plans and price, as the claim states them', /\$29 a month or \$290 a year/.test(terms) && /free for the first 14 days, starting when you claim your link/.test(terms) && /Follow for up to 100 fans/.test(terms) && !/free while it.s in early access/.test(terms));
check('fans can be removed on request', /Anyone can be removed on request/.test(terms));
check('the terms link the privacy note', await p.getByRole('main').getByRole('link', { name: 'privacy note' }).getAttribute('href') === '/privacy');

// Privacy: what's kept, who sees it, how to leave.
await p.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name: 'Privacy' }).click(); await p.waitForURL('**/privacy'); await settle(p, 1000);
check('privacy title', (await p.title()).startsWith('Privacy'), await p.title());
const privacy = await p.locator('main').innerText();
for (const h of ['What we keep', 'Who sees it', 'Removing yourself']) check(`privacy: "${h}"`, await p.getByRole('heading', { level: 2, name: h }).isVisible());
check('Global Privacy Control means nothing is kept', /Global Privacy Control or Do Not Track, we keep none of this/.test(privacy));
check('never sold, never for ads', /never sell it, and never use it for ads/.test(privacy));
check('one-tap unfollow', /one-tap link to unfollow/.test(privacy));
check('the wordmark goes home', await p.getByRole('link', { name: 'Showlnk home' }).getAttribute('href') === '/');

// On a phone: no sideways scrolling, and the text is a comfortable size.
const phone = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const path of ['/terms', '/privacy']) {
  await phone.goto(B + path); await settle(phone, 1000);
  check(`${path} fits a phone`, await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check(`${path} body text at least 16px`, await phone.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.sl-legal p')).fontSize) >= 16));
}
await phone.screenshot({ path: 'legal-privacy-phone.png', fullPage: true });

check('no page errors', errs.length === 0, errs.join(' | '));
console.log(res.join('\n'));
await b.close();
