"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const MIN = 10;

/**
 * Change password. With `firstTime`, it opens by itself after the first
 * sign-in (with a temporary password) and can't be skipped.
 */
export default function PasswordSheet({ firstTime = false, onClose }: { firstTime?: boolean; onClose?: () => void }) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => ref.current?.showModal(), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN) return setError(`Use at least ${MIN} characters.`);
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => null)) as { error?: string } | null;
      return setError(body?.error ?? "Couldn't reach the server. Check your connection and try again.");
    }
    setDone(true);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => firstTime && !done && e.preventDefault()}
      onClose={onClose}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/70"
    >
      {done ? (
        <div className="p-6 text-center">
          <p id={`${id}-title`} className="text-lg font-bold text-deep-navy">Password changed</p>
          <p className="mt-1 text-sm text-gray-600">Use it next time you sign in.</p>
          <button
            type="button"
            onClick={() => {
              ref.current?.close();
              // Picks up the new account state (no more password prompt).
              router.refresh();
            }}
            className="mt-5 min-h-11 w-full rounded-lg bg-deep-navy font-semibold text-white hover:bg-royal-blue">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="p-6">
          <h2 id={`${id}-title`} className="text-lg font-bold text-deep-navy">
            {firstTime ? "Choose your password" : "Change password"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {firstTime ? "You signed in with a temporary password. Pick your own to keep using the admin." : `At least ${MIN} characters.`}
          </p>
          <div className="mt-5 block">
          <label htmlFor={`${id}-new`} className="mb-1 block text-sm font-semibold text-deep-navy">New password</label>
            <span className="relative block">
              <input
                id={`${id}-new`}
                type={show ? "text" : "password"}
                autoComplete="new-password"
                className="form-input pr-16 text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 min-w-14 px-3 text-sm font-semibold text-teal-accent"
              >
                {show ? "Hide" : "Show"}
              </button>
            </span>
          </div>
          {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex gap-3">
            {!firstTime && (
              <button type="button" onClick={() => ref.current?.close()} className="min-h-11 flex-1 rounded-lg border border-gray-300 font-semibold text-deep-navy hover:bg-soft-gray">
                Cancel
              </button>
            )}
            <button type="submit" disabled={busy} className="min-h-11 flex-1 rounded-lg bg-deep-navy font-semibold text-white hover:bg-royal-blue disabled:opacity-60">
              {busy ? "Saving..." : "Save password"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
