"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ScenePreview, Swatches } from "@/admin/components/HeroMediaCard";
import { keepUpload } from "@/admin/drafts";
import { LOOK_FONTS, type Look } from "@/lib/look";
import type { ImportedDate } from "@/lib/server/flyer-import";

export type { ImportedDate };

/** What a flyer gave: its dates, and its look with the flyer itself (an upload link) when it was a picture. */
export type FlyerFound = { dates: ImportedDate[]; note: string; look?: Look; flyer?: string; lookUsed?: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Phone photos are big: send at most 1600px, as JPEG, so it's quick and under the upload limit. */
async function shrink(file: File): Promise<{ type: string; data: string; blob?: Blob }> {
  if (file.type === "application/pdf") {
    if (file.size > 3 * 1024 * 1024) throw new Error("That PDF is too big. Use one under 3 MB, or a photo of the flyer.");
    return { type: file.type, data: await toBase64(file) };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file can't be read. Use a JPG or PNG photo, or a PDF.");
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("That file can't be read. Use a JPG or PNG photo, or a PDF.");
  return { type: "image/jpeg", data: await toBase64(blob), blob };
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("That file can't be read."));
    reader.readAsDataURL(blob);
  });

/** "Sat, Oct 12 · 7:00 PM", from the flyer's own date and time. */
export function importedWhen(d: ImportedDate) {
  const at = new Date(`${d.date}T${d.time || "12:00"}`);
  const day = at.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return d.time ? `${day} · ${at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : day;
}

/**
 * Import dates from a flyer: choose a photo or PDF (or paste the details),
 * then review each date it finds before adding it.
 */
export default function FlyerImportSheet({
  slug,
  found,
  added,
  taken,
  onFound,
  onReview,
  onLook,
  onClose,
}: {
  slug: string;
  /** Dates found so far (null: nothing read yet). */
  found: FlyerFound | null;
  /** Indexes of found dates already added. */
  added: Set<number>;
  /** Days ("2026-10-12") that already have a date. */
  taken: Set<string>;
  onFound: (result: FlyerFound | null) => void;
  onReview: (index: number) => void;
  /** Use the flyer's look, and the flyer as the opening screen's background if given. */
  onLook: (look: Look, flyer?: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [withFlyer, setWithFlyer] = useState(true);
  useEffect(() => ref.current?.showModal(), []);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (f: File | undefined) => {
    setError("");
    setFile(f ?? null);
    setPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const read = async () => {
    setBusy(true);
    setError("");
    try {
      const { blob, ...payload } = file ? await shrink(file) : { text, blob: undefined };
      const res = await fetch("/api/admin/import-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, today: localDay(new Date()), ...payload }),
      }).catch(() => null);
      if (!res) throw new Error("Couldn't reach the server. Check your connection and try again.");
      const body = (await res.json().catch(() => ({}))) as { dates?: ImportedDate[]; note?: string; look?: Look; error?: string };
      if (res.status === 401) throw new Error("Your sign-in expired. Sign in again, then try.");
      if (!res.ok || !body.dates) throw new Error(body.error ?? "Couldn't read the flyer. Try again.");
      onFound({
        dates: body.dates,
        note: body.note ?? "",
        ...(body.look ? { look: body.look } : {}),
        // The (shrunk) flyer, kept so it can go behind the opening screen and survive a reload.
        ...(body.look && blob ? { flyer: keepUpload(new File([blob], "flyer.jpg", { type: "image/jpeg" })) } : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the flyer. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(file) || text.trim().length > 0;
  const field = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-charcoal focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-accent";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      className="m-auto max-h-[92dvh] w-[min(30rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
        <div>
          <h2 id={`${id}-title`} className="text-xl font-bold text-deep-navy">Import from flyer</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {found ? "Review each date, then add it." : "We’ll fill in the date, time, venue, price, and ticket link."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-deep-navy"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {found ? (
        <div className="space-y-4 px-5 pb-5">
          {found.look && (
            <LookOffer
              look={found.look}
              flyer={withFlyer ? found.flyer : undefined}
              hasFlyer={Boolean(found.flyer)}
              withFlyer={withFlyer}
              onWithFlyer={setWithFlyer}
              title={found.dates[0]?.name.split(": ")[0] || "Your event"}
              used={Boolean(found.lookUsed)}
              onUse={() => onLook(found.look!, withFlyer ? found.flyer : undefined)}
            />
          )}
          {found.dates.length === 0 ? (
            <p role="alert" className="rounded-xl bg-white px-4 py-4 text-sm text-charcoal">
              {found.note || "No event dates found."} Try a clearer photo, or paste the details.
            </p>
          ) : (
            <>
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Found {found.dates.length} {found.dates.length === 1 ? "date" : "dates"}
              </p>
              <ul role="list" className="divide-y divide-gray-100 rounded-xl bg-white">
                {found.dates.map((d, i) => {
                  const done = added.has(i);
                  const exists = !done && taken.has(d.date);
                  const at = new Date(`${d.date}T12:00`);
                  return (
                    <li key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-soft-gray leading-none text-deep-navy">
                        <span className="text-[10px] font-bold uppercase tracking-wide">{at.toLocaleDateString("en-US", { month: "short" })}</span>
                        <span className="mt-0.5 text-lg font-bold">{at.getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-deep-navy">{d.name || "Untitled"}</span>
                        <span className="block truncate text-xs text-gray-600">
                          {[importedWhen(d), d.venue, d.price].filter(Boolean).join(" · ")}
                        </span>
                        {!d.ticketUrl && !done && <span className="block text-xs font-semibold text-amber-800">Needs a ticket link</span>}
                      </span>
                      {done ? (
                        <span className="flex-shrink-0 text-sm font-semibold text-teal-700">Added ✓</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReview(i)}
                          className={`min-h-10 flex-shrink-0 rounded-lg px-3 text-sm font-semibold ${exists ? "border border-gray-300 text-deep-navy hover:bg-soft-gray" : "bg-deep-navy text-white hover:bg-royal-blue"}`}
                          aria-label={`Review ${d.name || "date"}, ${importedWhen(d)}`}
                        >
                          {exists ? "Add anyway" : "Review"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {found.dates.some((d, i) => !added.has(i) && taken.has(d.date)) && (
                <p className="px-1 text-xs text-gray-500">“Add anyway”: you already have a date that day.</p>
              )}
              {found.note && <p className="px-1 text-xs text-gray-600">{found.note}</p>}
            </>
          )}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onFound(null)} className="min-h-11 px-1 text-sm font-semibold text-deep-navy hover:underline">
              Import another
            </button>
            <button type="button" onClick={() => ref.current?.close()} className="ml-auto min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white">
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4 px-5 pb-5">
            <input
              ref={fileRef}
              id={`${id}-file`}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => choose(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-xl bg-white p-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview
                  <img src={preview} alt="" className="h-20 w-16 flex-shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="flex h-20 w-16 flex-shrink-0 items-center justify-center rounded-md bg-soft-gray text-xs font-bold text-gray-600">PDF</span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-deep-navy">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    choose(undefined);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  disabled={busy}
                  className="min-h-10 px-2 text-sm font-semibold text-gray-600 hover:text-deep-navy"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                htmlFor={`${id}-file`}
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 text-center hover:border-teal-accent focus-within:ring-2 focus-within:ring-teal-accent"
              >
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="font-semibold text-deep-navy">Choose a flyer</span>
                <span className="text-xs text-gray-500">Photo, screenshot, or PDF</span>
              </label>
            )}

            {!file && (
              <>
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-gray-400" aria-hidden="true">
                  <span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" />
                </div>
                <div>
                  <label htmlFor={`${id}-text`} className="mb-1.5 block px-1 text-sm font-semibold text-deep-navy">Paste the event details</label>
                  <textarea
                    id={`${id}-text`}
                    rows={4}
                    maxLength={20000}
                    className={field}
                    placeholder={"Golden Hour, Sat Oct 12, 7pm\nThe Rooftop, Downtown · $25\ntickets: eventbrite.com/e/…"}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              </>
            )}
            {error && <p role="alert" className="px-1 text-sm font-semibold text-red-700">{error}</p>}
            <p className="px-1 text-xs text-gray-500">Nothing is added until you review it. QR codes can’t be read, so you may need to paste the ticket link.</p>
          </div>

          <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-soft-gray/95 px-5 py-3 backdrop-blur">
            <button type="button" onClick={() => ref.current?.close()} className="ml-auto min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={read}
              disabled={!ready || busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-deep-navy px-6 text-sm font-bold text-white hover:bg-royal-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />}
              {busy ? "Reading…" : "Read flyer"}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

/** "Match your flyer's look?": a preview in the flyer's colors and type, and one button to use it. */
function LookOffer({
  look,
  flyer,
  hasFlyer,
  withFlyer,
  onWithFlyer,
  title,
  used,
  onUse,
}: {
  look: Look;
  flyer?: string;
  hasFlyer: boolean;
  withFlyer: boolean;
  onWithFlyer: (on: boolean) => void;
  title: string;
  used: boolean;
  onUse: () => void;
}) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-look`} className="flex gap-4 rounded-xl bg-white p-4">
      <ScenePreview media={flyer ? { kind: "image", src: flyer, fit: "poster" } : undefined} look={look} title={title} button="Get tickets" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 id={`${id}-look`} className="font-bold text-deep-navy">{used ? "Look matched" : "Match your flyer’s look?"}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <Swatches look={look} />
        </p>
        <p className="mt-1 text-sm text-gray-600">{LOOK_FONTS[look.font].label} titles. Colors adjusted so words stay readable.</p>
        {hasFlyer && !used && (
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-deep-navy">
            <input type="checkbox" checked={withFlyer} onChange={(e) => onWithFlyer(e.target.checked)} className="h-5 w-5 accent-[var(--teal-accent)]" />
            Flyer as the background
          </label>
        )}
        <div className="mt-auto pt-3">
          {used ? (
            <p className="text-sm font-semibold text-teal-700">Applied ✓ Publish to put it live.</p>
          ) : (
            <button type="button" onClick={onUse} className="min-h-11 w-full rounded-lg bg-deep-navy px-4 text-sm font-bold text-white hover:bg-royal-blue">
              Use this look
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
