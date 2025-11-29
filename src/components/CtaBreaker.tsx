export default function CtaBreaker() {
  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      aria-label="Call to action"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-deep-navy via-deep-navy to-royal-blue"></div>

      {/* Decorative pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-teal-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-royal-blue/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
          Your Case Deserves Expert Attention.
          <span className="block mt-2 text-teal-accent">Let&apos;s Talk.</span>
        </h2>
        <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
          Don&apos;t navigate legal challenges alone. Our experienced attorneys are
          ready to fight for your rights and protect your interests.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contact"
            className="inline-flex items-center justify-center bg-teal-accent text-white font-semibold px-10 py-4 rounded-md shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-200 text-lg"
          >
            Request Consultation
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
          <a
            href="tel:+1-800-555-0199"
            className="inline-flex items-center justify-center border-2 border-white text-white font-semibold px-10 py-4 rounded-md hover:bg-white hover:text-deep-navy transition-all duration-200 text-lg"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            Call (800) 555-0199
          </a>
        </div>
      </div>
    </section>
  );
}
