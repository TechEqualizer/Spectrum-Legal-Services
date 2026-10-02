const accomplishments = [
  "20+ Years of Combined Legal Experience",
  "Recognized in State Legal Associations",
  "Client Satisfaction Above 95%",
  "Hundreds of Successful Case Outcomes",
  "Community Legal Education Advocates",
];

export default function About() {
  return (
    <section
      id="about"
      className="section-padding bg-soft-gray overflow-hidden"
      aria-labelledby="about-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image Column */}
          <div className="relative">
            <div className="aspect-[4/3] bg-gradient-to-br from-deep-navy to-royal-blue rounded-2xl overflow-hidden shadow-2xl">
              {/* Placeholder for attorney/team image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <svg
                    className="w-24 h-24 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium opacity-70">
                    Our Legal Team
                  </p>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-teal-accent/20 rounded-full blur-2xl"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-royal-blue/20 rounded-full blur-2xl"></div>
          </div>

          {/* Content Column */}
          <div>
            <h2
              id="about-heading"
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-deep-navy mb-6"
            >
              Meet Spectrum Legal Services
            </h2>

            <div className="space-y-4 text-charcoal text-lg mb-8">
              <p>
                At Spectrum Legal Services, we believe that exceptional legal
                representation should be accessible to everyone. Our team of
                dedicated attorneys combines decades of experience with a
                client-first approach that puts your needs at the center of
                everything we do.
              </p>
              <p>
                Founded on the principles of integrity, clarity, and protection,
                we have built a reputation for delivering results while
                maintaining the highest ethical standards. Whether you&apos;re facing
                a complex legal challenge or planning for the future, we provide
                the guidance and advocacy you deserve.
              </p>
              <p>
                Our commitment extends beyond the courtroom. We take pride in
                educating our clients, empowering them to make informed decisions,
                and standing by their side through every step of the legal
                process.
              </p>
            </div>

            {/* Accomplishments */}
            <ul className="space-y-3 mb-8" role="list">
              {accomplishments.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-teal-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-charcoal font-medium">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href="#contact"
              className="inline-flex items-center justify-center bg-teal-accent text-white font-semibold px-8 py-4 rounded-md shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200"
            >
              Schedule a Consultation
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
      </div>
    </section>
  );
}
