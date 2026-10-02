// Every shareable funnel link. Add a business by writing its funnel (see
// src/data/medspa.ts) and listing it here; its link is /f/<slug>.

import type { Funnel } from "@/data/funnel-types";
import { medspaFunnel } from "@/data/medspa";
import { defaultFunnel } from "@/data/reels";

export const funnels: Funnel[] = [defaultFunnel, medspaFunnel];

export function getFunnelBySlug(slug: string) {
  return funnels.find((funnel) => funnel.slug === slug);
}

export function getFunnelById(id: string) {
  return funnels.find((funnel) => funnel.id === id);
}
