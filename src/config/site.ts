// Site-wide switches.

export const site = {
  /**
   * Demo mode: search engines are told not to index the site, and funnel
   * forms don't send or store anything unless the funnel is a live client's.
   * Set NEXT_PUBLIC_DEMO_MODE=false in production.
   */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
} as const;

/** Whether a page is part of the concept: demo mode, unless it's a live client's funnel. */
export const isConcept = (funnel?: { live?: boolean }) => site.demoMode && !funnel?.live;
