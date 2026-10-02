"use client";

import { useState } from "react";
import { CASE_TYPES } from "@/lib/leads";
import { submitLead } from "@/lib/submit-lead";
import { Eyebrow, headingClass, Swoosh } from "@/components/Brand";
import { site } from "@/config/site";

// Selling points and rating as shown on jlffirm.com. Confirm with the firm
// before launch; the fee note keeps the "no fee" claim accurate.
const sellingPoints = [
  "5 Locations to Serve You",
  "Zero Fees Until We Win*",
  "We'll Evaluate Your Case for Free",
  "We'll Come to You",
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
    const result = await submitLead({
      source: "hero",
      ...formData,
      website,
    });
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
      className="relative min-h-screen flex items-center overflow-hidden pt-36 pb-16 lg:pt-40"
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
            <Eyebrow onDark className="mb-3">
              California Personal Injury Lawyers
            </Eyebrow>
            <h1 className={`${headingClass} text-[2rem] sm:text-5xl lg:text-6xl text-white`}>
              Award Winning{" "}
              <span className="relative inline-block">
                Car
                <Swoosh className="absolute -bottom-1 left-0 h-3 w-[260%] text-sky-accent sm:w-[300%]" />
              </span>{" "}
              &ndash; Motorcycle Accident Attorneys
            </h1>
            <p className="mt-5 text-sm font-medium text-gray-200 md:text-base">
              {[site.mainOffice.name, ...site.otherOffices].join(" | ")}
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2" role="list">
              {sellingPoints.map((point) => (
                <li key={point} className="flex items-center gap-2 text-base md:text-lg">
                  <svg
                    className="h-6 w-6 flex-shrink-0 text-sky-accent"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.7a1 1 0 00-1.4-1.4L11 12.6l-2.3-2.3a1 1 0 00-1.4 1.4l3 3a1 1 0 001.4 0l5-5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
              <a
                href="#case-evaluation"
                className="inline-flex items-center justify-center gap-3 bg-teal-accent px-7 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:brightness-110"
              >
                Free Case Evaluation
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
              <div className="text-sm">
                <p className="flex items-center gap-1 font-semibold">
                  <span className="text-yellow-400" aria-hidden="true">
                    &#9733;&#9733;&#9733;&#9733;&#9733;
                  </span>
                  <span>495+</span>
                </p>
                <p className="font-bold">5.0 Google Rated</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-200">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 1.94l7 3.11v4.45c0 4.18-2.94 8.07-7 9-4.06-.93-7-4.82-7-9V5.05l7-3.11zm3.7 6.36a1 1 0 00-1.4-1.42L9 10.18 7.7 8.88a1 1 0 00-1.4 1.42l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd" />
              </svg>
              100% Secure &amp; Confidential
            </p>
            <p className="mt-6 max-w-xl text-xs text-gray-400">
              *No attorney fees unless we recover compensation for you. You may
              still be responsible for case costs; ask us how fees and costs
              work in your case.
            </p>
          </div>

          {/* Right Content - Case evaluation form */}
          <div
            id="case-evaluation"
            className="bg-white rounded-xl shadow-2xl p-6 md:p-8 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className={`${headingClass} text-2xl text-deep-navy mb-2`}>
              Free Case Evaluation
            </h2>
            <p className="text-charcoal mb-6">
              Tell us what happened. It&apos;s free, and there&apos;s no
              obligation.
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
                  {site.demoMode ? "Demo: request not sent" : "Thank You!"}
                </h3>
                <p className="text-charcoal">
                  {site.demoMode
                    ? `This concept site doesn't send or store form details. On the live site, this request would go straight to ${site.name}.`
                    : "We've received your request and will be in touch soon."}
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
                    placeholder="Your name"
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
                    placeholder="you@example.com"
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
                  className="w-full bg-teal-accent text-white font-bold uppercase tracking-widest text-sm px-6 py-4 rounded-md shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Get My Free Case Review"}
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
