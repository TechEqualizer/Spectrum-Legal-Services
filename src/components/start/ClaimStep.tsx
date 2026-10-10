"use client";

import { useEffect, useId, useState } from "react";
import { CONTENT_RULE } from "@/lib/content-rule";
import { EVENT_SLUG, slugFromName } from "@/lib/new-event";
import { CORE_PRICE, FREE_FAN_LIMIT, TRIAL_DAYS } from "@/lib/plans";
import { httpsLink, needsTicketLink, nightName, suggestedName, type StartDraft } from "@/lib/start-draft";

type Field = "name" | "slug" | "tickets" | "email" | "password" | "agree";
type LinkCheck = "idle" | "checking" | "free" | "taken";

const INPUT =
  "mt-1.5 w-full rounded-xl border border-[var(--sl-line)] bg-[var(--sl-night)] px-3.5 py-3 text-base text-[var(--sl-text)] outline-none focus:border-[var(--sl-gold)] focus-visible:ring-2 focus-visible:ring-[var(--sl-gold)]/40 aria-[invalid=true]:border-[#ff9b8a]";
const LABEL = "text-sm font-semibold text-[var(--sl-text)]/85";
const ERROR = "mt-1.5 text-sm font-semibold text-[#ff9b8a]";

/**
 * Step 3 of the sign-up wizard: claim the link. Their name and link (checked
 * as they type), an email and password, the terms and the content rule.
 * Claiming makes everything at once and signs them in; the price shows
 * here, once, with the trial.
 */
