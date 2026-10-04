"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { squareJpeg } from "@/admin/square-photo";

export type OrganizerPhoto = { slug: string; name: string; avatarUrl?: string };

/**
 * Settings → Organizers: each organizer this admin runs, with the photo
 * shown beside their name on every reel of every event (their initial
 * until one is added).
 */
export default function OrganizerPhotos({ organizers }: { organizers: OrganizerPhoto[] }) {
  const id = useId();
  if (!organizers.length) return null;
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Organizers</h2>
      <ul role="list" className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {organizers.map((o) => (
          <OrganizerRow key={o.slug} organizer={o} />
        ))}
      </ul>
      <p className="mt-1.5 px-1 text-xs text-gray-600">Their photo shows beside their name on every reel, for every event. Square photos look best.</p>
    </section>
  );
}

function OrganizerRow({ organizer }: { organizer: OrganizerPhoto }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/admin/organizer-photo?organizer=${encodeURIComponent(organizer.slug)}`;

  const upload = async (file: File) => {
    setError("");
    if (!/^image\//.test(file.type)) return setError("Choose a photo (JPG, PNG or WebP).");
    setBusy(true);
    try {
      const body = await squareJpeg(file);
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(out.error ?? "Couldn't upload the photo. Try again.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message !== "encode" ? e.message : "Couldn't read that photo. Try another.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError("");
    setBusy(true);
    const res = await fetch(endpoint, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Couldn't remove the photo. Try again.");
    router.refresh();
  };

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
      {/* Like the circle on a reel: the photo, or the initial on the button color. */}
      {organizer.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the organizer's own photo
        <img src={organizer.avatarUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-deep-navy text-lg font-bold text-white">
          {organizer.name.replace(/^The\s+/i, "").charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-deep-navy">{organizer.name}</p>
        <p className="text-sm text-gray-600">/f/{organizer.slug}</p>
      </div>
      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`Choose a photo for ${organizer.name}`}
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          aria-label={`${organizer.avatarUrl ? "Change" : "Add"} photo for ${organizer.name}`}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Saving…" : organizer.avatarUrl ? "Change photo" : "Add photo"}
        </button>
        {organizer.avatarUrl && !busy && (
          <button type="button" onClick={remove} aria-label={`Remove photo for ${organizer.name}`} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
            Remove
          </button>
        )}
      </div>
      {error && <p role="alert" className="basis-full text-sm font-semibold text-red-700">{error}</p>}
    </li>
  );
}
