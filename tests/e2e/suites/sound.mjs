// Sound: a video reel opens with its sound on, as the visitor just tapped to
// open it. When the browser won't allow sound (the reel opened with no tap),
// it plays on muted instead of stopping, and Unmute brings the sound back.
import { readFileSync } from 'node:fs';
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const CLIP = readFileSync(new URL('../fixtures/sample-reel-sound.webm', import.meta.url));
const errs = [];

const b = await chromium.launch();
const admin = await b.newContext({ storageState: S + '/auth.json' });
const made = await admin.request.post(B + '/api/admin/events', { data: { source: 'masquerade', name: 'Sound Night', slug: 'sound-night', mode: 'fresh' } });
check('event made', made.status() === 201, String(made.status()));
const reels = [
  { id: 'sn-video', practiceArea: 'The night', title: 'A preview of the night', summary: 'With sound.', cta: 'funnel', eventId: 'sn', media: { kind: 'video', src: B + '/e2e-sound.webm' } },
  { id: 'sn-photo', practiceArea: 'The night', title: 'Limited tickets', summary: 'A photo.', cta: 'funnel', eventId: 'sn' },
];
const pub = await admin.request.post(B + '/api/admin/publish', { data: { slug: 'sound-night', publication: {
  version: 1, reels, funnel: { order: reels.map((r) => r.id), topics: {}, paths: {}, primaryCta: 'tickets' },
  events: [{ id: 'sn', name: 'Sound Night', startsAt: '2026-12-31T20:00:00-05:00', timeZone: 'America/Detroit', venue: 'Detroit', ticketUrl: 'https://example.com/sn' }],
} } });
check('published', pub.ok(), String(pub.status()));

// The video's state, once it has had a moment to start.
const video = async (p) => {
  await p.waitForFunction(() => { const v = [...document.querySelectorAll('video[src*="e2e-sound"]')].pop(); return v && !v.paused && v.currentTime > 0; }, null, { timeout: 8000 }).catch(() => {});
  return p.evaluate(() => { const v = [...document.querySelectorAll('video[src*="e2e-sound"]')].pop(); return v ? { muted: v.muted, playing: !v.paused && v.currentTime > 0 } : null; });
};
// Headless Chromium never blocks autoplay, so each visit plays by a phone's
// rule instead: no sound until the visitor has tapped the page.
// (Chromium's own flag counts Playwright's page load as a tap, so taps are counted here.)
const phoneRule = () => {
  let tapped = false;
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, () => { tapped = true; }, true);
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.muted && !tapped) return Promise.reject(new DOMException('Sound needs a tap first', 'NotAllowedError'));
    return play.call(this);
  };
};
const visit = async (path, tap) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(phoneRule);
  await ctx.route('**/e2e-sound.webm', (r) => r.fulfill({ status: 200, contentType: 'video/webm', body: CLIP }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + path); await settle(p, 1500);
  if (tap) { await p.getByRole('button', { name: /Sneak peek inside/ }).click(); await settle(p, 800); }
  return { ctx, p };
};

// Tapped open: plays with sound, and the button offers Mute.
{
  const { ctx, p } = await visit('/f/sound-night', true);
  const v = await video(p);
  check('tapped open: plays', v?.playing === true, JSON.stringify(v));
  check('tapped open: with sound', v?.muted === false, JSON.stringify(v));
  check('tapped open: Mute offered', await p.getByRole('button', { name: 'Mute', exact: true }).isVisible());
  await p.getByRole('button', { name: 'Mute', exact: true }).click(); await settle(p, 300);
  const muted = await video(p);
  check('Mute mutes, still playing', muted?.muted === true && muted?.playing === true, JSON.stringify(muted));
  await p.screenshot({ path: S + '/sound-390.jpg' });
  await ctx.close();
}

// Opened straight from a link, no tap: sound is refused, so it plays muted.
{
  const { ctx, p } = await visit('/f/sound-night?start=sn-video', false);
  const v = await video(p);
  check('no tap: still plays', v?.playing === true, JSON.stringify(v));
  check('no tap: muted', v?.muted === true, JSON.stringify(v));
  check('no tap: Unmute offered', await p.getByRole('button', { name: 'Unmute' }).isVisible());
  await p.getByRole('button', { name: 'Unmute' }).click({ timeout: 3000 }).catch(() => {}); await settle(p, 300);
  const after = await video(p);
  check('Unmute brings the sound back', after?.muted === false && after?.playing === true, JSON.stringify(after));
  await ctx.close();
}

// A photo reel first: nothing to hear, and no sound button.
{
  const { ctx, p } = await visit('/f/sound-night?start=sn-photo', false);
  check('photo reel: no sound button', await p.getByRole('button', { name: /^(Mute|Unmute)$/ }).count() === 0);
  await ctx.close();
}

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
