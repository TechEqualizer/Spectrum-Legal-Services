const practiceAreas = [
  {
    icon: "family",
    title: "Family Law",
    description:
      "Compassionate guidance through divorce, custody, support, and other family matters.",
  },
  {
    icon: "shield",
    title: "Criminal Defense",
    description:
      "Aggressive defense strategies to protect your rights and freedom.",
  },
  {
    icon: "briefcase",
    title: "Business & Contract Law",
    description:
      "Strategic counsel for startups, corporations, and commercial disputes.",
  },
  {
    icon: "document",
    title: "Estate Planning",
    description:
      "Secure your legacy with wills, trusts, and comprehensive estate plans.",
  },
  {
    icon: "globe",
    title: "Immigration",
    description:
      "Navigate complex immigration processes with experienced legal support.",
  },
  {
    icon: "scale",
    title: "Civil Litigation",
    description:
      "Skilled representation in disputes, negotiations, and courtroom trials.",
  },
];

export default function PracticeAreas() {
  return (
    <section
      id="practice-areas"
      className="section-padding bg-white"
      aria-labelledby="practice-areas-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2
            id="practice-areas-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-deep-navy mb-4"
          >
            Areas of Expertise
          </h2>
          <p className="text-lg text-charcoal max-w-2xl mx-auto">
            Our experienced attorneys provide comprehensive legal services across
            multiple practice areas.
          </p>
        </div>

        {/* Practice Areas Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          {practiceAreas.map((area, index) => (
            <article
              key={index}
              className="group bg-soft-gray rounded-xl p-6 md:p-8 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100"
            >
              <div className="w-14 h-14 bg-royal-blue rounded-lg flex items-center justify-center mb-5 group-hover:bg-teal-accent transition-colors duration-300">
                {area.icon === "family" && (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                )}
                {area.icon === "shield" && (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                )}
                {area.icon === "briefcase" && (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
                {area.icon === "document" && (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                {area.icon === "globe" && (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                {area.icon === "scale" && (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-deep-navy mb-3">
                {area.title}
              </h3>
              <p className="text-charcoal">{area.description}</p>
            </article>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <a
            href="#contact"
            className="inline-flex items-center justify-center bg-royal-blue text-white font-semibold px-8 py-4 rounded-md shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200"
          >
            Explore All Services
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
