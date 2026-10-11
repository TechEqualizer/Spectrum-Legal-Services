"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

// Archiving a client (full admins, Events): nothing is deleted. Their links
// answer Not found, their logins can't sign in, and a paid plan stops
// charging; Restore brings them back (on Coming soon until they go live).

const patch = (slug: string, archived: boolean) =>
  fetch(`/api/admin/clients/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived }),
  }).catch(() => null);

/**
 * Archive, beside a client's name: asks first, saying what happens. Settings →
 * Organizers calls it Remove (`verb`); it's the same archive, restorable.
 */
export function ArchiveClient({ organizer, verb = "Archive" }: { organizer: { slug: string; name: string }; verb?: "Archive" | "Remove" }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const archive = async () => {
    setBusy(true);
    setProblem("");
    const res = await patch(organizer.slug, true);
    const out = (await res?.json().catch(() => null)) as { error?: string; canceled?: boolean } | null;
    setBusy(false);
    if (!res?.ok) return setProblem(out?.error ?? `Couldn't ${verb.toLowerCase()} them. Try again.`);
    if (out?.canceled === false) window.alert(`${organizer.name} is ${verb === "Remove" ? "removed" : "archived"}, but their plan couldn't be canceled in Stripe. Cancel it there.`);
    setAsking(false);
    router.refresh();
  };
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label={`${verb} ${organizer.name}`}
        className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        {verb}
      </button>
    );
  }
  return (
    <div role="group" aria-label={`${verb} ${organizer.name}?`} className="basis-full rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5">
      <p className="text-sm text-gray-800">
        {verb} <strong>{organizer.name}</strong>? Their links stop working, their logins can&apos;t sign in, and a paid plan stops
        charging now. Nothing is deleted: you can restore them below, under Archived.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={archive}
          className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-40"
        >
          {busy ? (verb === "Remove" ? "Removing…" : "Archiving…") : verb}
        </button>
        <button type="button" disabled={busy} onClick={() => setAsking(false)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-deep-navy hover:bg-white">
          Keep
        </button>
        {problem && <p role="alert" className="basis-full text-sm font-semibold text-red-700">{problem}</p>}
      </div>
    </div>
  );
}

type Archived = { slug: string; name: string; archivedAt: string };

/** Archived clients, each with Restore. Nothing shows when there are none. */
export function ArchivedClients() {
  const router = useRouter();
  const id = useId();
  const [clients, setClients] = useState<Archived[] | null>(null);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const [loads, setLoads] = useState(0);
  useEffect(() => {
    let current = true;
    fetch("/api/admin/clients", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((out: { clients?: Archived[] } | null) => {
        if (current) setClients(out?.clients ?? []);
      })
      .catch(() => current && setClients([]));
    return () => {
      current = false;
    };
  }, [loads]);
  const restore = async (c: Archived) => {
    setBusy(c.slug);
    setProblem("");
    const res = await patch(c.slug, false);
    setBusy("");
    if (!res?.ok) return setProblem(`Couldn't restore ${c.name}. Try again.`);
    setLoads((n) => n + 1);
    router.refresh();
  };
  if (!clients?.length) return null;
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Archived</h2>
      <ul role="list" className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {clients.map((c) => (
          <li key={c.slug} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-deep-navy">{c.name}</p>
              <p className="text-xs text-gray-600">
                /f/{c.slug} · archived {new Date(c.archivedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button
              type="button"
              disabled={busy === c.slug}
              onClick={() => restore(c)}
              aria-label={`Restore ${c.name}`}
              className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray disabled:opacity-40"
            >
              {busy === c.slug ? "Restoring…" : "Restore"}
            </button>
          </li>
        ))}
      </ul>
      {problem && <p role="alert" className="mt-2 px-1 text-sm font-semibold text-red-700">{problem}</p>}
    </section>
  );
}
