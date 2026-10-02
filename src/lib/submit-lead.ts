import type { LeadInput } from "@/lib/leads";
import { getVisitorId } from "@/lib/reel-tracking";

export type SubmitLeadResult = { ok: true } | { ok: false; error: string };

const FALLBACK_ERROR =
  "We couldn't send your request. Please call us at (800) 555-0199.";

/** Sends an intake form to /api/leads, attaching the reel-funnel visitor id. */
export async function submitLead(
  lead: Omit<LeadInput, "visitorId"> & { website?: string }
): Promise<SubmitLeadResult> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, visitorId: getVisitorId() ?? undefined }),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? FALLBACK_ERROR };
  } catch {
    return { ok: false, error: FALLBACK_ERROR };
  }
}
