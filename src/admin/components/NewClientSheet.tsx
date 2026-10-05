"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EVENT_SLUG, slugFromName } from "@/lib/new-event";

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-accent";

type Field = "name" | "slug" | "eventName" | "eventSlug";

/**
 * Events → New client (full admins): the client's name and bio link, and
 * their first event's name and link. The studio then opens on that event's
 * Import flyer; Hand off gives the client their own login.
 */
export default function NewClientSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (eventSlug: string) => void }) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<Field, string>>({ name: "", slug: "", eventName: "", eventSlug: "" });
  // Links follow the names until someone types their own.
  const [edited, setEdited] = useState<{ slug: boolean; eventSlug: boolean }>({ slug: false, eventSlug: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: Field | "form"; text: string } | null>(null);
  useEffect(() => ref.current?.showModal(), []);

  const set = (key: Field, value: string) => {
    if (error?.field === key) setError(null);
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "name" && !edited.slug) next.slug = slugFromName(value);
      if (key === "eventName" && !edited.eventSlug) next.eventSlug = slugFromName(value);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, slug, eventName, eventSlug } = values;
    if (!name.trim()) return setError({ field: "name", text: "Give the client a name." });
    if (!EVENT_SLUG.test(slug)) return setError({ field: "slug", text: "Use lowercase letters, numbers and dashes for their link." });
    if (!eventName.trim()) return setError({ field: "eventName", text: "Give their first event a name." });
    if (!EVENT_SLUG.test(eventSlug)) return setError({ field: "eventSlug", text: "Use lowercase letters, numbers and dashes for the event's link." });
    if (eventSlug === slug) return setError({ field: "eventSlug", text: "The event needs its own link, different from the client's." });
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug, eventName: eventName.trim(), eventSlug }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { eventSlug?: string; field?: Field; error?: string } | undefined;
    if (res?.ok && body?.eventSlug) return onCreated(body.eventSlug);
    setBusy(false);
    setError({
      field: body?.field ?? "form",
      text: !res ? "Couldn't reach the server. Check your connection and try again." : res.status === 401 ? "Your sign-in expired. Sign in again, then try." : body?.error ?? "Couldn't add the client. Try again.",
    });
  };

  const text = (key: Field, label: string, placeholder: string) => (
    <div className="px-4 py-3">
      <label htmlFor={`${id}-${key}`} className="text-sm font-semibold text-deep-navy">{label}</label>
      <input
        id={`${id}-${key}`}
        className={field}
        maxLength={key === "name" ? 120 : 80}
        autoFocus={key === "name"}
        placeholder={placeholder}
        aria-invalid={error?.field === key}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      {error?.field === key && <p role="alert" className="mt-1.5 text-sm font-semibold text-red-700">{error.text}</p>}
    </div>
  );

  const link = (key: "slug" | "eventSlug", label: string, help: string) => (
    <div className="px-4 py-3">
      <label htmlFor={`${id}-${key}`} className="text-sm font-semibold text-deep-navy">{label}</label>
      <div className="mt-1 flex items-center rounded-lg border border-gray-300 bg-white focus-within:border-transparent focus-within:ring-2 focus-within:ring-teal-accent">
        <span className="pl-3 text-base text-gray-600">/f/</span>
        <input
          id={`${id}-${key}`}
          className="min-w-0 flex-1 rounded-lg bg-transparent py-2.5 pr-3 text-base text-charcoal focus:outline-none"
          maxLength={64}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error?.field === key}
          aria-describedby={`${id}-${key}-help`}
          value={values[key]}
          onChange={(e) => {
            setEdited((d) => ({ ...d, [key]: true }));
            set(key, e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
          }}
        />
      </div>
      {error?.field === key && <p role="alert" className="mt-1.5 text-sm font-semibold text-red-700">{error.text}</p>}
      <p id={`${id}-${key}-help`} className="mt-1.5 text-xs text-gray-600">{help}</p>
    </div>
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      className="m-auto max-h-[92dvh] w-[min(30rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-bold text-deep-navy">New client</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              Their own bio link and a first event. Build it from their flyer, then hand it off with their own login.
            </p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-white hover:text-deep-navy">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4 px-5 pb-5">
          <section aria-label="Client" className="divide-y divide-gray-100 rounded-xl bg-white">
            {text("name", "Client name", "Velvet Nights")}
            {link("slug", "Bio link", "Their permanent link: it always shows their next event.")}
          </section>
          <section aria-label="First event" className="divide-y divide-gray-100 rounded-xl bg-white">
            {text("eventName", "First event", "Velvet Nights: Halloween")}
            {link("eventSlug", "Event link", "This event's own link, for ads and flyers.")}
          </section>
          {error?.field === "form" && <p role="alert" className="px-1 text-sm font-semibold text-red-700">{error.text}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-soft-gray/95 px-5 py-3 backdrop-blur">
          <button type="button" onClick={() => ref.current?.close()} className="ml-auto min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-deep-navy px-6 text-sm font-bold text-white hover:bg-royal-blue disabled:cursor-wait disabled:opacity-70"
          >
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? "Creating…" : "Create client"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
