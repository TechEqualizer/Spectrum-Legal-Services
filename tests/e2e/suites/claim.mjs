// Sign-up, step 3: claim the link. With the flyer read and the reels drafted
// (steps 1 and 2), the organizer picks their name and link (checked as they
// type), an email and a password, agrees to the terms, and claims: one step
// makes the organizer, the night as its first event (published with the
// reels' words), their login and access, and Core's 14-day trial, and uses
// up the invite. They land signed in on Home, with their link to copy.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const CLAUDE = 'http://localhost:54400';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const flyer = new URL('../fixtures/flyer-masquerade.jpg', import.meta.url).pathname;
const secret = { apikey: 'test-secret', Authorization: 'Bearer test-secret' };

const b = await chromium.launch();
const errs = [];
const admin = await b.newContext({ storageState: S + '/auth.json' });
const made = await (await admin.request.post(B + '/api/admin/invites', { data: { note: 'Golden Hour crew' } })).json();
const code = new URL(made.link).searchParams.get('invite');
// Someone Showlnk has given access but who has no sign-in yet: their email can't claim a new organizer.
await admin.request.post(B + '/api/admin/accounts', { data: { email: 'pending@example.com', organizers: ['biglove'] } });

const ctx = await b.newContext({ viewport: { width: 1279, height: 900 }, timezoneId: 'America/New_York' });
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await fetch(CLAUDE + '/__mode', { method: 'POST', body: 'multi' });
await p.goto(B + '/start?invite=' + code); await settle(p, 1200);
await p.getByRole('radio', { name: 'Promoter' }).click();
await p.locator('input[type=file]').setInputFiles(flyer);
await p.getByText('From your flyer', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);
await p.getByRole('button', { name: 'Continue' }).click();
await p.getByLabel('Title').first().waitFor({ timeout: 10000 }).catch(() => {});
await p.getByLabel('Title').first().fill('Masks on, Motor City');
await p.getByRole('button', { name: 'Continue' }).click();

// Step 3.
check('step 3: claim your link', await p.getByRole('heading', { name: 'Claim your link.' }).isVisible() && (await p.locator('[aria-current="step"]').textContent()) === 'Your link');
const nameField = p.getByLabel('Your name, as fans see it');
const linkField = p.getByLabel('Your link', { exact: true });
check('the name, from the flyer', (await nameField.inputValue()) === 'Golden Hour', await nameField.inputValue());
check('the link follows the name', (await linkField.inputValue()) === 'golden-hour');
await p.getByText("It's free", { exact: false }).waitFor({ timeout: 5000 }).catch(() => {});
check('checked: free', await p.getByText("✓ It's free. It's yours once you claim it.").isVisible());
await linkField.fill('biglove');
await p.getByText('That link is taken. Try another.').waitFor({ timeout: 5000 }).catch(() => {});
check('checked: taken', await p.getByText('That link is taken. Try another.').isVisible());
await linkField.fill('golden-hour');
check('the trial, and the price once', await p.getByText('Core · free for 14 days').isVisible() && await p.getByText(/\$29 a month or \$290 a year, or stay on Free/).isVisible() && await p.getByText('No card now.', { exact: false }).isVisible());
check("the flyer had a ticket link: not asked", (await p.getByLabel('Where fans buy tickets').count()) === 0);
check('the content rule, beside the terms', await p.getByText('Suggestive yes, explicit no.').isVisible() && (await p.getByRole('link', { name: 'terms' }).getAttribute('href')) === '/terms');

// What's missing, said where it's missing.
await p.getByRole('button', { name: 'Claim my link' }).click();
check('says what is missing', await p.getByText('Enter your email address.').isVisible() && await p.getByText('Use at least 8 characters.').isVisible() && await p.getByText('Agree to the terms to claim your link.').isVisible());

// An email that already has a sign-in.
await p.getByLabel('Email').fill('tester@example.com');
await p.getByLabel('Password', { exact: true }).fill('velvet-pass-1');
await p.getByRole('checkbox').check();
await p.getByRole('button', { name: 'Claim my link' }).click();
await p.getByText('This email already has a Showlnk sign-in', { exact: false }).waitFor({ timeout: 8000 }).catch(() => {});
check('an email with a sign-in: says so', await p.getByText('This email already has a Showlnk sign-in. Sign in, or use another email.').isVisible());
const orgs = async (slug) => (await (await fetch(`${DB}/rest/v1/organizers?slug=eq.${slug}`)).json()).length;
check('and nothing was made', (await orgs('golden-hour')) === 0);

