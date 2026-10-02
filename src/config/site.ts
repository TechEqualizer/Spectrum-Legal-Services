// Firm details used across the site, in one place.
//
// CONCEPT SITE: this is a sales mock-up for The JLF Firm, built from the
// firm's public directory listings (Justia, LawCrossing). It is not the
// firm's official website. Have the firm confirm every detail before launch.

export const site = {
  name: "The JLF Firm",
  shortName: "JLF",
  attorney: {
    name: "Jeffrey L. Fayngor",
    title: "Founder & Managing Attorney",
  },
  officialUrl: "https://jlffirm.com",
  /** The 24/7 line in the header of jlffirm.com. */
  phone: {
    display: "888-973-0162",
    href: "tel:+18889730162",
  },
  mainOffice: {
    name: "Downey",
    street: "8255 Firestone Ave, Suite 207",
    city: "Downey, CA 90241",
    phone: { display: "(562) 222-3069", href: "tel:+15622223069" },
  },
  otherOffices: ["El Monte", "Riverside", "San Bernardino", "Pomona"],
  /**
   * Demo mode keeps the concept honest: a banner says it isn't the firm's
   * site, search engines are told not to index it, and the intake forms
   * don't send or store anything. Set NEXT_PUBLIC_DEMO_MODE=false only once
   * the firm has approved the site and leads should reach them.
   */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
} as const;
