// The flyer an organizer dropped into the sign-up wizard, kept with their
// first event when they claim it (docs/plans/05-signup.md, step 3): stored
// in the event's folder of the public reel-media bucket with the secret key,
// so the link can show it (the opening scene, behind the reels) and the
// admin can reuse it.

const env = (name: string) => process.env[name]?.trim() || undefined;

/** The flyer as the wizard keeps it: a JPEG data URL (from a photo; a PDF has none). */
const JPEG = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;
/** The wizard shrinks flyers well under this. */
const MAX_BYTES = 3 * 1024 * 1024;

/** The JPEG's bytes, or null when it isn't one the wizard would send. */
export function flyerBytes(dataUrl: unknown): Buffer | null {
  if (typeof dataUrl !== "string") return null;
  const m = JPEG.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[1], "base64");
  // A real JPEG starts FF D8 FF.
  return bytes.length > 3 && bytes.length <= MAX_BYTES && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? bytes : null;
}

/** Stores the flyer in the event's folder; its public address, or null. */
export async function storeFlyer(eventSlug: string, bytes: Buffer): Promise<{ url: string; path: string } | null> {
  const url = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY");
  if (!url || !secret) return null;
  const path = `${eventSlug}/${Date.now().toString(36)}-flyer.jpg`;
  try {
    const res = await fetch(`${url}/storage/v1/object/reel-media/${path}`, {
      method: "POST",
      headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "image/jpeg", "x-upsert": "false" },
      body: new Uint8Array(bytes),
    });
    if (!res.ok) {
      console.error("[flyer] store failed:", res.status);
      return null;
    }
    return { url: `${url}/storage/v1/object/public/reel-media/${path}`, path };
  } catch {
    return null;
  }
}

/** Takes a stored flyer back (a claim that didn't go through). */
export async function removeFlyer(path: string): Promise<void> {
  const url = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY");
  if (!url || !secret) return;
  await fetch(`${url}/storage/v1/object/reel-media/${path}`, { method: "DELETE", headers: { apikey: secret, Authorization: `Bearer ${secret}` } }).catch(() => {});
}
