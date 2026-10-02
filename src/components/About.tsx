import { Eyebrow, headingClass } from "@/components/Brand";
import { site } from "@/config/site";

// From the firm's site and the attorney's public profiles (Justia, LawCrossing).
// Confirm with the firm before launch.
const credentials = [
  "Whittier Law School; admitted to the California Bar before graduation",
  "CALI awards for the highest grades in Evidence and Criminal Procedure",
  "Orange County Trial Lawyers Association",
  "Orange County Bar Association",
  "Consumer Attorneys Association of Los Angeles",
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
          {/* Photo placeholder: the firm's portrait goes here */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-royal-blue to-deep-navy shadow-2xl">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
                <svg
                  className="mb-4 h-20 w-20 opacity-40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <p className="text-sm font-semibold uppercase tracking-widest opacity-70">
                  Attorney photo
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-sky-accent/30 blur-2xl" />
          </div>

          <div>
            <Eyebrow className="text-2xl md:text-3xl">Meet</Eyebrow>
            <h2
              id="about-heading"
              className={`${headingClass} text-4xl text-deep-navy md:text-5xl`}
            >
              Attorney Jeff
            </h2>
            <hr className="my-6 border-gray-300" />

            <div className="space-y-4 text-charcoal text-lg">
              <p>
                {site.attorney.name} is the founder and lead attorney at{" "}
                {site.name}, also known as{" "}
                <strong className="text-teal-accent">Attorney Jeff</strong>,
                where he brings extensive legal experience and a commitment to
                achieving the best outcomes for his clients.
              </p>
              <p>
                Operating under both the JLF Firm brand and the well-recognized
                &ldquo;Attorney Jeff&rdquo; name, Jeff and his team offer
                personalized, results-oriented legal services with a focus on
                client satisfaction and accessibility.
              </p>
              <p>
                Jeff always knew he wanted to fight for injured victims. During
                law school he worked at several personal injury firms, building
                the experience he now uses to take on insurance companies.
              </p>
            </div>

            <ul className="mt-8 space-y-3" role="list">
              {credentials.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-accent">
                    <svg
                      className="h-4 w-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="font-medium text-charcoal">{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="#contact"
              className="mt-8 inline-flex items-center justify-center bg-teal-accent px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-md transition-all hover:brightness-110"
            >
              Talk to Attorney Jeff
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
