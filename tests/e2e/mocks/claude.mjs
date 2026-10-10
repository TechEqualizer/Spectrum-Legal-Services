import http from 'node:http';
let last = null; let mode = 'multi';
const replies = {
  multi: { dates: [
    { name: 'Golden Hour: Halloween', date: '2026-10-31', time: '19:00', venue: 'The Rooftop, Downtown', price: 'From $30', ticketUrl: 'eventbrite.com/e/golden-hour-halloween' },
    { name: 'Golden Hour', date: '2026-11-08', time: null, venue: null, price: null, ticketUrl: null },
    { name: 'bad', date: 'soon', time: '7pm', venue: null, price: null, ticketUrl: 'javascript:alert(1)' },
  ], note: 'The second date has no time on the flyer.',
    look: { found: true, background: '#2A1630', depth: '#4A2340', button: '#D4AF37', highlight: '#8A6D1F', light: '#C9B9A0', font: 'regal',
      palette: ['#1C0D1F', '#2A1630', '#5A2A52', '#8E3B6E', '#D4AF37', '#F4D58D', '#C9B9A0'],
      bold: { background: '#1C0D1F', depth: '#5A2A52', button: '#E0447A', highlight: '#F4D58D', light: '#F5E6EE', font: 'bold' },
      elegant: { background: '#120812', depth: '#2A1630', button: '#8E3B6E', highlight: '#D4AF37', light: '#EFE6DA', font: 'editorial' } } },
  single: { dates: [{ name: 'Golden Hour: Day Party', date: '2026-11-22', time: '14:00', venue: 'Pier 9', price: '$20', ticketUrl: 'https://posh.vip/e/day-party' }], note: null,
    look: { found: false, background: '#000000', depth: '#000000', button: '#000000', highlight: '#000000', light: '#000000', font: 'classic' } },
  none: { dates: [], note: 'This looks like a menu, not an event flyer.', look: { found: false, background: '#000000', depth: '#000000', button: '#000000', highlight: '#000000', light: '#000000', font: 'classic' } },
};
const clip = (camera, seconds, prompt) => ({ camera, seconds, prompt });
const draft = {
  screen: { title: 'Masks on, Detroit', tagline: 'One night. Every mask hides a story. Detroit, Oct 31, 21+.', watchLabel: 'Step inside the night', heading: 'Which night are you in?' },
  styleLock: 'Anamorphic 35mm look, candlelit gold and deep plum, soft film grain, 24fps, vertical 9:16.',
  avoid: 'on-screen text, letters, logos, watermarks, warped hands, melting faces, flicker, sudden cuts',
  hero: clip('slow push in', 8, 'A woman in a gold filigree mask turns to camera as candlelight flickers; the bottom third falls into shadow.'),
  // Out of order, with a duplicate and an unknown role: the app keeps one of each, in order.
  reels: [
    { role: 'last_call', title: 'Last call', summary: 'GA ends Oct 30. After that, the door price.', hook: 'GA ends Thursday.', captions: ['$31 GA ends Oct 30', 'VIP is limited', 'Masks on, Detroit'], date: '2026-10-31', source: 'text', ...clip('slow push in', 6, 'An empty runway glows; room for a button below.') },
    { role: 'the_night', title: 'Masks on', summary: 'You, in gold, on the runway. Who is behind the mask?', hook: 'A gold mask turns to camera.', captions: ['You, in gold.', 'Masks on.', 'Secrets revealed.'], date: '2026-10-31', source: 'photo', ...clip('rack focus', 6, 'Close on the mask, eyes open.') },
    { role: 'your_people', title: 'Bring your crew', summary: 'Grown and sexy, 30+. Your people, masked, all night.', hook: 'Friends tie each other\'s masks in a mirror.', captions: ['Bring your crew', 'Grown and sexy, 30+'], date: null, source: 'photo', ...clip('handheld', 6, 'Friends laugh as they arrive.') },
    { role: 'the_night', title: 'Second night reel', summary: 'Dropped: one per role.', hook: '', captions: [], date: null, source: 'text', ...clip('arc', 6, 'x') },
    { role: 'hook', title: 'Old role', summary: '', hook: '', captions: [], date: null, source: 'text', camera: '', seconds: 5, prompt: '' },
  ],
};
http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    if (req.url === '/__mode') { mode = body; return res.end('ok'); }
    if (req.url === '/__last') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(last)); }
    if (req.url.startsWith('/v1/messages')) {
      last = { headers: req.headers, body: JSON.parse(body) };
      res.setHeader('content-type', 'application/json');
      const drafting = /creative director/.test(JSON.stringify(last.body.system));
      // nodraft: flyers read as multi, but drafting reels is declined.
      if (mode === 'refusal' || (mode === 'nodraft' && drafting)) return res.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: 'refusal', usage: { input_tokens: 1, output_tokens: 0 } }));
      res.setHeader('content-type', 'application/json');
      setTimeout(() => res.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
        content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: JSON.stringify(drafting ? draft : replies[mode === 'nodraft' ? 'multi' : mode]) }],
        stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } })), 600);
      return;
    }
    res.statusCode = 404; res.end();
  });
}).listen(54400);
