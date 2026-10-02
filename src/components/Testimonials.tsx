import { Eyebrow, headingClass } from "@/components/Brand";

// SAMPLE SLOTS ONLY. These are not real reviews. Replace them with the firm's
// actual Google reviews (with permission) before this concept goes live.
const sampleReviews = [
  { caseType: "Car Accident" },
  { caseType: "Motorcycle Accident" },
  { caseType: "Uber / Lyft Accident" },
];

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      className="section-padding bg-deep-navy"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-10 md:mb-14">
          <Eyebrow onDark>Client Reviews</Eyebrow>
          <h2
            id="testimonials-heading"
            className={`${headingClass} mt-1 text-4xl text-white md:text-5xl`}
          >
            What Our Clients Are Saying
          </h2>
          <p className="mt-4 max-w-2xl text-gray-300">
            Rated 5.0 on Google from 495+ reviews, as shown on the firm&apos;s
            website.
          </p>
        </div>

        <ul className="grid gap-6 md:grid-cols-3" role="list">
          {sampleReviews.map((review) => (
            <li
              key={review.caseType}
              className="flex flex-col rounded-xl border border-dashed border-white/25 bg-white/5 p-6"
            >
              <span className="text-yellow-400" aria-label="5 out of 5 stars">
                &#9733;&#9733;&#9733;&#9733;&#9733;
              </span>
              <p className="mt-4 flex-grow italic text-gray-300">
                Sample review slot. A verified Google review from a{" "}
                {review.caseType.toLowerCase()} client goes here.
              </p>
              <p className="mt-6 border-t border-white/10 pt-4 text-xs font-bold uppercase tracking-widest text-sky-accent">
                Sample &middot; {review.caseType}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
