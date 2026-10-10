// A stand-in for Supabase (Auth, REST, Storage) for end-to-end tests.
import http from 'node:http';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Organizers and their events, from the same seed files the real database gets.
const seedDir = join(dirname(fileURLToPath(import.meta.url)), '../../../supabase/seed');
const organizers = new Map();
const eventFunnels = new Map(); // slug -> row
function seed() {
  organizers.clear(); eventFunnels.clear();
  for (const file of readdirSync(seedDir).filter((f) => f.endsWith('.json'))) {
    const { organizer, events } = JSON.parse(readFileSync(join(seedDir, file), 'utf8'));
    organizers.set(organizer.slug, organizer);
    for (const e of events) eventFunnels.set(e.slug, { ...e, organizer_slug: organizer.slug });
  }
}
seed();
const initialUsers = () => ({
  'owner@example.com': { password: 'temp-password-1', admin: true, mustChange: true, slugs: ['*'], organizers: [] },
  'tester@example.com': { password: 'tester-pass-1', admin: true, mustChange: false, slugs: ['*'], organizers: [] },
  // Runs Big Love Productions' events only.
  'organizer@example.com': { password: 'organizer-pass-1', admin: true, mustChange: false, slugs: [], organizers: ['biglove'] },
  'stranger@example.com': { password: 'stranger-pass-1', admin: false, mustChange: false },
  // Another business's admin: runs only the test-only Golden Hour event, never Big Love's.
  'rival@example.com': { password: 'rival-pass-1', admin: true, mustChange: false, slugs: ['sundays'], organizers: [] },
});
let users = initialUsers();
// Like the database's manages_organizer and can_publish_funnel.
const managesOrganizer = (email, org) => Boolean(users[email]?.admin) && (users[email].slugs.includes('*') || users[email].organizers.includes(org));
const canPublishFunnel = (email, slug) => Boolean(users[email]?.admin) && (users[email].slugs.includes('*') || users[email].slugs.includes(slug) || users[email].organizers.includes(eventFunnels.get(slug)?.organizer_slug));
const publications = new Map(); // slug -> row
const eventDates = new Map(); // funnel_id -> rows, like event_dates
// What visitors did, like reel_events and leads (kept for funnel_stats).
const reelEvents = []; // { at, visitor, funnel, reel, event, tag }
const leadRows = []; // { id, at, funnel, visitor, intent, tag, name, phone, email, caseType, message, reel }
const waitlist = new Map(); // email -> { email, instagram, source_tag, created_at }
const files = new Map(); // path -> {type, body}
// Eventbrite (server-only tables: like the real ones, the secret key alone reads and writes them).
const ebConnections = new Map(); // organizer_slug -> row
const ticketSales = new Map(); // eventbrite_order_id -> row
// Fans (server-only too): the fan_* functions below, like the database's.
const fans = new Map(); // id -> { id, email }
const follows = new Map(); // `${fanId}|${organizer}` -> row
const fanTokens = new Map(); // token_hash -> row
const signedFans = new Map(); // signed-address token -> { path, until }
const presales = new Map(); // funnel_id -> [{ funnel_id, date_id, url }], like event_presales
const sessions = new Map(); // token -> email
const refreshes = new Map(); // refresh -> email
let seq = 0;
const log = [];
let accessTtl = 3600;

function tokenFor(email) {
  const exp = Math.floor(Date.now() / 1000) + accessTtl;
  const payload = Buffer.from(JSON.stringify({ email, exp, n: ++seq })).toString('base64url');
  const at = `h.${payload}.s`;
  const rt = `rt-${seq}`;
  sessions.set(at, email); refreshes.set(rt, email);
  return { access_token: at, refresh_token: rt, expires_in: accessTtl, token_type: 'bearer', user: { email } };
}
const emailOf = (req) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const email = sessions.get(t);
  if (!email) return null;
  const exp = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).exp;
  return exp > Date.now() / 1000 ? email : null;
};
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': '*' };
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', ...cors }); res.end(body === undefined ? '' : JSON.stringify(body)); };