// An email Showlnk already gave access to: the claim stops, and the sign-in it made goes too.
const direct = await ctx.request.post(B + '/api/start/claim', { data: { invite: code, name: 'Golden Hour', slug: 'golden-hour', email: 'pending@example.com', password: 'pending-pass-1', agree: true, timeZone: 'America/Detroit', draft: { dates: [{ name: 'Golden Hour: Halloween', date: '2026-10-31', time: '19:00', venue: 'The Rooftop', price: 'From $30', ticketUrl: '' }] } } });
const directBody = await direct.text();
check('an email already on Showlnk: refused', direct.status() === 409 && JSON.parse(directBody).field === 'email', direct.status() + ' ' + directBody);
const pendingLogin = await ctx.request.post(B + '/api/admin/login', { data: { email: 'pending@example.com', password: 'pending-pass-1' } });
check('and its new sign-in was removed', pendingLogin.status() === 401);
check('and nothing was made', (await orgs('golden-hour')) === 0);

// Claim.
await p.getByLabel('Email').fill('Velvet@Example.com');
await p.getByRole('button', { name: 'Claim my link' }).click();
await p.waitForURL(/\/admin\/home\?welcome=/, { timeout: 15000 }).catch(() => {});
await settle(p, 1500);
check('lands on Home, signed in', /\/admin\/home\?welcome=golden-hour-halloween$/.test(p.url()), p.url());
check('welcomed by name', await p.getByRole('heading', { name: 'Welcome to Showlnk, Golden Hour' }).isVisible());
const welcome = p.getByRole('region', { name: 'Your link is ready' });
check('your link is ready', await welcome.isVisible() && await welcome.getByRole('link', { name: 'localhost:3002/f/golden-hour' }).isVisible());
check('what to do next', await welcome.getByRole('button', { name: 'Open your reels' }).isVisible() && await welcome.getByRole('button', { name: 'Take the tour' }).isVisible());
check('the tour waits', (await p.getByRole('dialog').count()) === 0);
const four = (await p.getByText('The four things').locator('..').locator('..').innerText().catch(() => '')).replace(/\s+/g, ' ');
check('Home: the opening scene from the flyer, the reels still need video', /Opening scene .*Ready/.test(four) && (four.match(/Needs video/g) ?? []).length === 3, four);
await p.screenshot({ path: 'claim-home-1279.png', fullPage: true });

// What the claim made.
const event = await (await fetch(`${DB}/rest/v1/event_funnels?slug=eq.golden-hour-halloween`)).json();
check('the night, under their organizer', event[0]?.organizer_slug === 'golden-hour' && event[0]?.data?.brand?.name === 'Golden Hour');
const pub = (await (await fetch(`${DB}/rest/v1/funnel_publications?slug=eq.golden-hour-halloween`)).json())[0]?.data;
check('published with their reels', JSON.stringify(pub?.reels?.map((r) => r.role)) === '["the_night","your_people","last_call"]' && pub?.screen?.title === 'Masks on, Motor City', JSON.stringify(pub?.screen));
check('in their flyer\'s colors', Boolean(pub?.look?.colors), JSON.stringify(pub?.look));
check('not the preview extras', !pub?.reels?.some((r) => r.visibility === 'fans') && !pub?.events?.some((e) => e.presale) && !String(JSON.stringify(pub)).includes('data:image'));
// Their flyer, kept: stored in the event's folder, the opening scene, behind each reel, and the look's flyer.
const flyerUrl = pub?.backdrop?.src ?? '';
check('their flyer, stored with the event', /^http:\/\/localhost:54321\/storage\/v1\/object\/public\/reel-media\/golden-hour-halloween\/[a-z0-9]+-flyer\.jpg$/.test(flyerUrl) && pub.backdrop.kind === 'image' && pub.backdrop.fit === 'poster', JSON.stringify(pub?.backdrop));
check('behind each reel, and as the look\'s flyer', pub?.reels?.every((r) => r.media?.src === flyerUrl) && pub?.look?.flyer === flyerUrl);
const stored = await fetch(flyerUrl);
check('the stored flyer is the JPEG', stored.ok && stored.headers.get('content-type') === 'image/jpeg' && (await stored.arrayBuffer()).byteLength > 1000);
check('their dates, on their clock', pub?.events?.length === 2 && pub.events[0].timeZone === 'America/New_York' && pub.events[0].startsAt.startsWith('2026-10-31T23:00'), JSON.stringify(pub?.events?.[0]));
const plan = (await (await fetch(`${DB}/rest/v1/organizer_plans?organizer_slug=eq.golden-hour`, { headers: secret })).json())[0];
const claimed = (await (await admin.request.get(B + '/api/admin/invites')).json()).invites.find((i) => i.note === 'Golden Hour crew');
check('the invite: claimed for them', claimed?.claimed_organizer === 'golden-hour' && Boolean(claimed?.claimed_at));
check('Core: trialing, 14 days from the claim', plan?.status === 'trialing' && Math.round((Date.parse(plan.trial_ends_at) - Date.parse(claimed?.claimed_at)) / 864e5) === 14, JSON.stringify(plan));
const dates = (await (await fetch(`${DB}/__state`)).json()).eventDates['golden-hour-halloween-v1'] ?? [];
check('the dates as rows', dates.length === 2, JSON.stringify(dates));

