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
// A reel's cut from the flyer: shots with the reel's own words (Last Call's date asked for the bottom: it moves to the middle).
const shot = (x, y, move, line, at = 'top') => ({ box: { x, y, w: 0.34, h: 0.36 }, move, seconds: 1.8, text: { lines: [line], at, size: 'big' } });
const cuts = {
  the_night: { beats: [shot(0.35, 0.5, 'push', 'Behind the mask'), shot(0.6, 0.05, 'pull', 'Gold all night', 'middle')] },
  your_people: { beats: [shot(0.1, 0.5, 'pan-right', 'Grown and sexy'), shot(0.4, 0.3, 'pull', 'Thirty and up')] },
  last_call: { beats: [shot(0.5, 0.1, 'push', '$31 GA'), shot(0.2, 0.4, 'pull', 'Saturday, Oct 31', 'bottom')] },
};
const draft = {
  screen: { title: 'Masks on, Detroit', tagline: 'One night. Every mask hides a story. Detroit, Oct 31, 21+.', watchLabel: 'Step inside the night', heading: 'Which night are you in?' },
  // The opening, cut from the flyer: one shot with an unknown move (dropped) and one too small to stay sharp (widened).
  opening: {
    mood: 'glamour',
    beats: [
      { box: { x: 0.69, y: 0.02, w: 0.31, h: 0.37 }, move: 'pull', seconds: 2, text: { lines: ['Golden Hour', 'presents'], at: 'bottom', size: 'eyebrow' } },
      { box: { x: 0.35, y: 0.53, w: 0.3, h: 0.34 }, move: 'tilt-up', seconds: 1.7, text: { lines: ['Masks on.'], at: 'bottom', size: 'big' } },
      { box: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 }, move: 'spin', seconds: 1.7, text: { lines: ['Dropped'], at: 'top', size: 'big' } },
      { box: { x: 0.45, y: 0.2, w: 0.1, h: 0.1 }, move: 'pan-left', seconds: 1.7, text: { lines: ['Secrets', 'revealed.'], at: 'top', size: 'big' } },
    ],
    hold: { x: 0.3, y: 0.5, w: 0.4, h: 0.4 },
  },
  styleLock: 'Anamorphic 35mm look, candlelit gold and deep plum, soft film grain, 24fps, vertical 9:16.',
  avoid: 'on-screen text, letters, logos, watermarks, warped hands, melting faces, flicker, sudden cuts',
  hero: clip('slow push in', 8, 'A woman in a gold filigree mask turns to camera as candlelight flickers; the bottom third falls into shadow.'),
  // Out of order, with a duplicate and an unknown role: the app keeps one of each, in order.
  reels: [
    { role: 'last_call', title: 'Last call', summary: 'GA ends Oct 30. After that, the door price.', hook: 'GA ends Thursday.', captions: ['$31 GA ends Oct 30', 'VIP is limited', 'Masks on, Detroit'], date: '2026-10-31', source: 'text', ...clip('slow push in', 6, 'An empty runway glows; room for a button below.'), cut: cuts.last_call },
    { role: 'the_night', title: 'Masks on', summary: 'You, in gold, on the runway. Who is behind the mask?', hook: 'A gold mask turns to camera.', captions: ['You, in gold.', 'Masks on.', 'Secrets revealed.'], date: '2026-10-31', source: 'photo', ...clip('rack focus', 6, 'Close on the mask, eyes open.'), cut: cuts.the_night },
    { role: 'your_people', title: 'Bring your crew', summary: 'Grown and sexy, 30+. Your people, masked, all night.', hook: 'Friends tie each other\'s masks in a mirror.', captions: ['Bring your crew', 'Grown and sexy, 30+'], date: null, source: 'photo', ...clip('handheld', 6, 'Friends laugh as they arrive.'), cut: cuts.your_people },
    { role: 'the_night', title: 'Second night reel', summary: 'Dropped: one per role.', hook: '', captions: [], date: null, source: 'text', ...clip('arc', 6, 'x') },
    { role: 'hook', title: 'Old role', summary: '', hook: '', captions: [], date: null, source: 'text', camera: '', seconds: 5, prompt: '' },
  ],
};
// Claude places boxes in the flyer's pixels when the prompt gives its size: the fractions above, as pixels, with a
// tight focus in each shot and a map of the flyer (its subjects, and lettering in a strip along the bottom edge).
const toPx = (b, w, h) => [Math.round(b.x * w), Math.round(b.y * h), Math.round((b.x + b.w) * w), Math.round((b.y + b.h) * h)];
const inPixels = (r, w, h) => r && {
  ...r,
  beats: r.beats.map((x) => ({ ...x, box: toPx(x.box, w, h), focus: toPx({ x: x.box.x + x.box.w * 0.4, y: x.box.y + x.box.h * 0.2, w: x.box.w * 0.2, h: x.box.h * 0.2 }, w, h) })),
  ...(r.hold ? { hold: toPx(r.hold, w, h) } : {}),
};
const sized = (reply, system) => {
  const m = JSON.stringify(system).match(/flyer image is (\d+)x(\d+) pixels/);
  if (!m) return reply;
  const [w, h] = [Number(m[1]), Number(m[2])];
  const map = { subjects: (reply.opening?.beats ?? []).map((x, i) => ({ what: `subject ${i + 1}`, box: toPx(x.box, w, h) })), lettering: [toPx({ x: 0.05, y: 0.97, w: 0.9, h: 0.03 }, w, h)] };
  return { map, ...reply, opening: inPixels(reply.opening, w, h), ...(reply.cuts ? { cuts: reply.cuts.map((c) => ({ role: c.role, ...inPixels(c, w, h) })) } : {}) };
};
// The draft comes in two answers: the words (no opening, no cuts), and the direction (the map, opening and cuts).
const words = { ...draft, opening: undefined, reels: draft.reels.map(({ cut, ...r }) => r) };
const direction = { opening: draft.opening, cuts: draft.reels.flatMap((r) => (r.cut ? [{ role: r.role, ...r.cut }] : [])) };
// A stand-in for the API's limit on how big a schema it will compile. The one schema that drafted everything
// at once measured 4,176 characters this way, and the API refused it: "The compiled grammar is too large".
const GRAMMAR_LIMIT = 3000;
const weight = (schema) => JSON.stringify(schema ?? {}, (k, v) => (k === 'description' ? undefined : v)).length;
let log = [];

