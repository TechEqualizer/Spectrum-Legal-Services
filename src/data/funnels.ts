// The built-in funnel links: only private DM demos (src/data/demos, made by
// scripts/new-demo.mjs). Real organizers' events live in the database
// (event_funnels; see src/lib/server/funnels.ts), not here.

import { demoFunnels } from "@/data/demos";
import type { Funnel } from "@/data/funnel-types";

export const funnels: Funnel[] = [...demoFunnels];

export function getFunnelBySlug(slug: string) {
  return funnels.find((funnel) => funnel.slug === slug);
}

export function getFunnelById(id: string) {
  return funnels.find((funnel) => funnel.id === id);
}
