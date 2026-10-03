import { site } from "@/config/site";
import type { LeadInput } from "@/lib/leads";
import { getSourceTag, getVisitorId } from "@/lib/reel-tracking";

export type SubmitLeadResult = { ok: true } | { ok: false; error: string };

const FALLBACK_ERROR = `We couldn't send your request. Please call us at ${site.phone.display}.`;

/** Sends an intake form to /api/leads, attaching the visitor id and link source. */
export async function submitLead(
  lead: Omit<LeadInput, "visitorId" | "sourceTag"> & { website?: string },
  /** Pretend to send, e.g. for a sample funnel; live: a live client's funnel, which sends even in demo mode. */
  { simulate = false, live = false } = {}
): Promise<SubmitLeadResult> {
  // The concept site and sample funnels never send or store what people type.
  if ((site.demoMode && !live) || simulate) return { ok: true };
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lead,
        visitorId: getVisitorId() ?? undefined,
        sourceTag: getSourceTag(),
      }),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? FALLBACK_ERROR };
  } catch {
    return { ok: false, error: FALLBACK_ERROR };
  }
}
