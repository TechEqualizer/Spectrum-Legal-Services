// A stand-in for Stripe for end-to-end tests: the REST calls the app makes
// (Bearer test-stripe only), and the two Stripe-hosted pages, Checkout and
// the billing portal, as plain pages with buttons. Paying or canceling sends
// the app a webhook signed with STRIPE_WEBHOOK_SECRET, like Stripe does.
//
//   GET  /v1/prices?lookup_keys[0]=core_month|core_year
//   POST /v1/checkout/sessions          -> { id, url: /pay/:id }
//   GET  /v1/subscriptions/:id
//   POST /v1/billing_portal/sessions    -> { url: /portal/:customer }
//   GET/POST /pay/:id                   Checkout: Pay (webhook, then success_url) or Cancel (cancel_url)
//   GET/POST /portal/:customer          the portal: Cancel plan (webhook, then return_url)
// Test controls:
//   POST /__subscription { organizer, status }  change a subscription and send customer.subscription.updated
//   POST /__send { type, object, signature? }    send any event (a bad signature with signature: "bad")
//   GET  /__state   POST /__reset
import http from 'node:http';
import { createHmac } from 'node:crypto';

const PORT = Number(process.env.STRIPE_MOCK_PORT || 54800);
const HERE = `http://localhost:${PORT}`;
const WEBHOOK = process.env.STRIPE_MOCK_WEBHOOK_URL || 'http://localhost:3002/api/stripe/webhook';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
const DAY = 86400;

let sessions, subscriptions, customers, webhooks, n;
const reset = () => { sessions = new Map(); subscriptions = new Map(); customers = new Map(); webhooks = []; n = 0; };
reset();
const id = (prefix) => `${prefix}_${++n}`;

/** Stripe's form encoding, read back into nested objects (a[b][0][c]=v). */
function parseForm(text) {
  const out = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const path = key.replace(/\]/g, '').split('[');
    let at = out;
    path.forEach((p, i) => {
      if (i === path.length - 1) at[p] = value;
      else at = at[p] ??= /^\d+$/.test(path[i + 1]) ? [] : {};
    });
  }
  return out;
}

async function send(type, object, signature) {
  const body = JSON.stringify({ id: id('evt'), type, data: { object } });
  const t = Math.floor(Date.now() / 1000);
  const v1 = signature === 'bad' ? 'f'.repeat(64) : createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex');
  const res = await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${v1}` }, body }).catch(() => null);
  webhooks.push({ type, status: res?.status ?? 0 });
  return res?.status ?? 0;
}

const page = (res, title, html) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!doctype html><title>${title}</title><body style="font-family:sans-serif;padding:24px"><h1>${title}</h1>${html}</body>`);
};
const redirect = (res, to) => { res.writeHead(303, { Location: to }); res.end(); };

