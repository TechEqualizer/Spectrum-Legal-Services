// A stand-in for Eventbrite (OAuth and the v3 API) for end-to-end tests.
//
// OAuth (www.eventbrite.com):
//   GET  /oauth/authorize   signs the test account in at once and redirects
//                           back with ?code&state (or ?error=access_denied
//                           after POST /__deny)
//   POST /oauth/token       form: code, client_id, client_secret, grant_type,
//                           redirect_uri -> { access_token }
// API (www.eventbriteapi.com/v3), Bearer token:
//   GET    /v3/users/me/, /v3/users/me/organizations/, /v3/events/{id}/
//   POST   /v3/organizations/{org}/webhooks/   (then pings it, like Eventbrite)
//   DELETE /v3/webhooks/{id}/
//   GET    /v3/orders/{id}/?expand=attendees
//   GET    /v3/events/{id}/orders/?expand=attendees&continuation=  (2 per page)
// Test controls:
//   POST /__orders   [order, ...]  adds or replaces orders (Eventbrite's shape)
//   POST /__fire     { order_id, action }  delivers a webhook for that order
//                    to every webhook we hold, like Eventbrite; answers the
//                    app's statuses. Or { endpoint, body } to deliver any body.
//   POST /__deny     the next authorize is refused by the "organizer"
//   GET  /__state    tokens, webhooks, orders, last token request
//   POST /__reset
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.EB_MOCK_PORT || 54600);
const BASE = `http://localhost:${PORT}`;
export const CLIENT_ID = 'test-eb-client';
export const CLIENT_SECRET = 'test-eb-secret';

// The account that signs in: two organizations; Big Love's event belongs to the second.
const USER = { id: '1001', name: 'Big Love Owner' };
const ORGS = [
  { id: '2000', name: 'Personal events' },
  { id: '2001', name: 'Big Love Productions' },
];
const EVENTS = { '1998119183265': { id: '1998119183265', organization_id: '2001' } };

let codes, tokens, webhooks, orders, deny, seq, lastToken, deliveries;
function reset() {
  codes = new Map(); // code -> { redirect_uri }
  tokens = new Set();
  webhooks = new Map(); // id -> { id, org, endpoint_url, actions }
  orders = new Map(); // id -> order
  deny = false;
  seq = 0;
  lastToken = null;
  deliveries = [];
}
reset();

const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
const authed = (req) => tokens.has((req.headers.authorization || '').replace(/^Bearer /, ''));

async function deliver(endpoint, body) {
  try {
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    deliveries.push({ endpoint, status: r.status });
    return r.status;
  } catch (e) {
    deliveries.push({ endpoint, error: String(e) });
    return 0;
  }
}

