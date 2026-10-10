"use client";

import { useEffect, useState } from "react";
import { useAdminBusiness, useAdminEvents } from "@/admin/AdminBusiness";
import PeopleTabs from "@/admin/components/PeopleTabs";
import LocalDate from "@/components/LocalDate";
import { sourceLabel } from "@/lib/source-tag";

/** One follow, as /api/admin/fans returns it (the database's organizer_fans). */
type Fan = { email: string; source_tag: string | null; funnel_id: string | null; confirmed_at: string; unfollowed_at: string | null };
type Loaded = { organizer: { slug: string; name: string }; followOn: boolean; fans: Fan[] };
type State = { slug: string; data: Loaded | null; error: string };

/**
 * The organizer's fans: everyone following them (newest first), where each
 * one followed from, the list as a CSV to keep, and removing someone. One
 * list per organizer, whichever of their events is picked.
 */
export default function Fans() {
  const slug = useAdminBusiness().funnel.slug;
  const events = useAdminEvents();
  const [state, setState] = useState<State>({ slug: "", data: null, error: "" });
  // The fan asked about ("Remove?"), and one just removed, for the status line.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let current = true;
    fetch(`/api/admin/fans?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!current) return;
        if (!res.ok || !body?.fans) setState({ slug, data: null, error: body?.error ?? "Couldn't load your fans. Reload to try again." });
        else setState({ slug, data: body as Loaded, error: "" });
      })
      .catch(() => current && setState({ slug, data: null, error: "Couldn't reach the server. Check your connection and reload." }));
    return () => {
      current = false;
    };
  }, [slug]);

  const { data, error } = state.slug === slug ? state : { data: null, error: "" };
  const following = data?.fans.filter((f) => !f.unfollowed_at) ?? [];
  const unfollowed = (data?.fans.length ?? 0) - following.length;
  const eventName = (funnelId: string | null) => {
    const e = funnelId ? events.find((x) => x.funnel.id === funnelId) : undefined;
    return e ? (e.live.cover.hero?.title ?? e.live.brand.seriesLabel) : undefined;
  };

  const remove = async (email: string) => {
    setConfirming(null);
    const res = await fetch(`/api/admin/fans?slug=${encodeURIComponent(slug)}&email=${encodeURIComponent(email)}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setMessage(`Couldn't remove ${email}. Try again.`);
      return;
    }
    setState((s) => (s.data ? { ...s, data: { ...s.data, fans: s.data.fans.filter((f) => f.email !== email) } } : s));
    setMessage(`Removed ${email}. They won't hear from you through Showlnk.`);
  };

  return (
    <div className="space-y-6">
      <PeopleTabs />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Fans</h1>
          <p className="text-sm text-gray-600">
            {data ? `People following ${data.organizer.name}. ` : ""}They asked to hear about your nights first. Your list, yours to keep.
          </p>
        </div>
        {following.length > 0 && (
          <a
            href={`/api/admin/fans/export?slug=${encodeURIComponent(slug)}`}
            download
            className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
          >
            Export CSV
          </a>
        )}
      </div>

      {data && !data.followOn && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Follow isn&apos;t switched on for your links yet, so new fans can&apos;t join. Ask Showlnk to switch it on.
        </p>
      )}

      {message && (
        <p role="status" className="rounded-lg bg-soft-gray px-4 py-3 text-sm text-deep-navy">
          {message}
        </p>
      )}

      {error ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900">
          {error}
        </p>
      ) : !data ? (
        <p role="status" className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-gray-600">
          Loading fans…
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-wider text-gray-600">Following</dt>
              <dd className="mt-1 text-2xl font-black text-deep-navy">{following.length}</dd>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-wider text-gray-600">Unfollowed</dt>
              <dd className="mt-1 text-2xl font-black text-deep-navy">{unfollowed}</dd>
            </div>
          </dl>

          {following.length === 0 ? (
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center" aria-labelledby="no-fans-title">
              <h2 id="no-fans-title" className="text-lg font-bold text-deep-navy">No fans yet</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
                When someone taps Follow on your link and confirms by email, they show up here.
              </p>
            </section>
          ) : (
            <section aria-labelledby="fan-list-title">
              <h2 id="fan-list-title" className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">
                {following.length === 1 ? "1 fan" : `${following.length} fans`}, newest first
              </h2>
              <ul role="list" className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {following.map((f) => (
                  <li key={f.email} className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-deep-navy">{f.email}</span>
                      <span className="block text-sm text-gray-600">
                        {[sourceLabel(f.source_tag ?? undefined), eventName(f.funnel_id)].filter(Boolean).join(" · ")} · <LocalDate iso={f.confirmed_at} />
                      </span>
                    </span>
                    {confirming === f.email ? (
                      <span className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Remove from your list?</span>
                        <button type="button" onClick={() => remove(f.email)} className="min-h-11 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50">
                          Remove
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(f.email)}
                        aria-label={`Remove ${f.email}`}
                        className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 px-1 text-xs text-gray-600">
                Only contact fans about your nights, as they agreed. Anyone removed here is removed from your exports too, so delete them from any copy you keep.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
