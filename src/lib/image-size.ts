// An image's size in pixels, read from its header bytes (JPEG, PNG, GIF,
// WebP), with no image library. Claude places shots in the flyer's own pixels
// (docs/plans/09-flyer-to-video.md), so the server needs the size it sent.

export type PixelSize = { w: number; h: number };

const u16 = (b: Uint8Array, i: number, little = false) => (little ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const ok = (w: number, h: number): PixelSize | null => (w > 0 && h > 0 && w < 100_000 && h < 100_000 ? { w, h } : null);

function jpeg(b: Uint8Array): PixelSize | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // Fill bytes, and markers with no length.
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = u16(b, i + 2);
    // Start of frame (any SOF but DHT C4, JPG C8 and DAC CC): height, then width.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return ok(u16(b, i + 7), u16(b, i + 5));
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

function webp(b: Uint8Array): PixelSize | null {
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === "VP8X") return ok(u24le(b, 24) + 1, u24le(b, 27) + 1);
  if (chunk === "VP8L") {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return ok((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8 ") return ok(u16(b, 26, true) & 0x3fff, u16(b, 28, true) & 0x3fff);
  return null;
}

/** The size of an image from its bytes, or null when it isn't one we know. */
export function imageSize(b: Uint8Array): PixelSize | null {
  if (b.length < 30) return null;
  if (b[0] === 0xff && b[1] === 0xd8) return jpeg(b);
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ok(u32(b, 16), u32(b, 20));
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return ok(u16(b, 6, true), u16(b, 8, true));
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" && String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP") return webp(b);
  return null;
}

/** The size of a base64 image (only its first bytes are decoded: enough for any header we read). */
export function base64ImageSize(data: string): PixelSize | null {
  try {
    // JPEG frame headers can follow large EXIF blocks: read up to 256 KB.
    const head = Buffer.from(data.slice(0, 350_000), "base64");
    return imageSize(new Uint8Array(head.buffer, head.byteOffset, head.byteLength));
  } catch {
    return null;
  }
}
