// Server-only access to the Reel Funnels Supabase project.
//
// The site calls database functions (log_reel_event_v2, submit_lead_v3,
// join_waitlist) with the
// project's publishable key. The tables themselves are locked: see
// supabase/migrations/.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export async function callRpc<T = unknown>(
  fn: "log_reel_event_v2" | "submit_lead_v3" | "join_waitlist",
  args: Record<string, unknown>
): Promise<RpcResult<T>> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return { ok: false, status: 503, error: "Supabase is not configured" };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await res.text() };
    }
    const text = await res.text();
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
