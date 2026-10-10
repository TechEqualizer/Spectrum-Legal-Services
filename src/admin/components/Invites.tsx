"use client";

import { useEffect, useId, useState } from "react";
import CopyButton from "@/admin/components/ui/CopyButton";

type Invite = {
  id: string;
  note: string;
  created_at: string;
  expires_at: string;
  flyer_reads: number;
  claimed_at: string | null;
  claimed_organizer: string | null;
  revoked_at: string | null;
};

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Where an invite stands, in words. */
function statusOf(i: Invite, now: number) {
  if (i.revoked_at) return { text: "Revoked", open: false };
  if (i.claimed_at) return { text: `Joined${i.claimed_organizer ? ` as /f/${i.claimed_organizer}` : ""} on ${day(i.claimed_at)}`, open: false };
  if (Date.parse(i.expires_at) <= now) return { text: `Expired ${day(i.expires_at)}`, open: false };
  return { text: `Waiting · ${i.flyer_reads} of 5 flyers read · until ${day(i.expires_at)}`, open: true };
}

/**
 * Settings → Invites (full admins): sign-up is invite-only, so Showlnk makes
 * an invite link per organizer. The link is shown once, when it's made (only
 * its fingerprint is kept); a lost one is revoked and made again.
 */
export default function Invites() {
  const id = useId();
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ note: string; link: string } | null>(null);
  const [problem, setProblem] = useState("");
  const [now] = useState(() => Date.now());

  const load = () =>
    fetch("/api/admin/invites", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) setError(body?.error ?? "Couldn't load invites. Reload to try again.");
        else setInvites(body.invites as Invite[]);
      })
      .catch(() => setError("Couldn't reach the server. Reload to try again."));

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem("");
    const res = await fetch("/api/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) }).catch(() => null);
    const out = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !out?.link) return setProblem(out?.error ?? "Couldn't make the invite. Try again.");
    setMade({ note: note.trim(), link: out.link });
    setNote("");
    load();
  };

  const revoke = async (i: Invite) => {
    const res = await fetch(`/api/admin/invites?id=${i.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return setProblem(`Couldn't revoke the invite for ${i.note}. Try again.`);
    load();
  };

  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="mb-2 px-1">
        <h2 id={`${id}-title`} className="text-xs font-bold uppercase tracking-wider text-gray-600">Invites</h2>
        <p className="text-sm text-gray-600">Sign-up is by invite. Each link lets one organizer turn a flyer into their Showlnk link.</p>
      </div>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        <form onSubmit={create} className="px-4 py-4 sm:px-5">
          <label htmlFor={`${id}-note`} className="mb-1 block text-sm font-semibold text-deep-navy">
            Who&apos;s it for?
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${id}-note`}
              className="form-input min-w-0 flex-1 basis-56 text-sm"
              placeholder="e.g. DJ Mike, Velvet Room"
              maxLength={120}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="submit" disabled={busy || !note.trim()} className="min-h-11 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue disabled:opacity-40">
              {busy ? "Making…" : "Make invite link"}
            </button>
          </div>
          {problem && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{problem}</p>}
          {made && (
            <div role="status" className="mt-3 rounded-lg bg-soft-gray p-3">
              <p className="text-sm font-semibold text-deep-navy">Invite for {made.note}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 basis-full break-all text-xs text-deep-navy sm:basis-auto" aria-label="Invite link">
                  {made.link}
                </code>
                <CopyButton text={made.link} label="Copy link" announce="Invite link copied" className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50" />
              </div>
              <p className="mt-2 text-xs text-gray-600">Copy it now: for safety it&apos;s shown only once. Lost it? Revoke it and make another.</p>
            </div>
          )}
        </form>
        {error ? (
          <p role="alert" className="px-4 py-4 text-sm text-amber-900 sm:px-5">{error}</p>
        ) : !invites ? (
          <p role="status" className="px-4 py-4 text-sm text-gray-600 sm:px-5">Loading invites…</p>
        ) : invites.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-600 sm:px-5">No invites yet.</p>
        ) : (
          <ul role="list" aria-label="Invites" className="divide-y divide-gray-100">
            {invites.map((i) => {
              const s = statusOf(i, now);
              return (
                <li key={i.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-deep-navy">{i.note}</p>
                    <p className="text-xs text-gray-600">{s.text}</p>
                  </div>
                  {s.open && (
                    <button type="button" onClick={() => revoke(i)} aria-label={`Revoke the invite for ${i.note}`} className="min-h-11 flex-shrink-0 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                      Revoke
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
