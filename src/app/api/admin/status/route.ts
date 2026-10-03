import { NextResponse } from "next/server";
import { signInStatus } from "@/lib/server/admin-auth";

// Open this on the site's own address to see whether sign-in can work there:
// which settings this deployment has (never their values), and whether
// Supabase answers. Shows nothing secret.
export async function GET() {
  return NextResponse.json(
    {
      ...(await signInStatus()),
      flyerImport: { ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY?.trim()) },
      deployment: process.env.VERCEL_URL ?? null,
      environment: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
