"use client";

import { useState } from "react";
import { CASE_TYPES } from "@/lib/leads";
import { submitLead } from "@/lib/submit-lead";

const trustBadges = [
  { text: "20+ Years Combined Experience", icon: "award" },
  { text: "Trusted by 500+ Clients", icon: "users" },
  { text: "A+ Rated", icon: "star" },
];

const caseTypes = ["Select Case Type", ...CASE_TYPES];

export default function Hero() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    caseType: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Hidden spam trap; people never see or fill it.
  const [website, setWebsite] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    const result = await submitLead({ source: "hero", ...formData, website });
    setIsSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setIsSubmitted(true);
    setFormData({ name: "", email: "", caseType: "" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-20 pb-16"
      aria-label="Hero section"
    >
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-deep-navy via-deep-navy to-royal-blue opacity-95"></div>
        {/* Abstract legal pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-white animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
              Powerful Legal Representation You Can Trust
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-xl">
              Spectrum Legal Services delivers clarity, protection, and reliable
              results for individuals and businesses.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a
                href="#contact"
                className="inline-flex items-center justify-center bg-teal-accent text-white font-semibold px-8 py-4 rounded-md shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-200 text-lg"
              >
                Book Your Free Consultation
              </a>
              <a
                href="tel:+1-800-555-0199"
                className="inline-flex items-center justify-center border-2 border-white text-white font-semibold px-8 py-4 rounded-md hover:bg-white hover:text-deep-navy transition-all duration-200 text-lg"
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
                Call Now
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 md:gap-6">
              {trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg"
                >
                  {badge.icon === "award" && (
                    <svg
                      className="w-5 h-5 text-teal-accent"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                  {badge.icon === "users" && (
                    <svg
                      className="w-5 h-5 text-teal-accent"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  )}
                  {badge.icon === "star" && (
                    <svg
                      className="w-5 h-5 text-teal-accent"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Quick Contact Form */}
          <div
            className="bg-white rounded-xl shadow-2xl p-6 md:p-8 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="text-2xl font-bold text-deep-navy mb-2">
              Get Started Today
            </h2>
            <p className="text-charcoal mb-6">
              Fill out the form below and we&apos;ll contact you within 24 hours.
            </p>

            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-teal-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-deep-navy mb-2">
                  Thank You!
                </h3>
                <p className="text-charcoal">
                  We&apos;ve received your request and will be in touch soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="hero-name"
                    className="block text-sm font-medium text-charcoal mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="hero-name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="form-input"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hero-email"
                    className="block text-sm font-medium text-charcoal mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="hero-email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="form-input"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hero-case-type"
                    className="block text-sm font-medium text-charcoal mb-1"
                  >
                    Case Type
                  </label>
                  <select
                    id="hero-case-type"
                    name="caseType"
                    required
                    value={formData.caseType}
                    onChange={(e) =>
                      setFormData({ ...formData, caseType: e.target.value })
                    }
                    className="form-input"
                  >
                    {caseTypes.map((type, index) => (
                      <option key={index} value={index === 0 ? "" : type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-teal-accent text-white font-semibold px-6 py-4 rounded-md shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Request Free Consultation"}
                </button>

                {submitError && (
                  <p
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {submitError}
                  </p>
                )}

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="hero-website">Website</label>
                  <input
                    type="text"
                    id="hero-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By submitting this form, you agree to our{" "}
                  <a href="#" className="text-royal-blue hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
