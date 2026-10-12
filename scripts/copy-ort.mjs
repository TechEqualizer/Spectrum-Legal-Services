// Copies onnxruntime-web's WebAssembly runtime into public/ort/ after install,
// so the depth model (src/lib/depth-map.ts) runs from our own site, at exactly
// the installed (audited) version, not from a third-party CDN. Organizers'
// browsers download it only when they make a depth map; fans never do.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const to = join(root, 'public', 'ort');
const files = ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];
if (!existsSync(from)) process.exit(0);
mkdirSync(to, { recursive: true });
for (const f of files) copyFileSync(join(from, f), join(to, f));
console.log(`[ort] runtime copied to public/ort/ (${files.join(', ')})`);
