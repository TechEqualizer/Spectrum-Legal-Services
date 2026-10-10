// Event dates as rows (event_dates): publishing writes an event's dates as
// visitors see them, one row each, with Eventbrite's event id from the
// ticket link; taking the edits down puts back the built dates; only an
// admin who may publish the event can write them.
import { chromium } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const SB = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const b = await chromium.launch();
const admin = await b.newContext({ storageState: S + '/auth.json' });
const rows = async () => (await (await fetch(`${SB}/__state`)).json()).eventDates['masquerade-v1'] ?? [];

const reels = [{ id: 'mr-masks-on', title: 'Masks on. Secrets revealed.', summary: 'x', practiceArea: 'The night', cta: 'funnel', eventId: 'mr-2026' }];
const base = { version: 1, reels, funnel: { order: reels.map((r) => r.id), topics: {}, paths: {}, primaryCta: 'tickets' } };
const dates = [
  { id: 'mr-2026', name: 'Masquerade on the Runway', startsAt: '2026-10-31T20:00:00-04:00', timeZone: 'America/Detroit', venue: '1600 East Grand Blvd, Detroit', price: 'From $31', ticketUrl: 'https://www.eventbrite.com/e/masquerade-on-the-runway-tickets-1998119183265', status: 'few_left' },
  { id: 'after', name: 'Masquerade: After Party', startsAt: '2026-11-01T01:30:00-04:00', timeZone: 'America/Detroit', ticketUrl: 'https://example.com/after' },
];
const pub = await admin.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade', publication: { ...base, events: dates } } });
check('published', pub.ok(), String(pub.status()));
let r = await rows();
check('one row per date', r.length === 2 && r.map((x) => x.id).sort().join() === 'after,mr-2026', JSON.stringify(r.map((x) => x.id)));
const mr = r.find((x) => x.id === 'mr-2026');
check('Eventbrite id from the ticket link', mr?.eb_event_id === '1998119183265', mr?.eb_event_id);
check('no Eventbrite id for other ticket sites', r.find((x) => x.id === 'after')?.eb_event_id === null);
check('status and zone kept', mr?.status === 'few_left' && mr?.time_zone === 'America/Detroit', JSON.stringify(mr));
check('the moment, and the text it was written as', mr?.starts_at === '2026-11-01T00:00:00.000Z' && typeof mr?.starts_at_text === 'string', `${mr?.starts_at} ${mr?.starts_at_text}`);

// Taken down: back to the built date.
const down = await admin.request.delete(B + '/api/admin/publish?slug=masquerade');
check('taken down', down.ok(), String(down.status()));
r = await rows();
check('back to the built dates', r.length === 1 && r[0].id === 'mr-2026' && r[0].status === null, JSON.stringify(r.map((x) => [x.id, x.status])));

// Someone who may not publish Big Love's event can't write its dates.
const rival = await b.newContext();
const login = await rival.request.post(B + '/api/admin/login', { data: { email: 'rival@example.com', password: 'rival-pass-1' } });
const tried = await rival.request.post(B + '/api/admin/publish', { data: { slug: 'masquerade', publication: { ...base, events: [] } } });
check('others refused', login.ok() && tried.status() === 403 && (await rows()).length === 1, `${login.status()} ${tried.status()}`);

await b.close();
console.log(res.join('\n'));
