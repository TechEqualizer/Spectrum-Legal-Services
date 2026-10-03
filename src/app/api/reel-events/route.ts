import { getLiveFunnelById } from "@/lib/server/publications";
import { funnelReel } from "@/data/reels";
import type { ReelEvent } from "@/lib/reel-tracking";
import { callRpc } from "@/lib/server/supabase";
import { normalizeSourceTag } from "@/lib/source-tag";

const EVENTS: ReelEvent[] = [
  "viewed",
  "completed",
  "skipped",
  "exited",
  "cta_clicked",
  "call_clicked",
  "text_later_clicked",
  "shared",
  "liked",
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { visitorId, funnelId, reelId, event, sourceTag } = (body ?? {}) as Record<
    string,
    unknown
  >;
  // Sample funnels never log anything.
  const funnel = typeof funnelId === "string" ? await getLiveFunnelById(funnelId) : undefined;
  if (
    typeof visitorId !== "string" ||
    !UUID_PATTERN.test(visitorId) ||
    !funnel ||
    funnel.sample ||
    typeof reelId !== "string" ||
    !funnelReel(funnel, reelId) ||
    typeof event !== "string" ||
    !EVENTS.includes(event as ReelEvent)
  ) {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }

  const result = await callRpc("log_reel_event_v2", {
    p_visitor_id: visitorId,
    p_funnel_id: funnel.id,
    p_reel_id: reelId,
    p_event: event,
    // An unusable tag is dropped rather than failing the event.
    p_source_tag: normalizeSourceTag(sourceTag) ?? null,
  });
  if (!result.ok && result.status !== 503) {
    console.error("log_reel_event_v2 failed", result.status, result.error);
  }

  // Analytics never blocks the visitor, so report success either way.
  return new Response(null, { status: 204 });
}