http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const url = new URL(req.url, HERE);
    const p = url.pathname;
    const text = Buffer.concat(chunks).toString();
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

    if (p === '/__reset') { reset(); return json(200, { ok: true }); }
    if (p === '/__state') return json(200, { sessions: [...sessions.values()], subscriptions: [...subscriptions.values()], customers: [...customers.values()], webhooks });
    if (p === '/__subscription' && req.method === 'POST') {
      const body = JSON.parse(text || '{}');
      const sub = [...subscriptions.values()].find((s) => s.metadata.organizer === body.organizer);
      if (!sub) return json(404, { error: 'no subscription' });
      sub.status = body.status;
      return json(200, { status: await send(body.status === 'canceled' ? 'customer.subscription.deleted' : 'customer.subscription.updated', sub) });
    }
    if (p === '/__send' && req.method === 'POST') {
      const body = JSON.parse(text || '{}');
      return json(200, { status: await send(body.type, body.object, body.signature) });
    }

    // The two Stripe-hosted pages.
    let m;
    if ((m = p.match(/^\/pay\/([\w]+)$/))) {
      const s = sessions.get(m[1]);
      if (!s) return json(404, { error: 'no session' });
      if (req.method === 'GET') {
        return page(res, 'Stripe test checkout', `<p>${s.interval === 'year' ? '$290.00 per year' : '$29.00 per month'} · Showlnk Core</p><p>${s.customer_email ?? s.customer ?? ''}</p><form method="post"><button name="do" value="pay">Pay</button> <button name="do" value="cancel">Back</button></form>`);
      }
      if (parseForm(text).do === 'cancel') return redirect(res, s.cancel_url);
      const customer = s.customer ?? id('cus');
      customers.set(customer, { id: customer, email: s.customer_email });
      const now = Math.floor(Date.now() / 1000);
      const sub = { id: id('sub'), object: 'subscription', customer, status: 'active', metadata: { organizer: s.organizer }, trial_end: null, items: { data: [{ current_period_end: now + (s.interval === 'year' ? 365 : 30) * DAY, price: { id: s.price, recurring: { interval: s.interval } } }] } };
      subscriptions.set(sub.id, sub);
      s.status = 'complete';
      await send('checkout.session.completed', { id: s.id, object: 'checkout.session', customer, subscription: sub.id, client_reference_id: s.organizer, metadata: { organizer: s.organizer } });
      return redirect(res, s.success_url);
    }
    if ((m = p.match(/^\/portal\/([\w]+)$/))) {
      const sub = [...subscriptions.values()].find((x) => x.customer === m[1] && x.status !== 'canceled');
      const back = url.searchParams.get('return') || '/';
      if (req.method === 'GET') return page(res, 'Stripe test billing portal', `<p>${sub ? 'Showlnk Core' : 'No plan'}</p><form method="post"><button name="do" value="cancel"${sub ? '' : ' disabled'}>Cancel plan</button> <button name="do" value="back">Return</button></form>`);
      if (parseForm(text).do === 'cancel' && sub) { sub.status = 'canceled'; await send('customer.subscription.deleted', sub); }
      return redirect(res, back);
    }

    // Stripe's API.
    if (req.headers.authorization !== 'Bearer test-stripe') return json(401, { error: { message: 'Invalid API Key provided' } });
    if (p === '/v1/prices' && req.method === 'GET') {
      const key = url.searchParams.get('lookup_keys[0]');
      return json(200, { data: key === 'core_month' || key === 'core_year' ? [{ id: `price_${key}`, lookup_key: key }] : [] });
    }
    if (p === '/v1/checkout/sessions' && req.method === 'POST') {
      const b = parseForm(text);
      if (b.mode !== 'subscription' || !b.line_items?.[0]?.price || !b.success_url || !b.cancel_url) return json(400, { error: { message: 'bad checkout session' } });
      const s = { id: id('cs'), price: b.line_items[0].price, interval: b.line_items[0].price.endsWith('year') ? 'year' : 'month', organizer: b.subscription_data?.metadata?.organizer, customer: b.customer, customer_email: b.customer_email, success_url: b.success_url, cancel_url: b.cancel_url, status: 'open' };
      sessions.set(s.id, s);
      return json(200, { id: s.id, url: `${HERE}/pay/${s.id}` });
    }
    if ((m = p.match(/^\/v1\/subscriptions\/([\w]+)$/)) && req.method === 'GET') {
      const sub = subscriptions.get(m[1]);
      return sub ? json(200, sub) : json(404, { error: { message: 'No such subscription' } });
    }
    if (p === '/v1/billing_portal/sessions' && req.method === 'POST') {
      const b = parseForm(text);
      if (!customers.has(b.customer)) return json(400, { error: { message: 'No such customer' } });
      return json(200, { url: `${HERE}/portal/${b.customer}?return=${encodeURIComponent(b.return_url)}` });
    }
    json(404, { error: { message: `no mock for ${req.method} ${p}` } });
  });
}).listen(PORT, () => console.log(`Mock Stripe on ${HERE}`));
