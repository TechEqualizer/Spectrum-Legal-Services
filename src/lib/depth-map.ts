// A flyer's depth map, made in the organizer's browser while the flyer is
// read (docs/plans/09-flyer-to-video.md, phase 2): Depth Anything V2 Small
// (Apache-2.0), run with onnxruntime-web (MIT; audited before install). The
// result is a small grayscale picture of the flyer, bright where it's near,
// which the opening and the reel cuts use for parallax (src/remotion/depth.tsx).
// Fans never download the model; only the picture.
//
// Anything that goes wrong (no WebAssembly, the model won't download, too
// little memory, too slow) gives no depth map, and the flyer plays flat.
//
// UNVERIFIED: written against the model's published format (an ImageNet-
// normalized RGB input whose sides are multiples of 14, one relative-depth
// output). It hasn't run here yet: this environment can't reach the model.
// See docs/plans/09-flyer-to-video.md before shipping it.

import type { InferenceSession, Tensor } from "onnxruntime-web";

/** The quantized model (about 27 MB), fetched once per browser and cached by it. */
export const DEPTH_MODEL_URL = "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model_quantized.onnx";
/** The runtime's WebAssembly, served from our own site (copied from the installed package by scripts/copy-ort.mjs). */
const WASM_PATHS = "/ort/";
/** The model's working size: its short side, a multiple of its 14-pixel patches. */
const SHORT_SIDE = 518;
const PATCH = 14;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
/** Past this, the organizer has waited long enough: the flyer plays flat. */
const TIMEOUT_MS = 45_000;

const sessions = new Map<string, Promise<{ ort: typeof import("onnxruntime-web"); session: InferenceSession }>>();

/** The runtime and model, loaded once per page, and only when a depth map is asked for. */
function load(model: string) {
  let session = sessions.get(model);
  if (session) return session;
  session = (async () => {
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.wasmPaths = WASM_PATHS;
    // Threads need a cross-origin-isolated page; without one, a single thread.
    ort.env.wasm.numThreads = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    const s = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    return { ort: ort as unknown as typeof import("onnxruntime-web"), session: s };
  })();
  sessions.set(model, session);
  // A failed load can be tried again later.
  session.catch(() => sessions.delete(model));
  return session;
}

/** The size the model works at for a picture: the short side 518, both sides multiples of 14. */
export function workingSize(w: number, h: number): { w: number; h: number } {
  const k = SHORT_SIDE / Math.min(w, h);
  const snap = (v: number) => Math.max(PATCH, Math.round(v / PATCH) * PATCH);
  return { w: snap(w * k), h: snap(h * k) };
}

/** The picture as the model's input: RGB planes, ImageNet-normalized. */
export function toInput(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const n = w * h;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  return out;
}

/** The model's relative depth (larger is nearer) as grayscale bytes, stretched to 0–255. */
export function toGray(depth: Float32Array): Uint8ClampedArray {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of depth) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  const out = new Uint8ClampedArray(depth.length);
  for (let i = 0; i < depth.length; i++) out[i] = Math.round(((depth[i] - lo) / span) * 255);
  return out;
}

/** Whether this device should try (the model needs memory and a few seconds). */
export function canMakeDepth(): boolean {
  // Off in the end-to-end tests, which would otherwise download the model on every run.
  if (process.env.NEXT_PUBLIC_DEPTH_MAPS === "off") return false;
  if (typeof window === "undefined" || typeof WebAssembly === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  return !(typeof nav.deviceMemory === "number" && nav.deviceMemory < 4);
}

const timeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))]);

/**
 * The flyer's depth map as a PNG, or null when it can't be made here. `src`
 * is the flyer as a URL the page can draw (a data URL or a same-origin link);
 * `model`, another model of the same shape (the tests use a tiny stand-in).
 */
export async function makeDepthMap(src: string, model = DEPTH_MODEL_URL): Promise<Blob | null> {
  if (!canMakeDepth()) {
    console.info("[depth] not tried here (turned off, saving data, or under 4 GB of memory)");
    return null;
  }
  const started = performance.now();
  try {
    return await timeout(
      (async () => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        await img.decode();
        const { w, h } = workingSize(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, w, h);
        const { ort, session: s } = await load(model);
        const input = new ort.Tensor("float32", toInput(ctx.getImageData(0, 0, w, h).data, w, h), [1, 3, h, w]);
        const result = await s.run({ [s.inputNames[0]]: input });
        const out = result[s.outputNames[0]] as Tensor;
        // [1, h, w] or [1, 1, h, w]: the last two are its size.
        const [oh, ow] = out.dims.slice(-2);
        const gray = toGray(out.data as Float32Array);
        const map = new ImageData(ow, oh);
        for (let i = 0; i < gray.length; i++) {
          map.data[i * 4] = map.data[i * 4 + 1] = map.data[i * 4 + 2] = gray[i];
          map.data[i * 4 + 3] = 255;
        }
        const outCanvas = document.createElement("canvas");
        outCanvas.width = ow;
        outCanvas.height = oh;
        outCanvas.getContext("2d")!.putImageData(map, 0, 0);
        const png = await new Promise<Blob | null>((resolve) => outCanvas.toBlob(resolve, "image/png"));
        // Said either way, so whoever's checking can see it worked (and how long a phone takes).
        console.info(`[depth] made a ${ow}×${oh} depth map in ${((performance.now() - started) / 1000).toFixed(1)}s`);
        return png;
      })(),
      TIMEOUT_MS,
    );
  } catch (e) {
    console.info("[depth] no depth map:", e);
    return null;
  }
}
