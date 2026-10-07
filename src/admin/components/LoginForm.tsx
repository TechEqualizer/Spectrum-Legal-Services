"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

// Inputs on the night ground: a faint fill, a hairline that turns gold in focus.
const field =
  "block min-h-12 w-full rounded-xl border border-[var(--sl-line)] bg-white/[0.04] px-4 text-base text-[var(--sl-text)] transition placeholder:text-[var(--sl-muted)]/60 hover:border-[var(--sl-muted)]/50 focus:border-[var(--sl-gold)] focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[var(--sl-gold)]/30";

export default function LoginForm() {
  const id = useId();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => null)) as { error?: string } | null;
      setBusy(false);
      return setError(body?.error ?? "Couldn't reach the server. Check your connection and try again.");
    }
    // Only paths inside the admin.
    router.replace(next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin/home");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm" aria-labelledby={`${id}-title`}>
      <h1 id={`${id}-title`} className="sl-display text-[3.25rem]">Welcome back</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--sl-muted)]">Sign in to update your reels, see your ticket sales and share your link.</p>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-sm font-semibold">Email</span>
        <input
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          className={field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </label>
      <div className="mt-4 block">
        <label htmlFor={`${id}-password`} className="mb-1.5 block text-sm font-semibold">Password</label>
        <span className="relative block">
          <input
            id={`${id}-password`}
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${field} pr-16`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 min-w-14 rounded-r-xl px-3 text-sm font-semibold text-[var(--sl-gold)] hover:text-[var(--sl-text)]"
          >
            {show ? "Hide" : "Show"}
          </button>
        </span>
      </div>

      {error && <p id={`${id}-error`} role="alert" className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-7 min-h-12 w-full rounded-full bg-[var(--sl-gold)] text-base font-bold text-[var(--sl-ink)] transition hover:bg-[var(--sl-text)] disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
      <p className="mt-5 text-center text-[13px] text-[var(--sl-muted)]">Forgot your password? Ask the person who set up your admin.</p>
    </form>
  );
}
