import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, useDelayRender } from "remotion";

// The flyer with depth (docs/plans/09-flyer-to-video.md, phase 2): one WebGL
// pass draws the camera's view of the flyer and shifts each pixel by its
// depth, so what's near moves more than what's far, as through a real lens.
// The depth map is a grayscale picture of the flyer (bright is near), made
// once per flyer on the organizer's side; fans only download it and this.
// Driven by the frame like everything else, so the Player and the Stories
// download draw the same picture.

const VERTEX = `#version 300 es
in vec2 p;
out vec2 v;
void main() { v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0.0, 1.0); }`;

// For each pixel on screen: where it falls on the flyer through the camera
// (its rectangle on screen, and the hand-held roll), then a few fixed-point
// steps back along the parallax, since how far a point moves depends on its
// own depth. The focus's depth stays put; nearer pixels move with the
// parallax, farther ones against it. Off the flyer is transparent, so the
// blurred copy behind shows through.
const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D img;
uniform sampler2D depth;
uniform vec2 res;
uniform vec4 rect;
uniform float roll;
uniform vec2 shift;
uniform float dolly;
uniform vec2 focus;
in vec2 v;
out vec4 o;
void main() {
  vec2 p = v * res - res * 0.5;
  float c = cos(roll), s = sin(roll);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) + res * 0.5;
  vec2 uv = (p - rect.xy) / rect.zw;
  float pivot = texture(depth, focus).r;
  vec2 q = uv;
  for (int i = 0; i < 4; i++) {
    float d = texture(depth, q).r - pivot;
    q = uv - shift * d - (uv - focus) * dolly * d;
  }
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) { o = vec4(0.0); return; }
  o = texture(img, q);
}`;

/** Where the flyer sits on screen (as `place` gives it), and how the depth moves it this frame. */
export type DepthView = {
  rect: { left: number; top: number; width: number; height: number };
  /** The hand-held roll, in degrees. */
  roll: number;
  /** How far the nearest point moves past the focus, as a fraction of the flyer (x, y). */
  shift: [number, number];
  /** A push's depth: near points grow away from the focus by this much (a fraction). */
  dolly: number;
  /** The point that holds still: the shot's focus, in fractions of the flyer. */
  focus: [number, number];
};

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * The depth map, softened so the edge of a near thing stretches the picture
 * behind it gently over a wide band instead of tearing it in a thin one (a
 * frame line bending, lettering folding over itself). About 1.5% of the map.
 */
function softened(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const k = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = c.getContext("2d")!;
  ctx.filter = `blur(${Math.max(2, Math.round(Math.max(c.width, c.height) * 0.015))}px)`;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

type GLState = { gl: WebGL2RenderingContext; prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

function setup(canvas: HTMLCanvasElement, flyer: HTMLImageElement, depth: HTMLCanvasElement): GLState | null {
  // Kept after drawing, so the Stories download can read the picture back.
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const texture = (unit: number, source: TexImageSource) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  texture(0, flyer);
  texture(1, depth);
  const u = Object.fromEntries(["img", "depth", "res", "rect", "roll", "shift", "dolly", "focus"].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.uniform1i(u.img, 0);
  gl.uniform1i(u.depth, 1);
  return { gl, prog, u };
}

/**
 * The flyer through the camera, with depth. Says when it can't (no WebGL2, or
 * the depth map won't load), so the flat flyer is drawn instead.
 */
export const DepthFlyer: React.FC<{ src: string; depth: string; W: number; H: number; view: DepthView; style?: React.CSSProperties; onFail: () => void }> = ({
  src,
  depth,
  W,
  H,
  view,
  style,
  onFail,
}) => {
  const frame = useCurrentFrame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<GLState | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const failed = useRef(onFail);
  useEffect(() => {
    failed.current = onFail;
  });

  // Both pictures, before the first frame is drawn (a render waits for them).
  useEffect(() => {
    const handle = delayRender("Loading the flyer's depth");
    let live = true;
    Promise.all([load(src), load(depth)])
      .then(([flyer, map]) => {
        if (!live || !canvas.current) return;
        const s = setup(canvas.current, flyer, softened(map));
        if (s) setState(s);
        else failed.current();
      })
      .catch(() => live && failed.current())
      .finally(() => continueRender(handle));
    return () => {
      live = false;
    };
  }, [src, depth, delayRender, continueRender]);

  // Drawn before the frame is shown (or captured for the Stories download).
  useLayoutEffect(() => {
    if (!state) return;
    const { gl, u } = state;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.res, W, H);
    gl.uniform4f(u.rect, view.rect.left, view.rect.top, view.rect.width, view.rect.height);
    gl.uniform1f(u.roll, (view.roll * Math.PI) / 180);
    gl.uniform2f(u.shift, view.shift[0], view.shift[1]);
    gl.uniform1f(u.dolly, view.dolly);
    gl.uniform2f(u.focus, view.focus[0], view.focus[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [state, frame, W, H, view]);

  return <canvas ref={canvas} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }} />;
};