http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    if (req.url === '/__mode') { mode = body; return res.end('ok'); }
    if (req.url === '/__last') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(last)); }
    // Every request since the last time this was asked (the draft sends two at once).
    if (req.url === '/__log') { res.setHeader('content-type', 'application/json'); const out = log; log = []; return res.end(JSON.stringify(out)); }
    if (req.url.startsWith('/v1/messages')) {
      last = { headers: req.headers, body: JSON.parse(body) };
      log.push(last.body);
      res.setHeader('content-type', 'application/json');
      const schema = last.body.output_config?.format?.schema;
      if (weight(schema) > GRAMMAR_LIMIT) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: `The compiled grammar is too large, which would cause performance issues. Simplify your tool schemas or reduce the number of strict tools. (mock: ${weight(schema)} > ${GRAMMAR_LIMIT})` } }));
      }
      const drafting = /creative director/.test(JSON.stringify(last.body.system));
      // The Design tab's opening alone: the draft's opening.
      const cutting = /you cut the opening of the link/.test(JSON.stringify(last.body.system));
      // nodraft: flyers read as multi, but drafting reels is declined.
      if (mode === 'refusal' || (mode === 'nodraft' && drafting)) return res.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: 'refusal', usage: { input_tokens: 1, output_tokens: 0 } }));
      res.setHeader('content-type', 'application/json');
      setTimeout(() => res.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
        content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: JSON.stringify(cutting ? sized({ opening: draft.opening }, last.body.system) : drafting ? (schema?.properties?.cuts ? sized(direction, last.body.system) : words) : replies[mode === 'nodraft' ? 'multi' : mode]) }],
        stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } })), 600);
      return;
    }
    res.statusCode = 404; res.end();
  });
}).listen(54400);
