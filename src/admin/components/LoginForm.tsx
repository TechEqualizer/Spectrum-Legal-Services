"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

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
    router.replace(next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8" aria-labelledby={`${id}-title`}>
      <p className="text-xs font-bold uppercase tracking-widest text-teal-accent">Reel Funnel Admin</p>
      <h1 id={`${id}-title`} className="mt-1 text-2xl font-bold text-deep-navy">Sign in</h1>
      <p className="mt-1 text-sm text-gray-600">Edit your reels and publish them to your link.</p>

      <label className="mt-6 block">
        <span className="mb-1 block text-sm font-semibold text-deep-navy">Email</span>
        <input
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          className="form-input text-base"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </label>
      <div className="mt-4 block">
          <label htmlFor={`${id}-password`} className="mb-1 block text-sm font-semibold text-deep-navy">Password</label>
        <span className="relative block">
          <input
                id={`${id}-password`}
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="form-input pr-16 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
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

      {error && <p id={`${id}-error`} role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 min-h-12 w-full rounded-lg bg-deep-navy text-base font-semibold text-white transition hover:bg-royal-blue disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
      <p className="mt-4 text-center text-xs text-gray-500">Forgot your password? Ask the person who set up your admin.</p>
    </form>
  );
}
