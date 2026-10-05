import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const admin = await b.newContext({ timezoneId: 'America/Detroit',  storageState: S + '/auth.json' });
const H = 3600e3;
const reels = [
  { id: 'mr-masks-on', title: 'Masks on. Secrets revealed.', summary: 'x', practiceArea: 'The night', cta: 'funnel', eventId: 'only' },
  { id: 'mr-runway', title: 'Haute couture Halloween looks', summary: 'x', practiceArea: 'Fashion show', cta: 'funnel', eventId: 'only' },
  { id: 'mr-last-year', title: 'Last year, in 30 seconds', summary: 'x', practiceArea: 'The night', cta: 'funnel', eventId: 'past' },
];
const publish = async (ms, status) => {
  const events = [
    { id: 'past', name: 'Masquerade on the Runway', startsAt: new Date(Date.now() - 7 * 24 * H).toISOString(), venue: '1600 East Grand Blvd, Detroit', ticketUrl: 'https://example.com/old' },
    { id: 'only', name: 'Masquerade on the Runway', startsAt: new Date(Date.now() + ms).toISOString(), venue: 'Grand Blvd', price: 'From $40', ticketUrl: 'https://example.com/t', reelId: 'mr-masks-on', ...(status ? { status } : {}) },
  ];
  const r = await admin.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade', publication: { version: 1, reels, funnel: { order: reels.map(r => r.id), topics: {}, paths: {}, primaryCta: 'tickets' }, events } } });
  if (!r.ok()) throw new Error(await r.text());
};
const view = async (w, h, name) => {
  const v = await b.newContext({ timezoneId: 'America/Detroit',  viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await v.route(/i\.ytimg\.com|youtube-nocookie/, r => r.fulfill({ status: 404 }));
  const p = await v.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/f/masquerade'); await settle(p, 2800);
  if (name) await p.screenshot({ path: `${S}/${name}.jpg` });
  return { p, v, errs };
};
const primaryLabel = (p) => p.locator('.cine-cta').first().innerText();

// A. Three days out
await publish(3 * 24 * H + 2 * H);
let { p, v, errs } = await view(390, 844, 'one-date-3days');
const card = p.getByRole('button', { name: /Masquerade on the Runway, .*Watch$/ });
check('A: one card, no circles', await card.count() === 1 && await p.getByText('Halloween night').count() === 0);
check('A: card shows time, venue and price', /· \d{1,2}(:\d\d)? (AM|PM)/.test(await card.innerText()) && (await card.innerText()).includes('Grand Blvd · From $40'), await card.innerText());
check('A: hook names the day', await p.getByText(/^This (Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i).isVisible());
check('A: sneak peek is the main button', (await primaryLabel(p)).includes('Sneak peek inside'));
check('A: add to calendar + recap links', await p.getByRole('link', { name: 'Add to calendar' }).isVisible() && await p.getByRole('button', { name: 'Watch last time' }).isVisible());
check('A: fits one screen', await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
const ics = await p.request.get(B + (await p.getByRole('link', { name: 'Add to calendar' }).getAttribute('href')));
const body = await ics.text();
check('calendar file', ics.headers()['content-type'].startsWith('text/calendar') && body.includes('SUMMARY:Masquerade on the Runway') && body.includes('LOCATION:Grand Blvd') && /DTSTART:\d{8}T\d{6}Z/.test(body), body.split('\r\n').slice(5, 9).join(' | '));
await card.click(); await settle(p, 700);
check('A: card plays the date\'s reel', (await p.locator('body').innerText()).includes('Masks on. Secrets revealed.'));
check('A: no errors', !errs.length, errs.join('|')); await v.close();

// B. Five hours out: countdown, tickets first
await publish(5 * H + 10 * 60e3);
({ p, v, errs } = await view(390, 844, 'one-date-5hours'));
check('B: countdown', /starts in 5h \d{1,2}m/i.test(await p.getByText(/Starts in/).innerText()), await p.getByText(/Starts in/).innerText().catch(() => 'none'));
check('B: Get tickets is the main button', (await primaryLabel(p)).trim() === 'Get tickets');
check('B: Watch is secondary', await p.getByRole('button', { name: 'Watch', exact: true }).isVisible());
await v.close();
({ p, v } = await view(360, 640, 'one-date-5hours-360'));
check('B: both buttons fit at 360px', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
await v.close();

// C. Ten days out, few left
await publish(10 * 24 * H, 'few_left');
({ p, v } = await view(390, 844, 'one-date-fewleft'));
check('C: one night only', await p.getByText('One night only').isVisible());
check('C: few left puts tickets first', (await primaryLabel(p)).trim() === 'Get tickets');
check('C: few left on the card', (await p.getByRole('button', { name: /Masquerade on the Runway, .*Watch$/ }).innerText()).includes('Few left'));
await v.close();

await admin.request.delete(B + '/api/admin/publish?slug=masquerade');
// D. Taken down: the built-in night, Sat Oct 31 at 8 PM, as one card with Eventbrite tickets
({ p, v } = await view(390, 844, 'one-date-builtin'));
const builtIn = p.getByRole('button', { name: /Masquerade on the Runway, .*Watch$/ });
check('D: built-in night is one card', await builtIn.count() === 1 && (await builtIn.innerText()).includes('8 PM'), await builtIn.innerText().catch(() => 'none'));
check('D: tickets go to Eventbrite', (await p.getByRole('link', { name: /Get tickets/ }).first().getAttribute('href')).startsWith('https://www.eventbrite.com/e/masquerade-on-the-runway'));
await b.close(); console.log(res.join('\n'));
