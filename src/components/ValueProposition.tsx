const values = [
  {
    icon: "compass",
    title: "Clear Guidance",
    description: "We simplify complex legal issues.",
  },
  {
    icon: "trophy",
    title: "Proven Results",
    description: "Hundreds of successful outcomes.",
  },
  {
    icon: "heart",
    title: "Client-Focused",
    description: "Your goals lead the strategy.",
  },
  {
    icon: "dollar",
    title: "Transparent Fees",
    description: "No surprises. Honest billing.",
  },
];

export default function ValueProposition() {
  return (
    <section
      className="bg-soft-gray py-12 md:py-16"
      aria-labelledby="value-proposition-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 id="value-proposition-heading" className="sr-only">
          Why Choose Spectrum Legal Services
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {values.map((value, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 md:p-6"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-royal-blue/10 rounded-full flex items-center justify-center mb-4">
                {value.icon === "compass" && (
                  <svg
                    className="w-7 h-7 md:w-8 md:h-8 text-royal-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                )}
                {value.icon === "trophy" && (
                  <svg
                    className="w-7 h-7 md:w-8 md:h-8 text-royal-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                )}
                {value.icon === "heart" && (
                  <svg
                    className="w-7 h-7 md:w-8 md:h-8 text-royal-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                )}
                {value.icon === "dollar" && (
                  <svg
                    className="w-7 h-7 md:w-8 md:h-8 text-royal-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-deep-navy mb-2">
                {value.title}
              </h3>
              <p className="text-charcoal text-sm md:text-base">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
