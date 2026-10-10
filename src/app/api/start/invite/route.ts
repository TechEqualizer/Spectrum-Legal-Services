import { NextResponse } from "next/server";
import { inviteStatus } from "@/lib/server/invites";

// The sign-up wizard checks its invite: GET ?code= -> { status, readsLeft }.
// Says nothing about whom it's for.

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const s = await inviteStatus(code);
  if (!s) return NextResponse.json({ error: "Couldn't check the invite. Try again in a minute." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
}
