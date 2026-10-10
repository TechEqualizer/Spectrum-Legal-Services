"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CORE_PRICE, hasCore, planSummary, type Plan } from "@/lib/plans";

type Loaded = { plan: Plan; billing: boolean; manage: boolean };
type State = { slug: string; data: Loaded | null; error: string };

/** What Core adds, in the organizer's terms. */
const CORE_FEATURES = [
  "Unlimited fans following you",
  "Fan-only reels",
  "Presale links for your followers",
  "Every night in your fans' calendars",
];

/** Back from Stripe: ?billing=started or ?billing=canceled. */
const returned = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("billing"));

/**
 * Settings → Plan, for one organizer: which plan they're on, in words; on
 * Free, what Core adds and Start Core (Stripe Checkout, monthly or yearly);
 * once they pay, Manage billing (Stripe's portal: card, receipts, cancel).
 */
export default function PlanSettings({ organizer, eventSlug }: { organizer: { slug: string; name: string }; eventSlug: string }) {
  const id = useId();
  const [state, setState] = useState<State>({ slug: "", data: null, error: "" });
  const [cadence, setCadence] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [back] = useState(returned);
  const sectionRef = useRef<HTMLElement>(null);

  // Back from Stripe (or a "#plan" link): bring this section into view.
  useEffect(() => {
    if (back || window.location.hash === "#plan") sectionRef.current?.scrollIntoView({ block: "start" });
  }, [back]);

  useEffect(() => {
    let current = true;
    // Back from paying, the plan changes when Stripe's webhook lands: look again a few times.
    let tries = back === "started" ? 6 : 1;
    const load = () =>
      fetch(`/api/admin/plan?slug=${encodeURIComponent(eventSlug)}`, { cache: "no-store" })
        .then(async (res) => {
          const body = await res.json().catch(() => null);
          if (!current) return;
          if (!res.ok || !body?.plan) return setState({ slug: eventSlug, data: null, error: body?.error ?? "Couldn't load your plan. Reload to try again." });
          setState({ slug: eventSlug, data: body as Loaded, error: "" });
          if (--tries > 0 && !hasCore(body.plan)) setTimeout(load, 2000);
        })
        .catch(() => current && setState({ slug: eventSlug, data: null, error: "Couldn't reach the server. Check your connection and reload." }));
    load();
    return () => {
      current = false;
    };
  }, [eventSlug, back]);

  const go = async (path: string, body: object) => {
    setBusy(true);
    setProblem("");
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const out = await res?.json().catch(() => null);
    if (res?.ok && out?.url) {
      window.location.assign(out.url);
      return;
    }
    setBusy(false);
    setProblem(out?.error ?? "Couldn't reach the server. Try again.");
  };

  const { data, error } = state.slug === eventSlug ? state : { data: null, error: "" };
  const plan = data?.plan;
  const summary = plan ? planSummary(plan) : null;
  const core = plan ? hasCore(plan) : false;
  const canStart = Boolean(data?.billing && plan && !core && plan.status !== "past_due");
  // A trial (no card yet) can start paying before it ends, too.
  const offer = canStart || Boolean(data?.billing && plan?.status === "trialing" && core);

  return (
    <section id="plan" ref={sectionRef} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <h2 id={`${id}-title`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Plan</h2>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5">
        {back === "started" && !core && data && (
          <p role="status" className="mb-3 rounded-lg bg-soft-gray px-3 py-2 text-sm text-deep-navy">Thanks. Core starts as soon as Stripe confirms the payment.</p>
        )}
        {back === "canceled" && (
          <p role="status" className="mb-3 rounded-lg bg-soft-gray px-3 py-2 text-sm text-deep-navy">Checkout was canceled. Nothing was charged.</p>
        )}
        {error ? (
          <p role="alert" className="text-sm text-amber-900">{error}</p>
        ) : !summary || !plan ? (
          <p role="status" className="text-sm text-gray-600">Loading your plan…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-bold text-deep-navy">{summary.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {organizer.name} · {summary.detail}
                </p>
              </div>
              {data?.billing && data.manage && (plan.status === "active" || plan.status === "past_due" || plan.status === "canceled") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => go("/api/admin/billing/portal", { slug: eventSlug })}
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray disabled:opacity-40"
                >
                  {plan.status === "past_due" ? "Update card" : "Manage billing"}
                </button>
              )}
            </div>
            {(offer || (!core && !data?.billing)) && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-deep-navy">
                  Core: ${CORE_PRICE.month}/month, or ${CORE_PRICE.year}/year
                </p>
                <ul role="list" className="mt-2 space-y-1.5 text-sm text-gray-600">
                  {CORE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="text-deep-navy">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {offer && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div role="radiogroup" aria-label="Billing" className="inline-grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1">
                      {(["month", "year"] as const).map((i) => (
                        <button
                          key={i}
                          type="button"
                          role="radio"
                          aria-checked={cadence === i}
                          onClick={() => setCadence(i)}
                          className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition ${cadence === i ? "bg-white text-deep-navy shadow-sm" : "text-gray-600 hover:text-deep-navy"}`}
                        >
                          {i === "month" ? `$${CORE_PRICE.month} monthly` : `$${CORE_PRICE.year} yearly`}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => go("/api/admin/billing/checkout", { slug: eventSlug, interval: cadence })}
                      className="min-h-11 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue disabled:opacity-40"
                    >
                      {busy ? "Opening…" : "Start Core"}
                    </button>
                  </div>
                )}
                {offer && (
                  <p className="mt-2 text-xs text-gray-600">
                    {cadence === "year" ? "Two months free. " : ""}You pay on Stripe&apos;s secure page; cancel any time from here.
                  </p>
                )}
              </div>
            )}
            {problem && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{problem}</p>}
          </>
        )}
      </div>
    </section>
  );
}
