#!/usr/bin/env node
// Watches an opening scene the way a fan would, so it can be reviewed
// frame by frame (see .claude/skills/opening-scene/SKILL.md).
//
//   node scripts/review-opening.mjs --flyer /clients/x/flyer.jpg --recipe recipe.json \
//     [--font editorial] [--accent "#D8818C"] [--title "Book signing"] [--tagline "..."] \
//     [--out dir] [--base http://localhost:3000]
//
// Needs `npm run dev` running (the page, /dev/opening, is never served in
// production). Records the opening on a 390×844 phone, then writes:
//   opening.mp4   the recording;
//   frame-NN.png  the opening every half second, plus one at every hard cut
//                 (ffmpeg scene detection, as in claude-video; dissolves are
//                 gradual, so the steady samples catch those);
//   held.png      the hold under the title, as a fan is left with it;
//   sheet.png     all the frames side by side, to judge the edit at a glance.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '../tests/e2e/browser.mjs';

const { values: opt } = parseArgs({
  options: {
    flyer: { type: 'string' },
    recipe: { type: 'string' },
    font: { type: 'string' },
    accent: { type: 'string' },
    title: { type: 'string', default: 'Your event' },
    tagline: { type: 'string', default: '' },
    out: { type: 'string', default: 'opening-review' },
    base: { type: 'string', default: 'http://localhost:3000' },
    scene: { type: 'string', default: '0.25' },
  },
});
if (!opt.flyer || !opt.recipe) {
  console.error('Usage: node scripts/review-opening.mjs --flyer <url path> --recipe <file.json> [--out dir]');
  process.exit(1);
}
const out = resolve(opt.out);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const review = { src: opt.flyer, recipe: JSON.parse(readFileSync(opt.recipe, 'utf8')), font: opt.font, accent: opt.accent, title: opt.title, tagline: opt.tagline };

// Software GL, so the light leak draws on machines without a GPU.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const size = { width: 390, height: 844 };
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, recordVideo: { dir: out, size } });
const page = await ctx.newPage();
// The recording starts with the page; times below are from here.
const opened = Date.now();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((r) => sessionStorage.setItem('opening-review', JSON.stringify(r)), review);
await page.goto(`${opt.base}/dev/opening`);
// Next's dev badge isn't part of the opening.
await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
const problem = await page.locator('main').filter({ hasText: 'not a valid one' }).count();
if (problem) {
  console.error('The page refused the recipe: it is not a valid opening (see src/lib/opening.ts).');
  process.exit(1);
}
// The opening starts when the flyer is drawn; the cut plays once, then the title
// comes up over the hold. Watch a few seconds of the hold too.
await page.waitForFunction(() => [...document.querySelectorAll('main img')].some((i) => i.complete && i.naturalWidth), null, { timeout: 20_000 });
const start = (Date.now() - opened) / 1000;
await page.locator('[data-held]').waitFor({ timeout: 40_000 });
const held = (Date.now() - opened) / 1000;
await page.waitForTimeout(2500);
await page.screenshot({ path: join(out, 'held.png') });
await page.waitForTimeout(1500);
const video = await page.video().path();
await ctx.close();
await browser.close();

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'pipe' });
renameSync(video, join(out, 'recording.webm'));
ffmpeg('-i', join(out, 'recording.webm'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, 'opening.mp4'));
rmSync(join(out, 'recording.webm'));

// Every half second from the start through the title coming up, plus each hard cut
// (where the picture changes past the threshold), its time from showinfo.
const mp4 = join(out, 'opening.mp4');
const found = spawnSync('ffmpeg', ['-hide_banner', '-i', mp4, '-vf', `select='gt(scene\\,${opt.scene})',showinfo`, '-f', 'null', '-'], { encoding: 'utf8' });
const cutTimes = [...found.stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t > start && t < held + 1);
const steady = Array.from({ length: Math.floor((held + 1 - start) / 0.5) + 1 }, (_, i) => start + i * 0.5);
const times = [...steady.filter((t) => cutTimes.every((c) => Math.abs(c - t) > 0.2)), ...cutTimes].sort((a, b) => a - b);
times.forEach((t, i) => ffmpeg('-ss', t.toFixed(3), '-i', mp4, '-frames:v', '1', join(out, `frame-${String(i + 1).padStart(2, '0')}.png`)));
const cols = Math.min(times.length, 8);
ffmpeg('-framerate', '1', '-i', join(out, 'frame-%02d.png'), '-vf', `scale=200:-2,tile=${cols}x${Math.ceil(times.length / cols)}:padding=6:color=black`, '-frames:v', '1', join(out, 'sheet.png'));

console.log(`Opening reviewed in ${out}`);
times.forEach((t, i) => console.log(`  frame-${String(i + 1).padStart(2, '0')}.png  ${(t - start).toFixed(1)}s${cutTimes.includes(t) ? '  (cut)' : ''}`));
console.log(`  The title came up at ${(held - start).toFixed(1)}s.`);
console.log('  held.png  the hold under the title\n  sheet.png  every frame above\n  opening.mp4');
if (errors.length) console.log('Page errors:\n' + errors.map((e) => `  ${e}`).join('\n'));
