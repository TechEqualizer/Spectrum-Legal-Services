"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon } from "@/admin/components/ui/icons";
import { formatNumber } from "@/admin/viz";

/** What /api/admin/eventbrite returns (never the token). */
type Status = {
  configured: boolean;
  connected: boolean;
  missing?: string[];
  orgName?: string | null;
  connectedAt?: string;
  lastOrderAt?: string | null;
  ticketsSynced?: number;
};

/** Why connecting didn't work (the callback's ?reason=), in words that say what to do. */
const REASONS: Record<string, string> = {
  state: "That Eventbrite sign-in expired or was started in another browser. Connect again from here.",
  denied: "Eventbrite wasn't connected because access wasn't allowed. Connect again when you're ready.",
  access: "Only this organizer's admins can connect its Eventbrite.",
  eventbrite: "Eventbrite didn't answer. Try again in a minute.",
  "no-organization": "That Eventbrite account has no organization selling tickets. Sign in with the account that sells this organizer's tickets.",
  webhook: "Eventbrite wouldn't send us order updates. Try again in a minute.",
  save: "Couldn't save the connection. Try again.",
  "not-configured": "Eventbrite connection isn't turned on yet.",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Settings → Eventbrite, for one organizer: connect their Eventbrite account
 * once so Results shows tickets sold per place a link was shared, see that
 * it's working, or disconnect.
 */
export default function EventbriteSettings({ organizer, fullAccess }: { organizer: { slug: string; name: string }; fullAccess: boolean }) {
  const id = useId();
  const params = useSearchParams();
  const returned = params.get("eventbrite");
  const reason = params.get("reason") ?? "";
  const sectionRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    returned === "connected"
      ? { tone: "ok", text: "Eventbrite connected. Tickets sold now show in Results and Share." }
      : returned === "error"
        ? { tone: "error", text: REASONS[reason] ?? "Eventbrite wasn't connected. Try again." }
        : null
  );
  const endpoint = `/api/admin/eventbrite?organizer=${encodeURIComponent(organizer.slug)}`;

  // Bumped to load the status again (after disconnecting).
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as Status | null;
        if (!current) return;
        if (!res.ok || !body) setLoadError("Couldn't check Eventbrite. Reload to try again.");
        else {
          setLoadError("");
          setStatus(body);
        }
      })
      .catch(() => current && setLoadError("Couldn't reach the server. Check your connection and reload."));
    return () => {
      current = false;
    };
  }, [endpoint, version]);

  // Back from Eventbrite (or a "Connect Eventbrite" link): bring this section into view.
  useEffect(() => {
    if (returned || window.location.hash === "#eventbrite") sectionRef.current?.scrollIntoView({ block: "start" });
  }, [returned]);

  const disconnect = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch(endpoint, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (!res?.ok) return setMessage({ tone: "error", text: "Couldn't disconnect Eventbrite. Try again." });
    setMessage({ tone: "ok", text: "Eventbrite disconnected. Tickets sold so far stay in Results." });
    setVersion((v) => v + 1);
  };

  return (
    <section id="eventbrite" ref={sectionRef} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <h2 id={`${id}-title`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Eventbrite</h2>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5">
        {message && (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={`mb-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${
              message.tone === "error" ? "bg-amber-50 text-amber-900" : "bg-teal-accent/15 text-teal-900"
            }`}
          >
            {message.tone === "ok" && <span className="mt-0.5 flex-shrink-0"><CheckIcon /></span>}
            {message.text}
          </p>
        )}

        {loadError ? (
          <p role="alert" className="text-sm text-amber-900">{loadError}</p>
        ) : !status ? (
          <p role="status" className="text-sm text-gray-600">Checking Eventbrite…</p>
        ) : !status.configured ? (
          fullAccess ? (
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-deep-navy">Eventbrite connection isn&apos;t turned on yet.</p>
              <p className="mt-1">Add these settings in Vercel, then redeploy:</p>
              <ul role="list" className="mt-2 flex flex-wrap gap-2">
                {(status.missing ?? []).map((name) => (
                  <li key={name}>
                    <code className="rounded bg-soft-gray px-2 py-1 text-xs font-semibold text-deep-navy">{name}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">The README&apos;s Eventbrite section says where each one comes from.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Eventbrite connection isn&apos;t turned on yet.</p>
          )
        ) : status.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="font-semibold text-deep-navy">Connected to {status.orgName || "Eventbrite"}</p>
              <p className="text-sm text-gray-600">
                {formatNumber(status.ticketsSynced ?? 0)} {status.ticketsSynced === 1 ? "ticket" : "tickets"} synced
                {status.lastOrderAt ? ` · last sale ${when(status.lastOrderAt)}` : " · no sales yet"}
              </p>
            </div>
            {confirming ? (
              <div className="-ml-3 flex basis-full flex-wrap items-center gap-1 sm:ml-0 sm:basis-auto">
                <span className="pl-3 text-sm text-gray-600 sm:pl-0">Disconnect? Sales so far stay.</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={disconnect}
                  className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  {busy ? "Disconnecting…" : "Disconnect"}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
                  Keep
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="-ml-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 sm:ml-0">
                Disconnect
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="min-w-0 flex-1 basis-64 text-sm text-gray-600">
              See tickets sold for {organizer.name}, by the place each link was shared. You sign in on Eventbrite; we never see your password.
            </p>
            {/* A plain link: the browser goes to Eventbrite and comes back here. */}
            <a
              href={`/api/admin/eventbrite/connect?organizer=${encodeURIComponent(organizer.slug)}`}
              className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
            >
              Connect Eventbrite
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