export default function ClaimStep({ invite, draft, onClaimed, onBack }: { invite: string; draft: StartDraft; onClaimed: (eventSlug: string) => void; onBack: () => void }) {
  const id = useId();
  const [name, setName] = useState(() => suggestedName(draft));
  // The link follows the name until they change it themselves.
  const [ownSlug, setOwnSlug] = useState<string | null>(null);
  const slug = ownSlug ?? slugFromName(name);
  // Asked only when the flyer didn't say where to buy tickets.
  const askTickets = needsTicketLink(draft);
  const [tickets, setTickets] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [check, setCheck] = useState<{ slug: string; state: LinkCheck }>({ slug: "", state: "idle" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // Is the link free? Asked a moment after they stop typing.
  useEffect(() => {
    if (!EVENT_SLUG.test(slug)) return;
    let live = true;
    const t = setTimeout(() => {
      setCheck({ slug, state: "checking" });
      fetch(`/api/start/link?invite=${encodeURIComponent(invite)}&slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { free?: boolean } | null) => live && setCheck({ slug, state: d?.free === true ? "free" : d?.free === false ? "taken" : "idle" }))
        .catch(() => live && setCheck({ slug, state: "idle" }));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [slug, invite]);

  const linkState: LinkCheck = !slug ? "idle" : check.slug === slug ? check.state : "checking";
  const slugProblem = slug && !EVENT_SLUG.test(slug) ? "Use lowercase letters, numbers and dashes." : linkState === "taken" ? "That link is taken. Try another." : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const local: Partial<Record<Field, string>> = {};
    if (!name.trim()) local.name = "Add your name as fans see it.";
    if (!slug) local.slug = "Choose your link.";
    else if (slugProblem) local.slug = slugProblem;
    if (tickets.trim() && !httpsLink(tickets)) local.tickets = "Use your ticket page's web address, like https://www.eventbrite.com/e/…";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) local.email = "Enter your email address.";
    if (password.length < 8) local.password = "Use at least 8 characters.";
    if (!agree) local.agree = "Agree to the terms to claim your link.";
    setErrors(local);
    if (Object.keys(local).length) return;

    setSending(true);
    let timeZone: string | undefined;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}
    const res = await fetch("/api/start/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite, name: name.trim(), slug, ticketUrl: httpsLink(tickets) || undefined, email: email.trim(), password, agree, timeZone, draft: { dates: draft.dates, look: draft.look, reels: draft.reels, flyer: draft.flyer } }),
    }).catch(() => null);
    const out = (await res?.json().catch(() => null)) as { eventSlug?: string; field?: Field; error?: string } | null;
    if (res?.ok && out?.eventSlug) return onClaimed(out.eventSlug);
    setSending(false);
    if (out?.field) setErrors({ [out.field]: out.error });
    else setError(out?.error ?? "Couldn't reach Showlnk. Check your connection and try again.");
  };

  const described = (f: Field) => (errors[f] ? `${id}-${f}-error` : undefined);

  return (
    <section aria-labelledby={`${id}-title`} className="mt-10">
      <p className="text-sm font-semibold text-[var(--sl-gold)]">Step 3 of 3</p>
      <h1 id={`${id}-title`} className="sl-display mt-2 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.92]">
        Claim your link.
      </h1>
      <p className="mt-4 max-w-[34rem] text-lg text-[var(--sl-text)]/80">
        {nightName(draft)} is ready. Make it yours, then add your videos and share it.
      </p>

      <form noValidate onSubmit={submit} className="mt-8 grid grid-cols-1 gap-5 [&>*]:min-w-0">
        <div>
          <label htmlFor={`${id}-name`} className={LABEL}>
            Your name, as fans see it
          </label>
          <input id={`${id}-name`} value={name} maxLength={120} autoComplete="organization" onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={described("name")} className={INPUT} placeholder="e.g. Golden Hour" />
          {errors.name && <p id={`${id}-name-error`} className={ERROR}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor={`${id}-slug`} className={LABEL}>
            Your link
          </label>
          <div className="mt-1.5 flex items-center rounded-xl border border-[var(--sl-line)] bg-[var(--sl-night)] focus-within:border-[var(--sl-gold)]">
            <span className="shrink-0 pl-3.5 text-base text-[var(--sl-muted)]" aria-hidden="true">showlnk.com/f/</span>
            <input
              id={`${id}-slug`}
              value={slug}
              maxLength={64}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setOwnSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              aria-invalid={Boolean(errors.slug || slugProblem)}
              aria-describedby={`${id}-slug-status`}
              className="min-w-0 flex-1 bg-transparent py-3 pr-3.5 text-base text-[var(--sl-text)] outline-none"
            />
          </div>
          <p id={`${id}-slug-status`} role="status" className={errors.slug || slugProblem ? ERROR : "mt-1.5 text-sm text-[var(--sl-muted)]"}>
            {errors.slug || slugProblem || (linkState === "free" ? "✓ It's free. It's yours once you claim it." : linkState === "checking" ? "Checking…" : "")}
          </p>
        </div>

        {askTickets && (
          <div>
            <label htmlFor={`${id}-tickets`} className={LABEL}>
              Where fans buy tickets
            </label>
            <input
              id={`${id}-tickets`}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              value={tickets}
              onChange={(e) => setTickets(e.target.value)}
              aria-invalid={Boolean(errors.tickets)}
              aria-describedby={errors.tickets ? `${id}-tickets-error` : `${id}-tickets-hint`}
              className={INPUT}
              placeholder="https://"
            />
            {errors.tickets ? (
              <p id={`${id}-tickets-error`} className={ERROR}>{errors.tickets}</p>
            ) : (
              <p id={`${id}-tickets-hint`} className="mt-1.5 text-sm text-[var(--sl-muted)]">
                Your ticket page (Eventbrite, Posh, DICE…). Your flyer didn&apos;t say. You can add it later.
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor={`${id}-email`} className={LABEL}>
            Email
          </label>
          <input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={described("email")} className={INPUT} />
          {errors.email && <p id={`${id}-email-error`} className={ERROR}>{errors.email}</p>}
        </div>

        <div>
          <label htmlFor={`${id}-password`} className={LABEL}>
            Password
          </label>
          <div className="relative">
            <input
              id={`${id}-password`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? `${id}-password-error` : `${id}-password-hint`}
              className={`${INPUT} pr-20`}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-1.5 top-1/2 mt-[3px] min-h-11 -translate-y-1/2 px-3 text-sm font-semibold text-[var(--sl-gold)]">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password ? (
            <p id={`${id}-password-error`} className={ERROR}>{errors.password}</p>
          ) : (
            <p id={`${id}-password-hint`} className="mt-1.5 text-sm text-[var(--sl-muted)]">At least 8 characters. You&apos;ll sign in with it.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--sl-gold)]/45 bg-[var(--sl-gold)]/[0.06] p-5">
          <p className="text-sm font-semibold text-[var(--sl-gold)]">Core · free for {TRIAL_DAYS} days</p>
          <p className="mt-1 text-[var(--sl-text)]/85">
            Starts when you claim. After that, ${CORE_PRICE.month} a month or ${CORE_PRICE.year} a year, or stay on Free: your link, with Follow up to {FREE_FAN_LIMIT} fans. No card now.
          </p>
        </div>

        <div>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={Boolean(errors.agree)} aria-describedby={described("agree")} className="mt-1 size-5 shrink-0 accent-[var(--sl-gold)]" />
            <span className="text-sm text-[var(--sl-text)]/85">
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-[var(--sl-gold)] underline underline-offset-4">
                terms
              </a>{" "}
              and the content rule: <strong className="text-[var(--sl-text)]">{CONTENT_RULE.summary}</strong>
            </span>
          </label>
          {errors.agree && <p id={`${id}-agree-error`} className={ERROR}>{errors.agree}</p>}
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-[#ff9b8a]">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-12 items-center rounded-full bg-[var(--sl-gold)] px-8 text-base font-bold text-[var(--sl-ink)] hover:bg-[var(--sl-gold-deep)] disabled:opacity-60"
          >
            {sending ? "Claiming…" : "Claim my link"}
          </button>
          <button type="button" onClick={onBack} className="min-h-11 text-sm font-semibold text-[var(--sl-gold)] underline underline-offset-4">
            Back to your reels
          </button>
        </div>
      </form>
    </section>
  );
}
