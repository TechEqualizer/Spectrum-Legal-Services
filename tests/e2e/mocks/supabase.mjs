// A stand-in for Supabase (Auth, REST, Storage) for end-to-end tests.
import http from 'node:http';
const users = {
  'owner@example.com': { password: 'temp-password-1', admin: true, mustChange: true },
  'tester@example.com': { password: 'tester-pass-1', admin: true, mustChange: false },
  'stranger@example.com': { password: 'stranger-pass-1', admin: false, mustChange: false },
};
const publications = new Map(); // slug -> row
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
    if (p === '/__state') return json(res, 200, { publications: [...publications.values()], files: [...files.keys()] });
    if (p === '/__ttl') { accessTtl = Number(url.searchParams.get('s')); return json(res, 200, { ok: true }); }
    if (p === '/__reset') { publications.clear(); files.clear(); users['owner@example.com'].mustChange = true; users['owner@example.com'].password = 'temp-password-1'; accessTtl = 3600; return json(res, 200, { ok: true }); }
    let body = null;
    try { body = raw.length && (req.headers['content-type'] || '').includes('json') ? JSON.parse(raw) : null; } catch {}

    // Auth
    if (p === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password') {
        const u = users[body?.email];
        if (!u || u.password !== body.password) return json(res, 400, { error: 'invalid_grant' });
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
      if (req.method === 'PUT') {
        users[email].password = body.password;
        users[email].mustChange = body.data?.must_change_password ?? users[email].mustChange;
      }
      return json(res, 200, { email, user_metadata: { must_change_password: users[email].mustChange } });
    }
    if (p === '/auth/v1/logout') { sessions.delete((req.headers.authorization || '').replace('Bearer ', '')); return json(res, 204); }

    // REST
    if (p === '/rest/v1/admin_users') {
      const email = emailOf(req);
      return json(res, 200, email && users[email]?.admin ? [{ email, slugs: ['*'] }] : []);
    }
    if (p === '/rest/v1/funnel_publications') {
      const slug = (url.searchParams.get('slug') || '').replace('eq.', '') || body?.slug;
      if (req.method === 'GET') {
        const row = publications.get(slug);
        return json(res, 200, row ? [row] : []);
      }
      const email = emailOf(req);
      if (!email || !users[email]?.admin) return json(res, 403, { message: 'new row violates row-level security policy' });
      if (req.method === 'POST') { publications.set(body.slug, body); return json(res, 201); }
      if (req.method === 'DELETE') { publications.delete(slug); return json(res, 204); }
    }
    if (p.startsWith('/rest/v1/rpc/')) return json(res, 204);

    // Storage
    const sign = p.match(/^\/storage\/v1\/object\/upload\/sign\/reel-media\/(.+)$/);
    if (sign && req.method === 'POST') {
      const email = emailOf(req);
      if (!email || !users[email]?.admin) return json(res, 403, { message: 'denied' });
      return json(res, 200, { url: `/object/upload/sign/reel-media/${sign[1]}?token=t${++seq}` });
    }
    if (sign && req.method === 'PUT') {
      files.set(sign[1], { type: req.headers['content-type'], body: raw });
      return json(res, 200, { Key: sign[1] });
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
