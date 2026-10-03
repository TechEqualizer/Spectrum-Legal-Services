// Every shareable funnel link. Add a business by writing its funnel (see
// src/data/medspa.ts) and listing it here; its link is /f/<slug>. Private
// DM demos come from src/data/demos (scripts/new-demo.mjs).

import { demoFunnels } from "@/data/demos";
import type { Funnel } from "@/data/funnel-types";
import { eventsFunnel } from "@/data/events-sample";
import { medspaFunnel } from "@/data/medspa";
import { defaultFunnel } from "@/data/reels";

export const funnels: Funnel[] = [defaultFunnel, medspaFunnel, eventsFunnel, ...demoFunnels];

export function getFunnelBySlug(slug: string) {
  return funnels.find((funnel) => funnel.slug === slug);
}

export function getFunnelById(id: string) {
  return funnels.find((funnel) => funnel.id === id);
}
