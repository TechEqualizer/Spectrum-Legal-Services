"use client";

import { useEffect, useState } from "react";
import {
  CONSULTATION_REQUEST_EVENT,
  type ConsultationRequestDetail,
} from "@/lib/consultation";
import { CASE_TYPES, isCaseType, isValidEmail } from "@/lib/leads";
import { submitLead } from "@/lib/submit-lead";
import { Eyebrow, headingClass } from "@/components/Brand";
import { site } from "@/config/site";

const caseTypes = ["Select Case Type", ...CASE_TYPES];

const contactInfo = [
  {
    icon: "phone",
    title: "Call 24/7",
    content: site.phone.display,
    href: site.phone.href,
  },
  {
    icon: "location",
    title: `${site.mainOffice.name} Office`,
    content: `${site.mainOffice.street}\n${site.mainOffice.city}`,
  },
  {
    icon: "phone",
    title: `${site.mainOffice.name} Office Phone`,
    content: site.mainOffice.phone.display,
    href: site.mainOffice.phone.href,
  },
  {
    icon: "location",
    title: "Also Serving",
    content: site.otherOffices.join(" \u00b7 "),
  },
  {
    icon: "clock",
    title: "Availability",
    content: "Available 24/7\nWe'll come to you",
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    caseType: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  // Hidden spam trap; people never see or fill it.
  const [website, setWebsite] = useState("");
  // The video that sent the visitor here, saved with the lead.
  const [referringReelId, setReferringReelId] = useState<string>();

  // Another section (e.g. a video's "Book" button) asked for a consultation:
  // preselect its case type and bring the visitor to the form.
  useEffect(() => {
    const onRequest = (e: Event) => {
      const { caseType, reelId } = (e as CustomEvent<ConsultationRequestDetail>)
        .detail;
      if (!isCaseType(caseType)) return;
      setIsSubmitted(false);
      setReferringReelId(reelId);
      setFormData((prev) => ({ ...prev, caseType }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.caseType;
        return next;
      });
      document
        .getElementById("contact")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      requestAnimationFrame(() =>
        document
          .getElementById("contact-name")
          ?.focus({ preventScroll: true })
      );
    };
    window.addEventListener(CONSULTATION_REQUEST_EVENT, onRequest);
    return () =>
      window.removeEventListener(CONSULTATION_REQUEST_EVENT, onRequest);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email.trim())) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (!formData.caseType) {
      newErrors.caseType = "Please select a case type";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError("");
    const result = await submitLead({
      source: "contact",
      ...formData,
      referringReelId,
      website,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setIsSubmitted(true);
    setReferringReelId(undefined);
    setFormData({
      name: "",
      email: "",
      phone: "",
      caseType: "",
      message: "",
    });
  };

  return (
    <section
      id="contact"
      className="section-padding bg-soft-gray"
      aria-labelledby="contact-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Eyebrow>Contact Us</Eyebrow>
          <h2
            id="contact-heading"
            className={`${headingClass} mt-1 text-4xl md:text-5xl text-deep-navy mb-4`}
          >
            Free Case Evaluation
          </h2>
          <p className="text-lg text-charcoal max-w-2xl mx-auto">
            Tell us about your accident. We&apos;ll evaluate your case for free,
            and you pay no attorney fees unless we win.*
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Contact Form */}
          <div className="min-w-0 lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-teal-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-teal-accent"
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
                  <h3 className="text-2xl font-bold text-deep-navy mb-3">
                    {site.demoMode ? "Demo: message not sent" : "Message Sent Successfully!"}
                  </h3>
                  <p className="text-charcoal mb-6">
                    {site.demoMode
                      ? `This concept site doesn't send or store form details. On the live site, this message would go straight to ${site.name}.`
                      : "Thank you for reaching out. Our team will review your message and get back to you shortly."}
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-royal-blue font-semibold hover:underline"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-sm font-medium text-charcoal mb-2"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="contact-name"
                        name="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className={`form-input ${
                          errors.name ? "border-red-500" : ""
                        }`}
                        placeholder="Your name"
                        aria-describedby={errors.name ? "name-error" : undefined}
                      />
                      {errors.name && (
                        <p id="name-error" className="mt-1 text-sm text-red-500">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-sm font-medium text-charcoal mb-2"
                      >
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="contact-email"
                        name="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className={`form-input ${
                          errors.email ? "border-red-500" : ""
                        }`}
                        placeholder="you@example.com"
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                      {errors.email && (
                        <p id="email-error" className="mt-1 text-sm text-red-500">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="contact-phone"
                        className="block text-sm font-medium text-charcoal mb-2"
                      >
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="contact-phone"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className={`form-input ${
                          errors.phone ? "border-red-500" : ""
                        }`}
                        placeholder="Your phone number"
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                      />
                      {errors.phone && (
                        <p id="phone-error" className="mt-1 text-sm text-red-500">
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-case-type"
                        className="block text-sm font-medium text-charcoal mb-2"
                      >
                        Case Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="contact-case-type"
                        name="caseType"
                        value={formData.caseType}
                        onChange={(e) =>
                          setFormData({ ...formData, caseType: e.target.value })
                        }
                        className={`form-input ${
                          errors.caseType ? "border-red-500" : ""
                        }`}
                        aria-describedby={
                          errors.caseType ? "caseType-error" : undefined
                        }
                      >
                        {caseTypes.map((type, index) => (
                          <option key={index} value={index === 0 ? "" : type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {errors.caseType && (
                        <p
                          id="caseType-error"
                          className="mt-1 text-sm text-red-500"
                        >
                          {errors.caseType}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-sm font-medium text-charcoal mb-2"
                    >
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className={`form-input resize-none ${
                        errors.message ? "border-red-500" : ""
                      }`}
                      placeholder="Tell us what happened and when..."
                      aria-describedby={
                        errors.message ? "message-error" : undefined
                      }
                    ></textarea>
                    {errors.message && (
                      <p id="message-error" className="mt-1 text-sm text-red-500">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-teal-accent text-white font-semibold px-8 py-4 rounded-md shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Send Message"
                    )}
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
                    <label htmlFor="contact-website">Website</label>
                    <input
                      type="text"
                      id="contact-website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    Please don&apos;t include confidential details. Contacting us
                    doesn&apos;t create an attorney-client relationship. If you
                    watched our videos, we include which ones with your request
                    so we can follow up on the right topic.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Contact Sidebar */}
          <div className="min-w-0 space-y-6">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-royal-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {info.icon === "location" && (
                      <svg
                        className="w-6 h-6 text-royal-blue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                    {info.icon === "phone" && (
                      <svg
                        className="w-6 h-6 text-royal-blue"
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
                    )}
                    {info.icon === "email" && (
                      <svg
                        className="w-6 h-6 text-royal-blue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    {info.icon === "clock" && (
                      <svg
                        className="w-6 h-6 text-royal-blue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-deep-navy mb-1">
                      {info.title}
                    </h3>
                    {info.href ? (
                      <a
                        href={info.href}
                        className="inline-block py-2 text-charcoal hover:text-royal-blue transition-colors whitespace-pre-line [overflow-wrap:anywhere]"
                      >
                        {info.content}
                      </a>
                    ) : (
                      <p className="text-charcoal whitespace-pre-line">
                        {info.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Map Placeholder */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="text-center p-6">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-400"
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
                  <p className="text-gray-500 text-sm">Map Integration</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
