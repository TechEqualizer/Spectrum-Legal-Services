// Fans, step 2: Follow on the link, for organizers with it on
// (FOLLOW_ORGANIZERS: the test-only Golden Hour here, not Big Love). The
// rail's text-me button becomes Follow; the sheet takes an email and says
// "Check your email"; after confirming, the link shows "Following ✓" and
// can unfollow. The organizer's choose-a-night page has Follow too.
import { chromium, settle } from '../browser.mjs';
import { addGoldenHour, ORGANIZER } from '../fixtures/golden-hour.mjs';
const B = 'http://localhost:3002';
const DB = 'http://localhost:54321';
const MAIL = 'http://localhost:54700';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const emails = async () => (await fetch(MAIL + '/__emails')).json();
const state = async () => (await fetch(DB + '/__state')).json();
const linkIn = (mail) => mail.text.match(/https?:\/\/\S+\/fans\/confirm\?token=[A-Za-z0-9_-]{43}/)?.[0];

await fetch(DB + '/__organizer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: ORGANIZER, name: 'Golden Hour Sundays' }) });
const gh = await addGoldenHour();
// A second event, so the organizer's permanent link is a choose-a-night page
// (added before any visit: the app caches the organizer's events).
await addGoldenHour((g) => ({ ...g, slug: 'sundays-two', id: 'golden-hour-two' }));
const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
const rail = () => p.getByRole('dialog').first();

// Big Love doesn't have Follow on: its link is unchanged.
await p.goto(B + '/f/masquerade?src=instagram'); await settle(p, 2000);
await p.getByRole('button', { name: /Sneak peek inside/ }).click(); await settle(p, 1000);
check("Big Love's rail keeps Updates", await p.getByRole('button', { name: 'Updates' }).first().isVisible());
check("Big Love's rail has no Follow", await p.getByRole('button', { name: /^Follow/ }).count() === 0);

// Golden Hour has it on: the rail's text-me button is Follow.
await p.goto(B + '/f/sundays?src=tiktok'); await settle(p, 2000);
await p.getByRole('button', { name: /^(Sneak peek inside|Watch)$/ }).first().click(); await settle(p, 1000);
const follow = p.getByRole('button', { name: 'Follow', exact: true }).first();
check('the rail shows Follow', await follow.isVisible());
check('Follow replaces the text-me button', await p.getByRole('button', { name: /^Text me/ }).count() === 0);
await follow.click(); await settle(p, 500);
const sheet = p.getByRole('dialog', { name: 'Follow Golden Hour Sundays' });
check('the Follow sheet opens', await sheet.isVisible());
check('the sheet shows the words agreed to', await sheet.getByText(/I'd like Golden Hour Sundays to email me about upcoming nights/).isVisible());
check('the email field is focused, with the email keyboard', await sheet.getByLabel('Email').evaluate((el) => el === document.activeElement && el.type === 'email'));
await sheet.getByLabel('Email').fill('Sunday.Fan@Example.com');
await sheet.getByRole('button', { name: 'Follow', exact: true }).click();
await p.getByText('Check your email').waitFor({ timeout: 5000 }).catch(() => {});
check('then: check your email', await p.getByRole('heading', { name: 'Check your email' }).isVisible());
check('it says where the link went', await p.getByText(/We sent a link to Sunday\.Fan@Example\.com/).isVisible());
const mail = (await emails()).at(-1);
check('one email to the fan, from the organizer via Showlnk', mail?.to?.[0] === 'sunday.fan@example.com' && mail.from === 'Golden Hour Sundays via Showlnk <fans@showlnk.com>', mail?.from);
const pending = (await state()).fanTokens.at(-1);
check('the link remembers where it was followed from', pending?.organizer_slug === ORGANIZER && pending.source_tag === 'tiktok' && pending.funnel_id === gh.id, JSON.stringify(pending));
await p.getByRole('button', { name: 'Keep watching' }).click(); await settle(p, 300);
check('Keep watching closes the sheet', await p.getByRole('heading', { name: 'Check your email' }).count() === 0);

// Confirming in the same browser: the link then shows Following.
await p.goto(linkIn(mail)); await settle(p, 800);
await p.getByRole('button', { name: 'Confirm and follow' }).click(); await p.waitForURL(/following=/); await settle(p, 800);
await p.goto(B + '/f/sundays'); await settle(p, 2000);
await p.getByRole('button', { name: /^(Sneak peek inside|Watch)$/ }).first().click(); await settle(p, 1500);
const following = p.getByRole('button', { name: 'Following', exact: true }).first();
await following.waitFor({ timeout: 5000 }).catch(() => {});
check('a follower sees Following on the rail', await following.isVisible());
await p.screenshot({ path: 'follow-rail-390.png' });
await following.click(); await settle(p, 500);
const mine = p.getByRole('dialog', { name: "You're following" });
check("the sheet says you're following", await mine.isVisible());
await mine.getByRole('button', { name: 'Unfollow Golden Hour Sundays' }).click();
await p.getByRole('heading', { name: "You've unfollowed" }).waitFor({ timeout: 5000 }).catch(() => {});
check('unfollow from the link', await p.getByRole('heading', { name: "You've unfollowed" }).isVisible());
const f = (await state()).follows[0];
check('the follow is marked unfollowed', f?.unfollowed_at !== null && f?.unfollowed_at !== undefined);
await p.getByRole('button', { name: 'Keep watching' }).click(); await settle(p, 300);
check('the rail is back to Follow at once', await p.getByRole('button', { name: 'Follow', exact: true }).first().isVisible());

// Errors are shown, not swallowed: the 4th link in an hour is refused.
for (let i = 0; i < 3; i++) await fetch(B + '/api/fans/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'busy@example.com', organizer: ORGANIZER }) });
await p.getByRole('button', { name: 'Follow', exact: true }).first().click(); await settle(p, 300);
const again = p.getByRole('dialog', { name: 'Follow Golden Hour Sundays' });
await again.getByLabel('Email').fill('busy@example.com');
await again.getByRole('button', { name: 'Follow', exact: true }).click();
await again.getByRole('alert').waitFor({ timeout: 5000 }).catch(() => {});
check('a refused follow says why', (await again.getByRole('alert').innerText().catch(() => '')).includes('Too many links sent'));
await p.keyboard.press('Escape'); await settle(p, 300);
check('Escape closes the sheet', await p.getByRole('dialog', { name: 'Follow Golden Hour Sundays' }).count() === 0);

// The organizer's choose-a-night page (two events coming up) has Follow too.
await p.goto(B + '/f/' + ORGANIZER); await settle(p, 1500);
const pageFollow = p.getByRole('button', { name: 'Follow', exact: true });
check('the choose-a-night page shows Follow', await pageFollow.isVisible());
await pageFollow.click(); await settle(p, 400);
check('and opens the same sheet over the page', await p.getByRole('dialog', { name: 'Follow Golden Hour Sundays' }).isVisible());
await p.screenshot({ path: 'follow-choose-390.png' });

check('no page errors', errs.length === 0, errs.join(' | '));
console.log(res.join('\n'));
await b.close();