http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    log.push(`${req.method} ${p}${url.search}`);
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    // Test controls
    if (p === '/__log') return json(res, 200, log);
    if (p === '/__state') return json(res, 200, { publications: [...publications.values()], files: [...files.keys()], eventFunnels: [...eventFunnels.keys()], eventbriteConnections: [...ebConnections.values()], ticketSales: [...ticketSales.values()], eventDates: Object.fromEntries(eventDates), presales: Object.fromEntries(presales), fans: [...fans.values()], follows: [...follows.values()], fanTokens: [...fanTokens.values()] });
    // Test control: every pending sign-in link expires now.
    if (p === '/__fan-expire') { for (const t of fanTokens.values()) t.expires_at = Date.now() - 1000; return json(res, 200, { ok: true }); }
    if (p === '/__ttl') { accessTtl = Number(url.searchParams.get('s')); return json(res, 200, { ok: true }); }
    if (p === '/__reset') { seed(); publications.clear(); eventDates.clear(); files.clear(); reelEvents.length = 0; leadRows.length = 0; waitlist.clear(); ebConnections.clear(); ticketSales.clear(); fans.clear(); follows.clear(); fanTokens.clear(); signedFans.clear(); presales.clear(); users = initialUsers(); accessTtl = 3600; return json(res, 200, { ok: true }); }
    let body = null;
    try { body = raw.length && (req.headers['content-type'] || '').includes('json') ? JSON.parse(raw) : null; } catch {}

    // Auth admin (the secret key only): list, create and reset logins.
    if (p.startsWith('/auth/v1/admin/users')) {
      if (req.headers.apikey !== 'test-secret') return json(res, 401, { msg: 'secret key required' });
      const idOf = (e) => `user-${e.split('@')[0]}`;
      const withLogin = Object.keys(users).filter((e) => users[e].password);
      if (req.method === 'GET') return json(res, 200, { users: withLogin.map((e) => ({ id: idOf(e), email: e, last_sign_in_at: users[e].lastSignIn ?? null })) });
      if (req.method === 'POST') {
        if (users[body.email]?.password) return json(res, 422, { code: 'email_exists', msg: 'A user with this email address has already been registered' });
        users[body.email] = { admin: false, slugs: [], organizers: [], ...users[body.email], password: body.password, mustChange: Boolean(body.user_metadata?.must_change_password) };
        return json(res, 200, { id: idOf(body.email), email: body.email });
      }
      if (req.method === 'PUT') {
        const email = withLogin.find((e) => p.endsWith('/' + idOf(e)));
        if (!email) return json(res, 404, { msg: 'not found' });
        users[email].password = body.password;
        users[email].mustChange = Boolean(body.user_metadata?.must_change_password);
        return json(res, 200, { id: idOf(email), email });
      }
    }
    // Auth
    if (p === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password') {
        const u = users[body?.email];
        if (!u || u.password !== body.password) return json(res, 400, { error: 'invalid_grant' });
        u.lastSignIn = new Date().toISOString();
        return json(res, 200, tokenFor(body.email));
      }
      const email = refreshes.get(body?.refresh_token);
      if (!email) return json(res, 400, { error: 'invalid_grant' });
      refreshes.delete(body.refresh_token);
      return json(res, 200, tokenFor(email));
    }
    if (p === '/auth/v1/user') {
      const email = emailOf(req);
      if (!email) return json(res, 401, { msg: 'invalid token' });
      const u = users[email];
      if (req.method === 'PUT') {
        if (body.password) u.password = body.password;
        u.mustChange = body.data?.must_change_password ?? u.mustChange;
        // Like Supabase: data merges into user_metadata; null clears a key.
        u.meta = { ...u.meta, ...Object.fromEntries(Object.entries(body.data ?? {}).filter(([k]) => k !== 'must_change_password')) };
      }
      return json(res, 200, { id: `user-${email.split('@')[0]}`, email, user_metadata: { must_change_password: u.mustChange, ...u.meta } });
    }
    if (p === '/auth/v1/logout') { sessions.delete((req.headers.authorization || '').replace('Bearer ', '')); return json(res, 204); }

    // REST
    // Like the real policies: everyone reads their own row; full admins read
    // and manage everyone's, but never change or remove their own.
    if (p === '/rest/v1/admin_users') {
      const email = emailOf(req);
      const me = email && users[email]?.admin ? users[email] : null;
      const full = Boolean(me?.slugs.includes('*'));
      const rowOf = (e) => ({ email: e, slugs: users[e].slugs, organizers: users[e].organizers, created_at: users[e].created ?? '2026-10-01T00:00:00Z' });
      const target = (url.searchParams.get('email') || '').replace(/^eq\./, '');
      if (req.method === 'GET') {
        const visible = Object.keys(users).filter((e) => users[e].admin && (e === email || full));
        return json(res, 200, visible.filter((e) => !target || e === target).map(rowOf));
      }
      if (!full) return json(res, 403, { message: 'new row violates row-level security policy' });
      if (req.method === 'POST') {
        if (body.email === email) return json(res, 403, { message: 'new row violates row-level security policy' });
        users[body.email] = { password: null, mustChange: true, ...users[body.email], admin: true, slugs: body.slugs, organizers: body.organizers, created: users[body.email]?.created ?? new Date().toISOString() };
        return json(res, 201);
      }
      if (req.method === 'DELETE') {
        if (target === email) return json(res, 204);
        if (users[target]) users[target].admin = false;
        return json(res, 204);
      }
    }
    // Like set_event_presales / event_presales_for: an event's presale links, for its admins only.
    if (p === '/rest/v1/rpc/set_event_presales' || p === '/rest/v1/rpc/event_presales_for') {
      const email = emailOf(req);
      if (!email || !canPublishFunnel(email, body.p_slug)) return json(res, 403, { code: '42501', message: 'not allowed' });
      const ef = eventFunnels.get(body.p_slug);
      if (p.endsWith('event_presales_for')) return json(res, 200, ef ? (presales.get(ef.funnel_id) ?? []).map((r) => ({ date_id: r.date_id, url: r.url })) : []);
      if (!ef) return json(res, 200, 0);
      if (body.p_presales.some((x) => !/^https:\/\//.test(x.url))) return json(res, 400, { code: '23514', message: 'check constraint' });
      presales.set(ef.funnel_id, body.p_presales.map((x) => ({ funnel_id: ef.funnel_id, date_id: x.dateId, url: x.url })));
      return json(res, 200, body.p_presales.length);
    }
    // The table itself: the secret key only.
    if (p === '/rest/v1/event_presales') {
      if (req.headers.apikey !== 'test-secret' || req.headers.authorization !== 'Bearer test-secret') return json(res, 401, { code: '42501', message: 'permission denied for table event_presales' });
      return json(res, 200, presales.get((url.searchParams.get('funnel_id') || '').replace(/^eq\./, '')) ?? []);
    }
    // Like set_event_dates: an event's dates as rows, for an admin who may publish it.
    if (p === '/rest/v1/rpc/set_event_dates') {
      const email = emailOf(req);
      if (!email || !canPublishFunnel(email, body.p_slug)) return json(res, 403, { code: '42501', message: 'not allowed' });
      const ef = eventFunnels.get(body.p_slug);
      if (!ef) return json(res, 200, 0);
      eventDates.set(ef.funnel_id, body.p_dates.map((d) => ({ funnel_id: ef.funnel_id, id: d.id, name: d.name, starts_at: new Date(d.startsAt).toISOString(), starts_at_text: d.startsAt, time_zone: d.timeZone ?? null, venue: d.venue ?? null, price: d.price ?? null, ticket_url: d.ticketUrl, eb_event_id: d.ebEventId ?? null, status: d.status ?? null, opening_reel_id: d.reelId ?? null })));
      return json(res, 200, body.p_dates.length);
    }
    if (p === '/rest/v1/funnel_publications') {
      const slug = (url.searchParams.get('slug') || '').replace('eq.', '') || body?.slug;
      if (req.method === 'GET') {
        const row = publications.get(slug);
        return json(res, 200, row ? [row] : []);
      }
      const email = emailOf(req);
      if (!email || !canPublishFunnel(email, slug)) return json(res, 403, { message: 'new row violates row-level security policy' });
      if (req.method === 'POST') { publications.set(body.slug, body); return json(res, 201); }
      if (req.method === 'DELETE') { publications.delete(slug); return json(res, 204); }
    }
    const eq = (k) => (url.searchParams.get(k) || '').replace(/^eq\./, '');
    if (p === '/rest/v1/event_funnels' && req.method === 'GET') {
      const rows = [...eventFunnels.values()].filter((r) => (!eq('slug') || r.slug === eq('slug')) && (!eq('funnel_id') || r.funnel_id === eq('funnel_id')) && (!eq('organizer_slug') || r.organizer_slug === eq('organizer_slug')));
      return json(res, 200, rows.sort((a, b) => a.slug.localeCompare(b.slug)));
    }
    // Like the real policy: an organizer's admins add its events.
    if (p === '/rest/v1/event_funnels' && req.method === 'POST') {
      const email = emailOf(req);
      if (!email || !managesOrganizer(email, body.organizer_slug)) return json(res, 403, { message: 'new row violates row-level security policy' });
      if (eventFunnels.has(body.slug) || [...eventFunnels.values()].some((r) => r.funnel_id === body.funnel_id)) return json(res, 409, { message: 'duplicate key' });
      if (!organizers.has(body.organizer_slug)) return json(res, 409, { message: 'foreign key' });
      eventFunnels.set(body.slug, { slug: body.slug, funnel_id: body.funnel_id, organizer_slug: body.organizer_slug, data: body.data });
      return json(res, 201);
    }
    // Like the real policy: only full admins add organizers (clients).
    if (p === '/rest/v1/organizers' && req.method === 'POST') {
      const email = emailOf(req);
      if (!email || !users[email]?.admin || !users[email].slugs.includes('*')) return json(res, 403, { message: 'new row violates row-level security policy' });
      if (organizers.has(body.slug)) return json(res, 409, { message: 'duplicate key' });
      organizers.set(body.slug, { slug: body.slug, name: body.name });
      return json(res, 201);
    }
    if (p === '/rest/v1/organizers' && req.method === 'GET') {
      return json(res, 200, [...organizers.values()].filter((o) => !eq('slug') || o.slug === eq('slug')));
    }
    // Test control: add an organizer straight to the table (a test-only one, e.g. Golden Hour's).
    if (p === '/__organizer' && req.method === 'POST') { organizers.set(body.slug, { slug: body.slug, name: body.name }); return json(res, 201); }
    // Test control: add an event straight to the table (a second organizer event, dated).
    if (p === '/__event' && req.method === 'POST') { eventFunnels.set(body.slug, body); return json(res, 201); }
    // Test control: visitors' past reel events, dated `daysAgo` days back (for results over several periods).
    if (p === '/__reel-events' && req.method === 'POST') {
      for (const e of body) reelEvents.push({ at: Date.now() - (e.daysAgo ?? 0) * 864e5, visitor: e.visitor ?? `visitor-${++seq}`, funnel: e.funnel, reel: e.reel, event: e.event, tag: e.tag ?? null });
      return json(res, 201);
    }
    if (p === '/rest/v1/rpc/log_reel_event_v2') {
      reelEvents.push({ at: Date.now(), visitor: body.p_visitor_id, funnel: body.p_funnel_id, reel: body.p_reel_id, event: body.p_event, tag: body.p_source_tag ?? null });
      return json(res, 204);
    }
    // The fan_* functions: like the database's, callable with the secret key only.
    if (p.startsWith('/rest/v1/rpc/fan_')) {
      if (req.headers.apikey !== 'test-secret' || req.headers.authorization !== 'Bearer test-secret') return json(res, 401, { code: '42501', message: `permission denied for function ${p.split('/').pop()}` });
      const fn = p.split('/').pop();
      const now = Date.now();
      const hour = (rows) => rows.filter((t) => t.created_at > now - 3600e3).length;
      if (fn === 'fan_start') {
        const email = String(body.p_email).trim().toLowerCase();
        if (!organizers.has(body.p_organizer)) return json(res, 200, 'unknown_organizer');
        const all = [...fanTokens.values()];
        if (hour(all.filter((t) => t.email === email)) >= 3 || (body.p_ip_hash && hour(all.filter((t) => t.ip_hash === body.p_ip_hash)) >= 10)) return json(res, 200, 'rate_limited');
        fanTokens.set(body.p_token_hash, { token_hash: body.p_token_hash, email, organizer_slug: body.p_organizer, source_tag: body.p_source_tag || null, funnel_id: body.p_funnel_id || null, consent_text: body.p_consent_text, ip_hash: body.p_ip_hash ?? null, created_at: now, expires_at: now + 20 * 60e3, used_at: null });
        return json(res, 200, 'ok');
      }
      const status = (t) => (t.used_at ? 'used' : t.expires_at <= now ? 'expired' : 'valid');
      if (fn === 'fan_token_info') {
        const t = fanTokens.get(body.p_token_hash);
        return json(res, 200, t ? [{ organizer_slug: t.organizer_slug, email: t.email, status: status(t) }] : []);
      }
      if (fn === 'fan_confirm') {
        const t = fanTokens.get(body.p_token_hash);
        if (!t || status(t) !== 'valid') return json(res, 200, []);
        t.used_at = now;
        let fan = [...fans.values()].find((f) => f.email === t.email);
        if (!fan) { fan = { id: crypto.randomUUID(), email: t.email }; fans.set(fan.id, fan); }
        const key = `${fan.id}|${t.organizer_slug}`;
        const had = follows.get(key);
        if (!had || had.unfollowed_at) follows.set(key, { fan_id: fan.id, organizer_slug: t.organizer_slug, source_tag: t.source_tag, funnel_id: t.funnel_id, consent_text: t.consent_text, confirmed_at: now, unfollowed_at: null });
        return json(res, 200, [{ fan_id: fan.id, organizer_slug: t.organizer_slug }]);
      }
      if (fn === 'fan_following') return json(res, 200, [...follows.values()].filter((f) => f.fan_id === body.p_fan_id && !f.unfollowed_at).map((f) => f.organizer_slug).sort());
      if (fn === 'fan_unfollow') {
        const f = follows.get(`${body.p_fan_id}|${body.p_organizer}`);
        if (!f || f.unfollowed_at) return json(res, 200, false);
        f.unfollowed_at = now;
        return json(res, 200, true);
      }
      if (fn === 'fan_forget') {
        const fan = fans.get(body.p_fan_id);
        if (!fan) return json(res, 200, false);
        fans.delete(fan.id);
        for (const [k, f] of follows) if (f.fan_id === fan.id) follows.delete(k);
        for (const [k, t] of fanTokens) if (t.email === fan.email) fanTokens.delete(k);
        return json(res, 200, true);
      }
      return json(res, 404, { message: `no function ${fn}` });
    }
    // Eventbrite's tables: RLS on with no policies and no grants, so only the secret key (service role) gets in.
    if (p === '/rest/v1/eventbrite_connections' || p === '/rest/v1/ticket_sales') {
      if (req.headers.apikey !== 'test-secret' || req.headers.authorization !== 'Bearer test-secret') return json(res, 401, { code: '42501', message: `permission denied for table ${p.split('/').pop()}` });
      const table = p.endsWith('eventbrite_connections') ? ebConnections : ticketSales;
      const keyCol = table === ebConnections ? 'organizer_slug' : 'eventbrite_order_id';
      const filters = [...url.searchParams].filter(([k, v]) => !['select', 'on_conflict', 'limit', 'order'].includes(k) && v.startsWith('eq.')).map(([k, v]) => [k, v.slice(3)]);
      const match = (r) => filters.every(([k, v]) => String(r[k]) === v);
      if (req.method === 'GET') {
        const cols = (url.searchParams.get('select') || '*').split(',');
        const rows = [...table.values()].filter(match).map((r) => (cols.includes('*') ? r : Object.fromEntries(cols.map((c) => [c, r[c]]))));
        return json(res, 200, rows);
      }
      if (req.method === 'POST') {
        const merge = (req.headers.prefer || '').includes('resolution=merge-duplicates');
        for (const row of Array.isArray(body) ? body : [body]) {
          if (table.has(row[keyCol]) && !merge) return json(res, 409, { code: '23505', message: 'duplicate key' });
          if (table === ebConnections) {
            if (!organizers.has(row.organizer_slug)) return json(res, 409, { code: '23503', message: 'foreign key' });
            if (row.webhook_id && [...ebConnections.values()].some((c) => c.webhook_id === row.webhook_id && c.organizer_slug !== row.organizer_slug)) return json(res, 409, { code: '23505', message: 'duplicate webhook_id' });
          } else if (!['placed', 'refunded', 'cancelled'].includes(row.status) || !/^[0-9]{1,30}$/.test(row.eventbrite_order_id) || !row.funnel_id) {
            return json(res, 400, { code: '23514', message: 'check constraint' });
          }
          table.set(row[keyCol], { ...table.get(row[keyCol]), ...row });
        }
        return json(res, 201);
      }
      if (req.method === 'PATCH') {
        for (const r of [...table.values()].filter(match)) table.set(r[keyCol], { ...r, ...body });
        return json(res, 204);
      }
      if (req.method === 'DELETE') {
        for (const r of [...table.values()].filter(match)) table.delete(r[keyCol]);
        return json(res, 204);
      }
    }
    // Like the real join_waitlist: one row per email, the handle updated.
    if (p === '/rest/v1/rpc/join_waitlist') {
      const email = String(body.p_email).trim().toLowerCase();
      const prev = waitlist.get(email);
      waitlist.set(email, { email, instagram: body.p_instagram ?? prev?.instagram ?? null, source_tag: prev ? prev.source_tag : body.p_source_tag ?? null, created_at: prev?.created_at ?? new Date().toISOString() });
      return json(res, 204);
    }
    // Like the real policy: full admins read the waitlist.
    if (p === '/rest/v1/waitlist' && req.method === 'GET') {
      const email = emailOf(req);
      if (!email || !users[email]?.admin || !users[email].slugs.includes('*')) return json(res, 200, []);
      return json(res, 200, [...waitlist.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    // Like the real submit_lead_v3: stores the lead (trimmed) and returns its id.
    if (p === '/rest/v1/rpc/submit_lead_v3') {
      const blank = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
      const id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
      leadRows.push({
        id, at: Date.now(), funnel: body.p_funnel_id ?? null, visitor: body.p_visitor_id ?? null,
        intent: body.p_intent ?? 'book', tag: body.p_source_tag ?? null,
        name: String(body.p_name).trim(), phone: blank(body.p_phone), email: blank(body.p_email)?.toLowerCase() ?? null,
        caseType: body.p_case_type, message: blank(body.p_message), reel: body.p_referring_reel_id ?? null,
      });
      return json(res, 200, id);
    }
    // Like the real funnel_leads: an event's leads, newest first (at most 500), for its admins only,
    // each with the reels that visitor watched to the end before asking. Never the visitor id.
    if (p === '/rest/v1/rpc/funnel_leads') {
      const email = emailOf(req);
      if (!email || !canPublishFunnel(email, body.p_slug)) return json(res, 403, { message: 'not your event' });
      const funnel = eventFunnels.get(body.p_slug)?.funnel_id;
      if (!funnel) return json(res, 200, null);
      const leads = leadRows.filter((l) => l.funnel === funnel).sort((a, b) => b.at - a.at).slice(0, 500);
      return json(res, 200, leads.map((l) => {
        const firsts = new Map();
        for (const e of reelEvents) {
          if (!l.visitor || e.visitor !== l.visitor || e.funnel !== funnel || e.event !== 'completed' || e.at > l.at) continue;
          if (!firsts.has(e.reel) || e.at < firsts.get(e.reel)) firsts.set(e.reel, e.at);
        }
        return {
          id: l.id, created_at: new Date(l.at).toISOString(), name: l.name, phone: l.phone, email: l.email,
          intent: l.intent, case_type: l.caseType, message: l.message, referring_reel_id: l.reel, source_tag: l.tag,
          watched: [...firsts].sort((a, b) => a[1] - b[1]).map(([reel]) => reel),
        };
      }));
    }
    // Like the real funnel_stats: an event's totals, for its admins only.
    if (p === '/rest/v1/rpc/funnel_stats') {
      const email = emailOf(req);
      if (![7, 30, 90].includes(body.p_days)) return json(res, 400, { message: 'days' });
      if (!email || !canPublishFunnel(email, body.p_slug)) return json(res, 403, { message: 'not your event' });
      const funnel = eventFunnels.get(body.p_slug)?.funnel_id;
      if (!funnel) return json(res, 200, null);
      const since = Date.now() - body.p_days * 864e5;
      const before = Date.now() - 2 * body.p_days * 864e5;
      const mine = reelEvents.filter((e) => e.funnel === funnel);
      const count = (list) => list.reduce((o, e) => ({ ...o, [e.event]: (o[e.event] ?? 0) + 1 }), {});
      const now = mine.filter((e) => e.at >= since);
      const day = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: body.p_tz });
      const group = (list, key) => list.reduce((m, e) => m.set(key(e), [...(m.get(key(e)) ?? []), e]), new Map());
      return json(res, 200, {
        current: count(now),
        previous: count(mine.filter((e) => e.at >= before && e.at < since)),
        daily: [...group(now.filter((e) => e.event === 'viewed'), (e) => day(e.at))].map(([date, l]) => ({ date, views: l.length })),
        reels: [...group(now, (e) => `${e.reel}|${e.event}`)].map(([k, l]) => ({ reel: k.split('|')[0], event: k.split('|')[1], n: l.length })),
        sources: [...group(now, (e) => e.tag)].map(([tag, l]) => ({ tag, visitors: new Set(l.map((e) => e.visitor)).size, tickets: l.filter((e) => e.event === 'cta_clicked').length, calls: l.filter((e) => e.event === 'call_clicked').length })),
        updates: [...group(leadRows.filter((l) => l.funnel === funnel && l.intent === 'text_later' && l.at >= since), (l) => l.tag)].map(([tag, l]) => ({ tag, n: l.length })),
        // Eventbrite: tickets sold (placed orders' quantity), by source, and whether the organizer is connected.
        ...(() => {
          const placed = [...ticketSales.values()].filter((s) => s.funnel_id === funnel && s.status === 'placed');
          const at = (s) => Date.parse(s.ordered_at);
          const sum = (list) => list.reduce((n, s) => n + s.quantity, 0);
          const nowSales = placed.filter((s) => at(s) >= since);
          return {
            sold: { current: sum(nowSales), previous: sum(placed.filter((s) => at(s) >= before && at(s) < since)) },
            sales: [...group(nowSales, (s) => s.source_tag)].map(([tag, l]) => ({ tag, n: sum(l) })).filter((s) => s.n > 0),
            eventbrite: ebConnections.has(eventFunnels.get(body.p_slug)?.organizer_slug),
          };
        })(),
      });
    }
    // Like the real set_organizer_avatar: the organizer's admins, a photo from its own folder.
    if (p === '/rest/v1/rpc/set_organizer_avatar') {
      const email = emailOf(req);
      if (!email || !managesOrganizer(email, body.p_organizer)) return json(res, 403, { message: 'Only this organizer\'s admins can change its photo.' });
      if (body.p_url !== null && !body.p_url.includes(`/storage/v1/object/public/avatars/organizers/${body.p_organizer}/`)) return json(res, 400, { message: 'not its folder' });
      const o = organizers.get(body.p_organizer);
      if (!o) return json(res, 404, { message: 'No such organizer.' });
      organizers.set(o.slug, { ...o, avatar_url: body.p_url });
      return json(res, 204);
    }
    if (p.startsWith('/rest/v1/rpc/')) return json(res, 204);

    // Storage
    const sign = p.match(/^\/storage\/v1\/object\/upload\/sign\/reel-media\/(.+)$/);
    if (sign && req.method === 'POST') {
      const email = emailOf(req);
      if (!email || !canPublishFunnel(email, sign[1].split('/')[0])) return json(res, 403, { message: 'denied' });
      return json(res, 200, { url: `/object/upload/sign/reel-media/${sign[1]}?token=t${++seq}` });
    }
    if (sign && req.method === 'PUT') {
      files.set(sign[1], { type: req.headers['content-type'], body: raw });
      return json(res, 200, { Key: sign[1] });
    }
    // Profile photos: each admin writes only their own folder (like the avatars policies).
    const avatar = p.match(/^\/storage\/v1\/object\/avatars\/(.+)$/);
    if (avatar && (req.method === 'POST' || req.method === 'DELETE')) {
      const email = emailOf(req);
      const [folder, sub] = avatar[1].split('/');
      const allowed = folder === 'organizers' ? managesOrganizer(email, sub) : folder === `user-${email?.split('@')[0]}`;
      if (!email || !allowed) return json(res, 403, { message: 'new row violates row-level security policy' });
      if (req.method === 'DELETE') { files.delete('avatars/' + avatar[1]); return json(res, 200, {}); }
      files.set('avatars/' + avatar[1], { type: req.headers['content-type'], body: raw });
      return json(res, 200, { Key: 'avatars/' + avatar[1] });
    }
    const avatarPub = p.match(/^\/storage\/v1\/object\/public\/avatars\/(.+)$/);
    if (avatarPub) {
      const f = files.get('avatars/' + avatarPub[1]);
      if (!f) return json(res, 404, { message: 'not found' });
      res.writeHead(200, { 'Content-Type': f.type, ...cors });
      return res.end(f.body);
    }
    // The private bucket for fans-only reels: admins upload to their events' folders;
    // only the secret key signs addresses, and only a signed address reads a file.
    const fansSign = p.match(/^\/storage\/v1\/object\/upload\/sign\/reel-media-fans\/(.+)$/);
    if (fansSign && req.method === 'POST') {
      const email = emailOf(req);
      if (!email || !canPublishFunnel(email, fansSign[1].split('/')[0])) return json(res, 403, { message: 'new row violates row-level security policy' });
      return json(res, 200, { url: `/object/upload/sign/reel-media-fans/${fansSign[1]}?token=t${++seq}` });
    }
    if (fansSign && req.method === 'PUT') {
      files.set('fans/' + fansSign[1], { type: req.headers['content-type'], body: raw });
      return json(res, 200, { Key: 'reel-media-fans/' + fansSign[1] });
    }
    if (p === '/storage/v1/object/sign/reel-media-fans' && req.method === 'POST') {
      if (req.headers.apikey !== 'test-secret' || req.headers.authorization !== 'Bearer test-secret') return json(res, 400, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
      return json(res, 200, body.paths.map((path) => {
        if (!files.has('fans/' + path)) return { path, signedURL: null, error: 'Either the requested resource does not exist or you do not have access to it' };
        const token = `s${++seq}`;
        signedFans.set(token, { path, until: Date.now() + body.expiresIn * 1000 });
        return { path, signedURL: `/object/sign/reel-media-fans/${path}?token=${token}`, error: null };
      }));
    }
    const fansGet = p.match(/^\/storage\/v1\/object\/sign\/reel-media-fans\/(.+)$/);
    if (fansGet && req.method === 'GET') {
      const t = signedFans.get(url.searchParams.get('token') ?? '');
      if (!t || t.path !== fansGet[1] || t.until < Date.now()) return json(res, 400, { statusCode: '400', error: 'InvalidJWT', message: 'invalid signature' });
      const f = files.get('fans/' + fansGet[1]);
      if (!f) return json(res, 404, { message: 'not found' });
      res.writeHead(200, { 'Content-Type': f.type, 'Accept-Ranges': 'bytes', ...cors });
      return res.end(f.body);
    }
    // Like the real private bucket: there's no public address.
    if (/^\/storage\/v1\/object\/(public\/)?reel-media-fans\//.test(p)) return json(res, 400, { statusCode: '404', error: 'not_found', message: 'Bucket not found' });
    // Test control: a file straight into the private bucket.
    if (p === '/__fan-file' && req.method === 'POST') { files.set('fans/' + url.searchParams.get('path'), { type: req.headers['content-type'] || 'video/mp4', body: raw }); return json(res, 201); }
    const pub = p.match(/^\/storage\/v1\/object\/public\/reel-media\/(.+)$/);
    if (pub) {
      const f = files.get(pub[1]);
      if (!f) return json(res, 404, { message: 'not found' });
      res.writeHead(200, { 'Content-Type': f.type, 'Accept-Ranges': 'bytes', ...cors });
      return res.end(f.body);
    }
    json(res, 404, { message: 'mock: unknown ' + p });
  });
}).listen(54321, () => console.log('mock supabase on 54321'));
