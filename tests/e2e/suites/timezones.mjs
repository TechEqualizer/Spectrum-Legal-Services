// Event times are on the event's own clock: Big Love's night is Sat Oct 31,
// 8 PM in Detroit, and reads that way to a visitor in Los Angeles or London,
// on the admin's Dates card in another zone, and in the calendar file.
import { chromium, pickEvent, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
const errs = [];
// Start from the seeded funnel (Detroit), not a leftover publication.
const adm = await b.newContext({ storageState: S + '/auth.json' }); await adm.request.delete(B + '/api/admin/publish?slug=masquerade'); await adm.close();

const visitor = async (timezoneId, at) => {
  const v = await b.newContext({ timezoneId, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await v.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await v.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
  const p = await v.newPage(); p.on('pageerror', e => errs.push(`${timezoneId}: ${e.message}`));
  if (at) await p.clock.setFixedTime(new Date(at));
  await p.goto(B + '/f/masquerade'); await settle(p, 1500);
  return { v, p, card: p.getByRole('button', { name: /Masquerade on the Runway, .*Watch$/ }) };
};

for (const zone of ['America/Los_Angeles', 'Europe/London']) {
  // 1. Weeks out: the day and time are Detroit's.
  let { v, p, card } = await visitor(zone);
  check(`${zone}: Saturday · 8 PM`, await p.getByText('Saturday · 8 PM').isVisible(), (await card.innerText().catch(() => '')).replace(/\n/g, ' '));
  const text = await card.innerText();
  check(`${zone}: Oct 31 on the date card`, /oct\s*31/i.test(text) && !/nov/i.test(text), text.replace(/\n/g, ' '));
  check(`${zone}: spoken date is Sat, Oct 31`, ((await card.getAttribute('aria-label')) ?? '').includes('Sat, Oct 31'), await card.getAttribute('aria-label'));
  if (zone === 'Europe/London') await p.screenshot({ path: `${S}/timezones-london.jpg` });
  // The calendar file holds the real moment: 8 PM EDT is midnight UTC.
  const ics = await (await p.request.get(B + (await p.getByRole('link', { name: 'Add to calendar' }).getAttribute('href')))).text();
  check(`${zone}: calendar file starts at 8 PM Detroit`, ics.includes('DTSTART:20261101T000000Z'), ics.split('\r\n').find(l => l.startsWith('DTSTART')));
  await v.close();

  // 2. 2:30 AM on the day in Detroit (still Friday night in LA, already
  // Saturday morning in London, where the event's moment falls on Sunday):
  // it's tonight, this Saturday, on the event's calendar.
  ({ v, p, card } = await visitor(zone, '2026-10-31T06:30:00Z'));
  const hook = await p.getByText(/^This \w+day$/).innerText().catch(() => 'none');
  check(`${zone}: hook says This Saturday`, hook.toLowerCase() === 'this saturday', hook);
  const chip = await card.innerText().catch(() => '');
  check(`${zone}: chip says Tonight`, chip.includes('Tonight') && !chip.includes('Tomorrow'), chip.replace(/\n/g, ' '));
  await v.close();
}

// 3. The admin, in Los Angeles: Big Love's date is 8 PM, on Detroit's clock.
const ctx = await b.newContext({ timezoneId: 'America/Los_Angeles', storageState: S + '/auth.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route(/i\.ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
await ctx.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`admin: ${e.message}`));
await p.goto(B + '/admin'); await settle(p, 600);
await pickEvent(p, 'masquerade'); await settle(p, 1300);
const dates = p.locator('section[aria-labelledby="dates-title"]');
const row = (t) => dates.locator(':scope > ul > li').filter({ hasText: t });
check('dates card row: Sat, Oct 31 · 8 PM', (await row('Oct 31').textContent().catch(() => '')).includes('Sat, Oct 31 · 8 PM'), await row('Oct 31').textContent().catch(() => 'none'));
await row('Oct 31').getByRole('button').click();
const ds = p.locator('dialog[open]');
check('edit sheet: Oct 31 at 20:00', (await ds.getByLabel('Date').inputValue()) === '2026-10-31' && (await ds.getByLabel('Starts').inputValue()) === '20:00',
  `${await ds.getByLabel('Date').inputValue()} ${await ds.getByLabel('Starts').inputValue()}`);
check('edit sheet: says Detroit time', await ds.getByText('Detroit time', { exact: true }).isVisible());
await p.screenshot({ path: `${S}/timezones-admin-sheet.jpg` });
await ds.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 300);

// 4. A new date is on the series' clock: Nov 7 at 9:30 PM in Detroit (after
// the clocks go back, so EST: 02:30 UTC the next day).
await dates.getByRole('button', { name: 'Add date', exact: true }).click();
check('new date: says Detroit time', await ds.getByText('Detroit time', { exact: true }).isVisible());
await ds.getByLabel('Name').fill('Masquerade on the Runway: After Party');
await ds.getByLabel('Date').fill('2026-11-07');
await ds.getByLabel('Starts').fill('21:30');
await ds.getByLabel('Ticket link').fill('https://example.com/tickets/after-party');
await ds.getByRole('button', { name: 'Add date' }).click(); await settle(p, 400);
const rd = p.locator('dialog[open]');
await rd.getByLabel('Title').fill('The after party, upstairs');
await rd.getByRole('button', { name: 'Add reel' }).click(); await settle(p, 400);
check('new date row: Sat, Nov 7 · 9:30 PM', (await row('After Party').textContent().catch(() => '')).includes('Sat, Nov 7 · 9:30 PM'), await row('After Party').textContent().catch(() => 'none'));
await p.getByRole('region', { name: 'Publish' }).getByRole('button', { name: 'Publish' }).click(); await settle(p, 1500);
const pub = (await (await fetch(M + '/__state')).json()).publications.find(x => x.slug === 'masquerade')?.data;
const party = pub?.events?.find(e => e.name.endsWith('After Party'));
const night = pub?.events?.find(e => e.id === 'mr-2026');
check('saved: the right moment and zone', party?.startsAt === '2026-11-08T02:30:00.000Z' && party?.timeZone === 'America/Detroit', JSON.stringify(party));
check('saved: Oct 31 keeps its zone and moment', night?.timeZone === 'America/Detroit' && Date.parse(night?.startsAt) === Date.parse('2026-11-01T00:00:00Z'), JSON.stringify(night));

// 5. A visitor in London sees the new date on Detroit's clock too.
const { v, p: lp } = await visitor('Europe/London');
const circles = await lp.getByRole('listitem').allInnerTexts();
const nov = circles.find(t => /nov/i.test(t)) ?? '';
check('London: Nov 7 circle', /nov\s*7\b/i.test(nov), circles.join(' | ').replace(/\n/g, ' '));
const label = await lp.getByRole('button', { name: /After Party/ }).first().getAttribute('aria-label').catch(() => '');
check('London: spoken as Sat, Nov 7', (label ?? '').includes('Sat, Nov 7'), label);
await v.close();

await ctx.request.delete(B + '/api/admin/publish?slug=masquerade');
check('no page errors', errs.length === 0, errs.join(' | '));
console.log(res.join('\n')); console.log(res.filter(r => r.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASS');
await b.close();
