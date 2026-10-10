// A stand-in for Resend's email API for end-to-end tests: it keeps every
// email instead of sending it, so suites can open the links inside.
//
//   POST /emails     Resend's send: { from, to, subject, text, html } -> { id }
//                    (Bearer test-resend only; POST /__fail makes the next one fail)
// Test controls:
//   GET  /__emails   every email kept, oldest first
//   POST /__fail     the next send answers 500
//   POST /__reset
import http from 'node:http';

const PORT = Number(process.env.RESEND_MOCK_PORT || 54700);
let emails = [];
let failNext = false;

http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const p = new URL(req.url, 'http://x').pathname;
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (p === '/__emails') return json(200, emails);
    if (p === '/__reset') { emails = []; failNext = false; return json(200, { ok: true }); }
    if (p === '/__fail') { failNext = true; return json(200, { ok: true }); }
    if (p === '/emails' && req.method === 'POST') {
      if (req.headers.authorization !== 'Bearer test-resend') return json(401, { message: 'API key is invalid' });
      if (failNext) { failNext = false; return json(500, { message: 'internal error' }); }
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
      const id = `email-${emails.length + 1}`;
      emails.push({ id, ...body, at: Date.now() });
      return json(200, { id });
    }
    json(404, { message: 'not found' });
  });
}).listen(PORT);
