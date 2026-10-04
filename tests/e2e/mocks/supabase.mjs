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
});
let users = initialUsers();
// Like the database's manages_organizer and can_publish_funnel.
const managesOrganizer = (email, org) => Boolean(users[email]?.admin) && (users[email].slugs.includes('*') || users[email].organizers.includes(org));
const canPublishFunnel = (email, slug) => Boolean(users[email]?.admin) && (users[email].slugs.includes('*') || users[email].slugs.includes(slug) || users[email].organizers.includes(eventFunnels.get(slug)?.organizer_slug));
const publications = new Map(); // slug -> row
// What visitors did, like reel_events and leads (kept for funnel_stats).
const reelEvents = []; // { at, visitor, funnel, reel, event, tag }
const leadRows = []; // { at, funnel, intent, tag }
const files = new Map(); // path -> {type, body}
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
    if (p === '/__state') return json(res, 200, { publications: [...publications.values()], files: [...files.keys()], eventFunnels: [...eventFunnels.keys()] });
    if (p === '/__ttl') { accessTtl = Number(url.searchParams.get('s')); return json(res, 200, { ok: true }); }
    if (p === '/__reset') { seed(); publications.clear(); files.clear(); reelEvents.length = 0; leadRows.length = 0; users = initialUsers(); accessTtl = 3600; return json(res, 200, { ok: true }); }
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
    if (p === '/rest/v1/organizers' && req.method === 'GET') {
      return json(res, 200, [...organizers.values()].filter((o) => !eq('slug') || o.slug === eq('slug')));
    }
    // Test control: add an event straight to the table (a second organizer event, dated).
    if (p === '/__event' && req.method === 'POST') { eventFunnels.set(body.slug, body); return json(res, 201); }
    if (p === '/rest/v1/rpc/log_reel_event_v2') {
      reelEvents.push({ at: Date.now(), visitor: body.p_visitor_id, funnel: body.p_funnel_id, reel: body.p_reel_id, event: body.p_event, tag: body.p_source_tag ?? null });
      return json(res, 204);
    }
    if (p === '/rest/v1/rpc/submit_lead_v3') {
      leadRows.push({ at: Date.now(), funnel: body.p_funnel_id, intent: body.p_intent, tag: body.p_source_tag ?? null });
      return json(res, 204);
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
      });
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
      if (!email || avatar[1].split('/')[0] !== `user-${email.split('@')[0]}`) return json(res, 403, { message: 'new row violates row-level security policy' });
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
