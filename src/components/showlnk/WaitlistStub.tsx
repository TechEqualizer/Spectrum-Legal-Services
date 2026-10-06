"use client";

import { useId, useState } from "react";
import { isValidEmail } from "@/lib/leads";
import { getSourceTag } from "@/lib/reel-tracking";
import { instagramHandle } from "@/lib/waitlist";

type Field = "email" | "instagram";

/**
 * "Get on the list": early access to Showlnk as a gold admission stub. On
 * success the tab tears away and the stub is stamped.
 */
export default function WaitlistStub({ id }: { id: string }) {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: Field | "form"; text: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const website = (new FormData(e.currentTarget).get("website") as string) ?? "";
    if (!isValidEmail(email.trim())) return setError({ field: "email", text: "Enter your email, like name@example.com." });
    const handle = instagramHandle(instagram);
    if (!handle) {
      return setError({ field: "instagram", text: handle === null ? "That doesn't look like an Instagram handle. Try @yourname." : "Add your Instagram, so we can see your events." });
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), instagram, website, sourceTag: getSourceTag() }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { field?: Field; error?: string } | null;
    setBusy(false);
    if (res?.ok) return setDone(email.trim());
    setError({ field: body?.field ?? "form", text: !res ? "Couldn't reach Showlnk. Check your connection and try again." : body?.error ?? "Something went wrong. Try again." });
  };

  return (
    <form id={id} onSubmit={submit} noValidate className="sl-stub scroll-mt-24" {...(done ? { "data-done": "" } : {})} aria-labelledby={`${uid}-title`}>
      <div className="sl-stub-tab" aria-hidden="true">
        <span className="sl-display sl-vertical text-xl leading-none tracking-wide">Admit one</span>
        <span className="sl-vertical text-[11px] font-bold uppercase tracking-[0.2em]">Showlnk</span>
      </div>

      <div className="p-5 sm:p-6" aria-live="polite">
        {done ? (
          <div className="flex min-h-[148px] flex-col items-start justify-center gap-3">
            <span className="sl-stamp sl-display text-3xl sm:text-4xl">You&apos;re on the list</span>
            <p className="text-sm font-medium">
              We&apos;ll email <strong className="font-bold">{done}</strong> when your spot opens.
            </p>
          </div>
        ) : (
          <>
            <h2 id={`${uid}-title`} className="sl-display text-3xl sm:text-4xl">Get on the list</h2>
            <p className="mt-1 text-sm font-medium text-[var(--sl-ink)]/80">For event organizers and promoters. We&apos;re letting people in a few at a time.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
              <div>
                <label htmlFor={`${uid}-email`} className="mb-1 block text-xs font-bold uppercase tracking-wider">Email</label>
                <input
                  id={`${uid}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="sl-field"
                  placeholder="you@yourevents.com"
                  value={email}
                  aria-invalid={error?.field === "email"}
                  aria-describedby={error?.field === "email" ? `${uid}-error` : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error?.field === "email") setError(null);
                  }}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-ig`} className="mb-1 block text-xs font-bold uppercase tracking-wider">
                  Instagram
                </label>
                <input
                  id={`${uid}-ig`}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="sl-field"
                  placeholder="@yourevents"
                  value={instagram}
                  aria-invalid={error?.field === "instagram"}
                  aria-describedby={error?.field === "instagram" ? `${uid}-error` : undefined}
                  onChange={(e) => {
                    setInstagram(e.target.value);
                    if (error?.field === "instagram") setError(null);
                  }}
                />
              </div>
            </div>
            {/* Hidden from people; bots fill it in. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="submit" disabled={busy} className="sl-go inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                {busy ? "Saving your spot…" : "Get on the list"}
                {!busy && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </button>
              <span className="text-xs font-medium text-[var(--sl-ink)]/75">We&apos;ll only email you about early access.</span>
            </div>
            {error && (
              <p id={`${uid}-error`} role="alert" className="mt-3 text-sm font-bold text-[#7a170f]">
                {error.text}
              </p>
            )}
          </>
        )}
      </div>
    </form>
  );
}