http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(chunks).toString();
    const url = new URL(req.url, BASE);
    const p = url.pathname;
    let body = null;
    if ((req.headers['content-type'] || '').includes('json')) { try { body = JSON.parse(raw); } catch {} }
    else if ((req.headers['content-type'] || '').includes('x-www-form-urlencoded')) body = Object.fromEntries(new URLSearchParams(raw));

    // Test controls
    if (p === '/__reset') { reset(); return json(res, 200, { ok: true }); }
    if (p === '/__state') return json(res, 200, { tokens: [...tokens], webhooks: [...webhooks.values()], orders: [...orders.keys()], lastToken, deliveries });
    if (p === '/__deny') { deny = true; return json(res, 200, { ok: true }); }
    if (p === '/__orders' && req.method === 'POST') {
      for (const o of body) orders.set(String(o.id), { status: 'placed', created: new Date().toISOString(), ...o, id: String(o.id) });
      return json(res, 201, { ok: true });
    }
    if (p === '/__fire' && req.method === 'POST') {
      if (body.endpoint) return json(res, 200, { statuses: [await deliver(body.endpoint, body.body)] });
      const statuses = [];
      for (const w of webhooks.values()) {
        statuses.push(await deliver(w.endpoint_url, {
          api_url: `${BASE}/v3/orders/${body.order_id}/`,
          config: { action: body.action ?? 'order.placed', user_id: USER.id, webhook_id: w.id, endpoint_url: w.endpoint_url },
        }));
      }
      return json(res, 200, { statuses });
    }

    // OAuth
    if (p === '/oauth/authorize') {
      const redirect = new URL(url.searchParams.get('redirect_uri'));
      if (url.searchParams.get('client_id') !== CLIENT_ID || url.searchParams.get('response_type') !== 'code') return json(res, 400, { error: 'invalid_client' });
      if (deny) { deny = false; redirect.searchParams.set('error', 'access_denied'); }
      else {
        const code = `code-${++seq}`;
        codes.set(code, { redirect_uri: url.searchParams.get('redirect_uri') });
        redirect.searchParams.set('code', code);
      }
      redirect.searchParams.set('state', url.searchParams.get('state') ?? '');
      res.writeHead(302, { Location: redirect.toString() });
      return res.end();
    }
    if (p === '/oauth/token' && req.method === 'POST') {
      lastToken = { ...body, client_secret: body?.client_secret ? '(sent)' : undefined };
      const c = codes.get(body?.code);
      if (body?.client_id !== CLIENT_ID || body?.client_secret !== CLIENT_SECRET) return json(res, 401, { error: 'invalid_client' });
      if (!c || body.grant_type !== 'authorization_code' || body.redirect_uri !== c.redirect_uri) return json(res, 400, { error: 'invalid_grant' });
      codes.delete(body.code);
      const token = `ebtok_${randomBytes(12).toString('hex')}`;
      tokens.add(token);
      return json(res, 200, { access_token: token, token_type: 'bearer' });
    }

    // API
    if (p.startsWith('/v3/')) {
      if (!authed(req)) return json(res, 401, { error: 'INVALID_AUTH', error_description: 'The OAuth token you provided was invalid.' });
      if (p === '/v3/users/me/') return json(res, 200, { ...USER, emails: [{ email: 'owner@biglove.example' }] });
      if (p === '/v3/users/me/organizations/') return json(res, 200, { organizations: ORGS, pagination: { has_more_items: false } });
      let m;
      if ((m = p.match(/^\/v3\/events\/(\d+)\/$/))) return EVENTS[m[1]] ? json(res, 200, EVENTS[m[1]]) : json(res, 404, { error: 'NOT_FOUND' });
      if ((m = p.match(/^\/v3\/organizations\/(\d+)\/webhooks\/$/)) && req.method === 'POST') {
        if (!ORGS.some((o) => o.id === m[1])) return json(res, 404, { error: 'NOT_FOUND' });
        if (!body?.endpoint_url || !body?.actions) return json(res, 400, { error: 'ARGUMENTS_ERROR' });
        const id = String(9000 + ++seq);
        const hook = { id, org: m[1], endpoint_url: body.endpoint_url, actions: body.actions };
        webhooks.set(id, hook);
        json(res, 200, hook);
        // Like Eventbrite: a test delivery right after the webhook is made.
        setTimeout(() => deliver(hook.endpoint_url, { api_url: `${BASE}/v3/webhooks/${id}/`, config: { action: 'test', webhook_id: id, user_id: USER.id, endpoint_url: hook.endpoint_url } }), 50);
        return;
      }
      if ((m = p.match(/^\/v3\/webhooks\/(\d+)\/$/)) && req.method === 'DELETE') {
        return webhooks.delete(m[1]) ? json(res, 200, { success: true }) : json(res, 404, { error: 'NOT_FOUND' });
      }
      if ((m = p.match(/^\/v3\/orders\/(\d+)\/$/))) return orders.has(m[1]) ? json(res, 200, orders.get(m[1])) : json(res, 404, { error: 'NOT_FOUND' });
      if ((m = p.match(/^\/v3\/events\/(\d+)\/orders\/$/))) {
        const all = [...orders.values()].filter((o) => o.event_id === m[1]);
        const start = Number(url.searchParams.get('continuation') || 0);
        const page = all.slice(start, start + 2);
        const more = start + 2 < all.length;
        return json(res, 200, { orders: page, pagination: { object_count: all.length, has_more_items: more, ...(more ? { continuation: String(start + 2) } : {}) } });
      }
    }
    json(res, 404, { error: 'mock: unknown ' + p });
  });
}).listen(PORT, () => console.log(`mock eventbrite on ${PORT}`));
