"use client";

import { useState } from "react";

const testimonials = [
  {
    quote:
      "Spectrum Legal Services handled my divorce case with professionalism and compassion. They made an incredibly difficult time much more manageable.",
    name: "Sarah M.",
    caseType: "Family Law",
    rating: 5,
  },
  {
    quote:
      "When I faced criminal charges, I was terrified. Their defense team fought for me and got the charges reduced. Forever grateful.",
    name: "Michael R.",
    caseType: "Criminal Defense",
    rating: 5,
  },
  {
    quote:
      "Outstanding business law expertise. They helped us navigate a complex contract dispute and protected our company's interests.",
    name: "Jennifer T.",
    caseType: "Business Law",
    rating: 5,
  },
  {
    quote:
      "The estate planning team was thorough and patient. They explained every detail and gave us peace of mind for our family's future.",
    name: "Robert & Linda K.",
    caseType: "Estate Planning",
    rating: 5,
  },
  {
    quote:
      "After years of immigration struggles, Spectrum helped me finally achieve my dream. Their knowledge of immigration law is exceptional.",
    name: "Carlos D.",
    caseType: "Immigration",
    rating: 5,
  },
  {
    quote:
      "Professional, responsive, and genuinely caring. They kept me informed every step of the way during my civil litigation case.",
    name: "Amanda P.",
    caseType: "Civil Litigation",
    rating: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${
            i < rating ? "text-yellow-400" : "text-gray-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCount = 3;

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev + visibleCount >= testimonials.length ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - visibleCount : prev - 1
    );
  };

  return (
    <section
      id="testimonials"
      className="section-padding bg-white"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2
            id="testimonials-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-deep-navy mb-4"
          >
            What Our Clients Say
          </h2>
          <p className="text-lg text-charcoal max-w-2xl mx-auto">
            Real stories from real clients who trusted us with their legal
            matters.
          </p>
        </div>

        {/* Desktop Carousel */}
        <div className="hidden md:block relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="w-1/3 flex-shrink-0 px-4"
                  aria-label={`Testimonial from ${testimonial.name}`}
                >
                  <div className="bg-soft-gray rounded-xl p-6 h-full flex flex-col">
                    <StarRating rating={testimonial.rating} />
                    <blockquote className="mt-4 flex-grow">
                      <p className="text-charcoal italic">
                        &ldquo;{testimonial.quote}&rdquo;
                      </p>
                    </blockquote>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="font-semibold text-deep-navy">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-royal-blue">
                        {testimonial.caseType}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-soft-gray transition-colors"
            aria-label="Previous testimonial"
          >
            <svg
              className="w-6 h-6 text-deep-navy"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-soft-gray transition-colors"
            aria-label="Next testimonial"
          >
            <svg
              className="w-6 h-6 text-deep-navy"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Grid */}
        <div className="md:hidden grid gap-6">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <div
              key={index}
              className="bg-soft-gray rounded-xl p-6"
              aria-label={`Testimonial from ${testimonial.name}`}
            >
              <StarRating rating={testimonial.rating} />
              <blockquote className="mt-4">
                <p className="text-charcoal italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="font-semibold text-deep-navy">{testimonial.name}</p>
                <p className="text-sm text-royal-blue">{testimonial.caseType}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dot Indicators (Desktop) */}
        <div className="hidden md:flex justify-center gap-2 mt-8">
          {Array.from({
            length: testimonials.length - visibleCount + 1,
          }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentIndex === index ? "bg-teal-accent" : "bg-gray-300"
              }`}
              aria-label={`Go to testimonial set ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
