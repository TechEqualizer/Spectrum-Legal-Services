// Fans, step 5: the calendar fans subscribe to. /f/<organizer>/calendar.ics
// lists every upcoming night of the organizer's events (no past ones),
// soonest first, each linking to its Showlnk link tagged ?src=calendar;
// /f/<event>/calendar.ics is one event's. The follow confirmation offers
// it for Apple, Google and Outlook.
import { chromium, settle, testNow } from '../browser.mjs';
import { addGoldenHour } from '../fixtures/golden-hour.mjs';
const B = 'http://localhost:3002'; const DB = 'http://localhost:54321'; const MAIL = 'http://localhost:54700';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const linkIn = (mail) => mail.text.match(/https?:\/\/\S+\/fans\/confirm\?token=[A-Za-z0-9_-]{43}/)?.[0];
const events = (ics) => ics.split('BEGIN:VEVENT').slice(1).map((v) => Object.fromEntries(v.split('\r\n').filter((l) => l.includes(':')).map((l) => [l.split(':')[0], l.slice(l.indexOf(':') + 1)])));

// Big Love: one night, Oct 31 at 8 PM Detroit time.
let r = await fetch(B + '/f/biglove/calendar.ics');
let ics = await r.text();
check('the organizer feed is a calendar', r.status === 200 && r.headers.get('content-type')?.startsWith('text/calendar') && ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'), `${r.status} ${r.headers.get('content-type')}`);
check('named for the organizer', ics.includes('X-WR-CALNAME:Big Love Productions'));
check('asks calendar apps to check back', ics.includes('REFRESH-INTERVAL;VALUE=DURATION:PT6H'));
check('cached for everyone (nothing personal in it)', r.headers.get('cache-control')?.includes('public'), r.headers.get('cache-control'));
let ev = events(ics);
check('the masquerade night', ev.length === 1 && ev[0].SUMMARY === 'Masquerade on the Runway' && ev[0].DTSTART === '20261101T000000Z', JSON.stringify(ev.map((e) => [e.SUMMARY, e.DTSTART])));
check('it links to the Showlnk link, tagged as the calendar', ev[0]?.URL === B + '/f/masquerade?src=calendar', ev[0]?.URL);
check('with a reminder', ics.includes('BEGIN:VALARM') && ics.includes('TRIGGER:-PT3H'));
check('an event link has its own feed', (await (await fetch(B + '/f/masquerade/calendar.ics')).text()).includes('SUMMARY:Masquerade on the Runway'));
check('nothing at an unknown link', (await fetch(B + '/f/no-such-organizer/calendar.ics')).status === 404);

// Several events, some nights past: only the upcoming ones, soonest first.
const ORG = 'gh-cal';
await fetch(DB + '/__organizer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: ORG, name: 'Golden Hour Sundays' }) });
const one = await addGoldenHour((g) => ({ ...g, slug: 'cal-sundays', id: 'cal-sundays' }), DB, ORG);
await addGoldenHour((g) => ({ ...g, slug: 'cal-sundays-two', id: 'cal-sundays-two', events: g.events.map((e) => ({ ...e, id: e.id + '-2', name: e.name + ' II' })) }), DB, ORG);
ics = await (await fetch(B + '/f/' + ORG + '/calendar.ics')).text();
ev = events(ics);
const now = testNow();
const toMs = (d) => Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13), +d.slice(13, 15));
const upcoming = one.events.filter((e) => Date.parse(e.startsAt) + 6 * 3600e3 > now).length;
check("every upcoming night of the organizer's events", ev.length === upcoming * 2, `${ev.length} vs ${upcoming * 2}`);
check('no past nights', ev.every((e) => toMs(e.DTSTART) + 6 * 3600e3 > now));
check('soonest first', ev.every((e, i) => i === 0 || toMs(ev[i - 1].DTSTART) <= toMs(e.DTSTART)));
check('each links to its own event', ev.some((e) => e.URL?.endsWith('/f/cal-sundays?src=calendar')) && ev.some((e) => e.URL?.endsWith('/f/cal-sundays-two?src=calendar')));
check('ids are unique', new Set(ev.map((e) => e.UID)).size === ev.length);

// The follow confirmation offers it.
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await fetch(B + '/api/fans/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'calendar.fan@example.com', organizer: 'biglove' }) });
await p.goto(linkIn((await (await fetch(MAIL + '/__emails')).json()).at(-1))); await settle(p, 500);
await p.getByRole('button', { name: 'Confirm and follow' }).click(); await p.waitForURL(/following=/); await settle(p, 500);
const section = p.getByRole('region', { name: 'Add every Big Love Productions night to your calendar' });
check('the confirmation offers the calendar', await section.isVisible());
const href = async (name) => section.getByRole('link', { name }).getAttribute('href');
check('Apple: a webcal subscription', (await href('Apple Calendar')) === 'webcal://localhost:3002/f/biglove/calendar.ics', await href('Apple Calendar'));
check('Google: subscribes to the same feed', (await href('Google Calendar')) === 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent('webcal://localhost:3002/f/biglove/calendar.ics'));
check('Outlook: the same feed', (await href('Outlook'))?.includes(encodeURIComponent('http://localhost:3002/f/biglove/calendar.ics')));
await p.screenshot({ path: 'calendar-feed-confirm-390.png', fullPage: true });
check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log(res.join('\n'));
