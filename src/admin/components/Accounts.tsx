"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PlusIcon } from "@/admin/components/ui/icons";

type Account = { email: string; slugs: string[]; organizers: string[] };
type Organizer = { slug: string; name: string };
type Data = { me: string; accounts: Account[]; organizers: Organizer[] };

/** What an account can edit, in words. */
function accessOf(a: Account, organizers: Organizer[]) {
  if (a.slugs.includes("*")) return "Full access";
  const names = a.organizers.map((s) => organizers.find((o) => o.slug === s)?.name ?? s);
  const links = a.slugs.map((s) => `/f/${s}`);
  return [...names, ...links].join(", ") || "Nothing yet";
}

/**
 * Superadmin: every admin account, what each can edit, and adding,
 * changing or removing them. Only full admins see this; nobody edits
 * their own row.
 */
export default function Accounts() {
  const id = useId();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/accounts").catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res?.ok || !body) return setError(body?.error ?? "Couldn't load accounts. Reload to try again.");
    setError("");
    setData(body as Data);
  }, []);
  useEffect(() => {
    // Loads once; saving reloads.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch result, not derived state
    void load();
  }, [load]);

  const remove = async (email: string) => {
    const res = await fetch(`/api/admin/accounts?email=${encodeURIComponent(email)}`, { method: "DELETE" }).catch(() => null);
    setRemoving(null);
    if (!res?.ok) return setNotice(`Couldn't remove ${email}. Try again.`);
    setNotice(`${email} can't sign in to the admin any more.`);
    void load();
  };

  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="mb-2 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id={`${id}-title`} className="text-xs font-bold uppercase tracking-wider text-gray-600">Accounts</h2>
          <p className="mt-0.5 text-sm text-gray-600">Everyone who can sign in to the admin, and what they can edit.</p>
        </div>
        {data && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
          >
            <PlusIcon />
            Add account
          </button>
        )}
      </div>
      {notice && <p role="status" className="mb-2 px-1 text-sm font-semibold text-deep-navy">{notice}</p>}
      {!data ? (
        <p role={error ? "alert" : "status"} className={`rounded-xl border px-5 py-5 text-sm ${error ? "border-amber-200 bg-amber-50 text-amber-900" : "border-gray-200 bg-white text-gray-600"}`}>
          {error || "Loading accounts…"}
        </p>
      ) : (
        <ul role="list" className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {data.accounts.map((a) => {
            const me = a.email === data.me;
            return (
              <li key={a.email} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-deep-navy">
                    {a.email}
                    {me && <span className="ml-2 rounded-md bg-soft-gray px-2 py-0.5 text-xs font-semibold text-gray-700">You</span>}
                  </p>
                  <p className="truncate text-sm text-gray-600">{accessOf(a, data.organizers)}</p>
                </div>
                {!me && removing !== a.email && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setEditing(a)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray" aria-label={`Change access for ${a.email}`}>
                      Change
                    </button>
                    <button type="button" onClick={() => setRemoving(a.email)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50" aria-label={`Remove ${a.email}`}>
                      Remove
                    </button>
                  </div>
                )}
                {removing === a.email && (
                  <div className="flex basis-full flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 sm:basis-auto">
                    <span className="text-sm text-red-800">Remove their admin access?</span>
                    <button type="button" onClick={() => remove(a.email)} className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">
                      Remove
                    </button>
                    <button type="button" onClick={() => setRemoving(null)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-deep-navy hover:bg-white">
                      Keep
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {editing && data && (
        <AccountSheet
          account={editing === "new" ? undefined : editing}
          organizers={data.organizers}
          onClose={() => setEditing(null)}
          onSaved={(email, isNew) => {
            setEditing(null);
            setNotice(isNew ? `${email} added. Create their login in Supabase (Authentication → Add user) with this email.` : `${email} updated.`);
            void load();
          }}
        />
      )}
    </section>
  );
}

function AccountSheet({
  account,
  organizers,
  onClose,
  onSaved,
}: {
  account?: Account;
  organizers: Organizer[];
  onClose: () => void;
  onSaved: (email: string, isNew: boolean) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState(account?.email ?? "");
  const [full, setFull] = useState(account?.slugs.includes("*") ?? false);
  const [chosen, setChosen] = useState<string[]>(account?.organizers ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => ref.current?.showModal(), []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!full && !chosen.length) return setError("Give them full access or at least one organizer.");
    setBusy(true);
    const res = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full, organizers: chosen }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { email?: string; error?: string } | undefined;
    setBusy(false);
    if (!res?.ok || !body?.email) return setError(body?.error ?? "Couldn't save the account. Try again.");
    onSaved(body.email, !account);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto max-h-[92dvh] w-[min(30rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <form onSubmit={save} noValidate>
        <div className="px-5 pb-2 pt-5">
          <h2 id={`${id}-title`} className="text-xl font-bold text-deep-navy">{account ? "Change access" : "Add account"}</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {account ? account.email : "They sign in with this email. You'll create their login in Supabase next."}
          </p>
        </div>
        <div className="space-y-4 px-5 pb-5">
          <div className="divide-y divide-gray-100 rounded-xl bg-white">
            {!account && (
              <div className="px-4 py-3">
                <label htmlFor={`${id}-email`} className="text-sm font-semibold text-deep-navy">Email</label>
                <input
                  id={`${id}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  autoFocus
                  className="form-input mt-1 text-base"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            <fieldset className="px-4 py-3">
              <legend className="text-sm font-semibold text-deep-navy">Can edit</legend>
              <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
                <input type="radio" name={`${id}-access`} className="h-5 w-5 accent-teal-accent" checked={!full} onChange={() => setFull(false)} />
                Their organizers&apos; events
              </label>
              {!full && (
                <div className="ml-8 space-y-1">
                  {organizers.map((o) => (
                    <label key={o.slug} className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-teal-accent"
                        checked={chosen.includes(o.slug)}
                        onChange={(e) => setChosen((c) => (e.target.checked ? [...c, o.slug] : c.filter((s) => s !== o.slug)))}
                      />
                      <span>
                        {o.name} <span className="text-gray-600">/f/{o.slug}</span>
                      </span>
                    </label>
                  ))}
                  {!organizers.length && <p className="text-sm text-gray-600">No organizers yet.</p>}
                </div>
              )}
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="radio" name={`${id}-access`} className="h-5 w-5 accent-teal-accent" checked={full} onChange={() => setFull(true)} />
                Full access: every organizer, the demos and Accounts
              </label>
            </fieldset>
          </div>
          {error && <p role="alert" className="px-1 text-sm font-semibold text-red-700">{error}</p>}
        </div>
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-soft-gray/95 px-5 py-3 backdrop-blur">
          <button type="button" onClick={() => ref.current?.close()} className="ml-auto min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-deep-navy px-6 text-sm font-bold text-white hover:bg-royal-blue disabled:cursor-wait disabled:opacity-70">
            {busy ? "Saving…" : account ? "Save" : "Add account"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