// Their link, live.
const fan = await (await b.newContext()).newPage();
await fan.goto(B + '/f/golden-hour-halloween'); await settle(fan, 1500);
check('the night is live, in their words', await fan.getByText('Masks on, Motor City').first().isVisible().catch(() => false));
// They signed up themselves: Follow is on for them, and Core's presale and fans-only parts with the trial.
await fan.getByRole('button', { name: /Sneak peek inside|Step inside/ }).first().click().catch(() => {});
const followShown = fan.getByText('Follow', { exact: true }).locator('visible=true').first();
await followShown.waitFor({ timeout: 8000 }).catch(() => {});
check('their link has Follow', await followShown.isVisible().catch(() => false));

// The invite is used up; the draft left the browser.
await p.goto(B + '/start?invite=' + code); await settle(p, 500);
check('the invite: used', await p.getByRole('heading', { name: 'This invite has been used' }).isVisible());
check('the draft is gone from the browser', (await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('showlnk-start-')).length)) === 0);
const again = await ctx.request.post(B + '/api/start/claim', { data: { invite: code, name: 'X', slug: 'another-one', email: 'x@example.com', password: 'whatever-1', agree: true, draft: { dates: [{ name: 'X', date: '2026-11-01', time: '', venue: '', price: '', ticketUrl: '' }] } } });
check('a second claim: refused', again.status() === 403);

// Their own sign-in, next time.
const login = await (await b.newContext()).request.post(B + '/api/admin/login', { data: { email: 'velvet@example.com', password: 'velvet-pass-1' } });
check('signs in with the password they chose', login.status() === 200);

// On a phone: the claim form fits.
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
m.on('pageerror', (e) => errs.push(e.message));
const made2 = await (await admin.request.post(B + '/api/admin/invites', { data: { note: 'Phone check' } })).json();
const code2 = new URL(made2.link).searchParams.get('invite');
await m.goto(B + '/start?invite=' + code2); await settle(m, 800);
await m.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ role: 'Venue', dates: [{ name: 'Golden Hour: Halloween', date: '2026-10-31', time: '19:00', venue: 'The Rooftop', price: '', ticketUrl: '' }] })), ['showlnk-start-' + code2.slice(0, 12)]);
await m.reload(); await settle(m, 1000);
await m.getByRole('button', { name: 'Continue' }).click(); await m.waitForTimeout(300);
await m.getByRole('button', { name: 'Continue' }).click(); await m.waitForTimeout(500);
check("a flyer with no ticket link: asked where", await m.getByLabel('Where fans buy tickets').isVisible() && await m.getByText('You can add it later.', { exact: false }).isVisible());
check('phone: the claim fits', await m.getByRole('heading', { name: 'Claim your link.' }).isVisible() && await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await m.screenshot({ path: 'claim-390.png', fullPage: true });

check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
