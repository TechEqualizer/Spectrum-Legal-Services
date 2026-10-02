import { defaultFunnel, getReel } from "@/data/reels";
import type { ReelEvent } from "@/lib/reel-tracking";
import { callRpc } from "@/lib/server/supabase";

const EVENTS: ReelEvent[] = [
  "viewed",
  "completed",
  "skipped",
  "cta_clicked",
  "exited",
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

  const { visitorId, funnelId, reelId, event } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (
    typeof visitorId !== "string" ||
    !UUID_PATTERN.test(visitorId) ||
    funnelId !== defaultFunnel.id ||
    typeof reelId !== "string" ||
    !getReel(reelId) ||
    typeof event !== "string" ||
    !EVENTS.includes(event as ReelEvent)
  ) {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }

  const result = await callRpc("log_reel_event", {
    p_visitor_id: visitorId,
    p_funnel_id: funnelId,
    p_reel_id: reelId,
    p_event: event,
  });
  if (!result.ok && result.status !== 503) {
    console.error("log_reel_event failed", result.status, result.error);
  }

  // Analytics never blocks the visitor, so report success either way.
  return new Response(null, { status: 204 });
}
