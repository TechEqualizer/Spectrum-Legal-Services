// The built-in funnel links: demos and samples (made-up businesses). Real organizers' events live in the database (event_funnels;
// see src/lib/server/funnels.ts), not here. Private DM demos come from
// src/data/demos (scripts/new-demo.mjs).

import { demoFunnels } from "@/data/demos";
import type { Funnel } from "@/data/funnel-types";
import { eventsFunnel } from "@/data/events-sample";
import { medspaFunnel } from "@/data/medspa";

export const funnels: Funnel[] = [medspaFunnel, eventsFunnel, ...demoFunnels];

export function getFunnelBySlug(slug: string) {
  return funnels.find((funnel) => funnel.slug === slug);
}

export function getFunnelById(id: string) {
  return funnels.find((funnel) => funnel.id === id);
}
