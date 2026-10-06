"use client";

import { useEffect, useId, useState } from "react";
import { sourceLabel } from "@/lib/source-tag";

type Entry = { email: string; instagram: string | null; source_tag: string | null; created_at: string };

/** A CSV field, quoted when it needs to be. */
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Settings → Waitlist (full admins): who asked for early access on the home
 * page, newest first, with their Instagram to see their events, and a CSV.
 */
export default function Waitlist() {
  const id = useId();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/admin/waitlist")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!live) return;
        if (!res.ok || !body) setError(body?.error ?? "Couldn't load the waitlist. Reload to try again.");
        else setEntries(body.entries as Entry[]);
      })
      .catch(() => live && setError("Couldn't reach the server. Reload to try again."));
    return () => {
      live = false;
    };
  }, []);

  const download = () => {
    if (!entries) return;
    const rows = [["Email", "Instagram", "Source", "Joined"], ...entries.map((e) => [e.email, e.instagram ? `@${e.instagram}` : "", sourceLabel(e.source_tag ?? undefined), e.created_at])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "showlnk-waitlist.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="mb-2 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id={`${id}-title`} className="text-xs font-bold uppercase tracking-wider text-gray-600">Waitlist</h2>
          <p className="text-sm text-gray-600">
            {entries ? `${entries.length} ${entries.length === 1 ? "person" : "people"} asked for early access on the home page.` : "Who asked for early access on the home page."}
          </p>
        </div>
        {entries && entries.length > 0 && (
          <button type="button" onClick={download} className="min-h-11 flex-shrink-0 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
            Download CSV
          </button>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white">
        {error ? (
          <p role="alert" className="px-4 py-4 text-sm text-amber-900 sm:px-5">{error}</p>
        ) : !entries ? (
          <p role="status" className="px-4 py-4 text-sm text-gray-600 sm:px-5">Loading the waitlist…</p>
        ) : !entries.length ? (
          <p className="px-4 py-4 text-sm text-gray-600 sm:px-5">No one yet. Share the home page and sign-ups show here.</p>
        ) : (
          <ul role="list" className="max-h-[28rem] divide-y divide-gray-100 overflow-y-auto">
            {entries.map((e) => (
              <li key={e.email} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-deep-navy">{e.email}</span>
                  <span className="block text-xs text-gray-600">
                    {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {e.source_tag ? ` · ${sourceLabel(e.source_tag)}` : ""}
                  </span>
                </span>
                {e.instagram && (
                  <a
                    href={`https://instagram.com/${e.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center text-sm font-semibold text-deep-navy underline underline-offset-2"
                  >
                    @{e.instagram}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
