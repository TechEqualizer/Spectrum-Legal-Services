#!/usr/bin/env node
// Makes a flyer's depth map the way an organizer's browser does
// (src/lib/depth-map.ts), and saves it to look at.
//
//   node scripts/make-depth.mjs --flyer /clients/masquerade/flyer.jpg --out depth.png [--model <url>] [--base http://localhost:3000]
//
// Needs `npm run dev`. Without --model it uses Depth Anything V2 Small from
// Hugging Face, which this machine must be able to reach.
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium } from '../tests/e2e/browser.mjs';

const { values: opt } = parseArgs({ options: { flyer: { type: 'string' }, out: { type: 'string', default: 'depth.png' }, model: { type: 'string' }, base: { type: 'string', default: 'http://localhost:3000' } } });
if (!opt.flyer) {
  console.error('Usage: node scripts/make-depth.mjs --flyer <url path> [--out depth.png] [--model <url>]');
  process.exit(2);
}
const b = await chromium.launch();
const p = await b.newPage();
const logs = [];
p.on('console', (m) => logs.push(m.text()));
await p.goto(`${opt.base}/dev/depth`);
await p.waitForFunction(() => window.__makeDepth);
const started = Date.now();
const url = await p.evaluate(([src, model]) => window.__makeDepth(src, model || undefined), [opt.flyer, opt.model]);
await b.close();
if (!url) {
  console.error('No depth map.', logs.filter((l) => l.includes('[depth]')).join('\n'));
  process.exit(1);
}
writeFileSync(opt.out, Buffer.from(url.split(',')[1], 'base64'));
console.log(`Depth map saved to ${opt.out} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
