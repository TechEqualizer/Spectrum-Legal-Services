"use client";

import { useEffect, useRef } from "react";

/**
 * The flyer's artwork in 3D: a depth map (near is bright) tells each pixel
 * how far away it is, so a virtual camera can move through the still image.
 * Near things slide more than far ones (parallax), the camera can dolly in,
 * focus can pull from the background to the subject, and haze gathers in the
 * distance. One WebGL pass, a few kilobytes; the flyer and its depth map are
 * the only downloads.
 *
 * Every move is a function of the loop's phase (0 to 1), so the scene loops
 * without a seam. Draws one still frame when `still` is set.
 */
export type DepthCamera = "orbit" | "dolly" | "rise";

export default function DepthScene({
  src,
  depth,
  focus,
  camera,
  seconds,
  haze,
  still = false,
  onFail,
}: {
  src: string;
  depth: string;
  /** The box on the flyer to fill the screen with, 0 to 1 from its top left. */
  focus: { x: number; y: number; w: number; h: number };
  camera: DepthCamera;
  seconds: number;
  /** The color the distance fades into. */
  haze: string;
  still?: boolean;
  /** WebGL isn't available: the caller shows the flat scene instead. */
  onFail?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) {
      onFail?.();
      return;
    }
    let frame = 0;
    let disposed = false;
    const program = link(gl, VERT, FRAG);
    if (!program) {
      onFail?.();
      return;
    }
    gl.useProgram(program);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);

    Promise.all([load(src), load(depth)]).then(([art, map]) => {
      if (disposed) return;
      // A softened copy of the art for out-of-focus areas (WebGL 1 can't pick a blur level per pixel).
      const soft = document.createElement("canvas");
      soft.width = Math.round(art.naturalWidth / 2);
      soft.height = Math.round(art.naturalHeight / 2);
      const sctx = soft.getContext("2d");
      if (sctx) {
        sctx.filter = "blur(6px)";
        sctx.drawImage(art, 0, 0, soft.width, soft.height);
      }
      texture(gl, 0, art);
      texture(gl, 1, map);
      texture(gl, 2, soft);
      gl.uniform1i(u("art"), 0);
      gl.uniform1i(u("depth"), 1);
      gl.uniform1i(u("soft"), 2);
      const [r, g, b] = rgb(haze);
      gl.uniform3f(u("haze"), r, g, b);
      gl.uniform1i(u("cam"), camera === "orbit" ? 0 : camera === "dolly" ? 1 : 2);

      const start = performance.now();
      const draw = (now: number) => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        // The focus box covers the screen; when it's taller, keep its top in view.
        const boxW = focus.w * art.naturalWidth;
        const boxH = focus.h * art.naturalHeight;
        const s = Math.max(w / boxW, h / boxH);
        const viewW = w / s / art.naturalWidth;
        const viewH = h / s / art.naturalHeight;
        const x0 = focus.x + (focus.w - viewW) / 2;
        const y0 = focus.y + (focus.h - viewH) * (boxH * s > h ? 0.12 : 0.5);
        gl.uniform4f(u("view"), x0, y0, viewW, viewH);
        gl.uniform1f(u("t"), still ? 0.2 : ((now - start) / 1000 / seconds) % 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!still && !disposed) frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    }, () => onFail?.());

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [src, depth, focus, camera, seconds, haze, still, onFail]);

  return <canvas ref={ref} className="ms-grade absolute inset-0 h-full w-full" />;
}

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }
`;

// For each pixel on screen, find the spot on the flyer the camera sees there:
// a point at depth d moves by (d - focal plane) × the camera's offset, so the
// lookup is solved by a few fixed-point steps. Then focus and haze by depth.
const FRAG = `
precision highp float;
varying vec2 uv;
uniform sampler2D art;
uniform sampler2D depth;
uniform sampler2D soft;
uniform vec4 view;
uniform float t;
uniform int cam;
uniform vec3 haze;
const float TAU = 6.2831853;

void main() {
  float a = TAU * t;
  // The camera: a small orbit, a dolly in and back, or a rise; always back where it started at t = 1.
  vec2 offset = vec2(0.0);
  float push = 0.0;
  if (cam == 0) { offset = vec2(cos(a), 0.45 * sin(a)) * 0.022; push = 0.02 * (0.5 - 0.5 * cos(a)); }
  else if (cam == 1) { offset = vec2(0.006 * sin(a), 0.0); push = 0.10 * (0.5 - 0.5 * cos(a)); }
  else { offset = vec2(0.0, 0.02 * (0.5 - 0.5 * cos(a)) - 0.01); push = 0.03 * (0.5 - 0.5 * cos(a)); }
  float focal = 0.55;

  vec2 q = uv;
  float d = 0.5;
  for (int i = 0; i < 5; i++) {
    vec2 c = q - 0.5;
    // Dolly: near things grow faster than far ones.
    vec2 moved = 0.5 + c / (1.0 + push * (0.4 + d)) - offset * (d - focal);
    d = texture2D(depth, view.xy + moved * view.zw).r;
    if (i == 4) q = moved;
  }
  vec2 src = view.xy + q * view.zw;
  vec3 sharp = texture2D(art, src).rgb;
  vec3 blurred = texture2D(soft, src).rgb;
  // Rack focus: the far plane starts soft and the subject sharpens as the camera settles.
  float focusAt = 0.75 - 0.15 * (0.5 - 0.5 * cos(a));
  float blur = smoothstep(0.08, 0.35, abs(d - focusAt));
  vec3 color = mix(sharp, blurred, blur * 0.85);
  // Haze in the distance, lit by the scene's color.
  float far = smoothstep(0.55, 0.0, d);
  color = mix(color, haze * 0.6 + color * 0.4, far * 0.45);
  // Edges fall off like a lens.
  vec2 v = uv - 0.5;
  color *= 1.0 - dot(v, v) * 0.9;
  gl_FragColor = vec4(color, 1.0);
}
`;

function link(gl: WebGLRenderingContext, vs: string, fs: string) {
  const make = (type: number, code: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, code);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = make(gl.VERTEX_SHADER, vs);
  const f = make(gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram();
  if (!v || !f || !p) return null;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

function texture(gl: WebGLRenderingContext, unit: number, image: TexImageSource) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
}

function load(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(/^#?([0-9a-f]{6})$/i.exec(hex)?.[1] ?? "000000", 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
