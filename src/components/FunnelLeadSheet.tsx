"use client";

import { useEffect, useId, useRef, useState } from "react";
import { site } from "@/config/site";
import type { Reel } from "@/data/reels";
import { isValidPhone, SMS_CONSENT_TEXT, type LeadIntent } from "@/lib/leads";
import { submitLead } from "@/lib/submit-lead";

type FunnelLeadSheetProps = {
  intent: LeadIntent;
  /** The reel on screen when the visitor tapped the button. */
  reel: Reel;
  onClose: () => void;
};

const copy: Record<LeadIntent, { heading: string; intro: string; submit: string }> = {
  book: {
    heading: "Get a free case review",
    intro: "Leave your number and Attorney Jeff's team will call you back.",
    submit: "Request my call back",
  },
  text_later: {
    heading: "Not ready to talk?",
    intro: "We'll text you the next video, so you can keep watching when it suits you.",
    submit: "Text me the next video",
  },
};

/**
 * The booking step inside the funnel: a short sheet over the reel, so
 * visitors never leave the videos to fill in a website form.
 */
export default function FunnelLeadSheet({ intent, reel, onClose }: FunnelLeadSheetProps) {
  const id = useId();
  const firstField = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  // Hidden spam trap; people never see or fill it.
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  const text = copy[intent];
  const textLater = intent === "text_later";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone.trim())) {
      setError("Please enter a mobile number with area code.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    const result = await submitLead({
      source: "funnel",
      intent,
      name,
      phone,
      email: email || undefined,
      caseType: reel.practiceArea,
      referringReelId: reel.id,
      smsConsent: textLater ? consent : undefined,
      website,
    });
    setIsSubmitting(false);
    if (result.ok) setSent(true);
    else setError(result.error);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end" role="presentation">
      <button
        type="button"
        aria-label="Close form"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <section
        aria-labelledby={`${id}-heading`}
        className="relative max-h-full w-full overflow-y-auto rounded-t-2xl bg-white px-5 pb-6 pt-5 text-charcoal shadow-2xl"
      >
        <div className="mx-auto max-w-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-accent">
                {reel.practiceArea}
              </p>
              <h2 id={`${id}-heading`} className="mt-1 text-xl font-bold text-deep-navy">
                {sent ? (textLater ? "You're all set" : "Thank you") : text.heading}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-soft-gray hover:text-deep-navy"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {sent ? (
            <div role="status" className="mt-3 space-y-4">
              <p className="text-sm text-gray-700">
                {site.demoMode
                  ? "Demo: nothing was sent. On the live link, this request goes straight to the firm."
                  : textLater
                    ? `Thanks, ${name.trim()}. The next video is on its way to ${phone.trim()}. Reply STOP any time to opt out.`
                    : `Thanks, ${name.trim()}. Attorney Jeff's team will call you at ${phone.trim()}.`}
              </p>
              <a
                href={site.phone.href}
                className="flex min-h-11 w-full items-center justify-center rounded-md border border-deep-navy/20 px-4 font-semibold text-deep-navy hover:bg-soft-gray"
              >
                Can&apos;t wait? Call {site.phone.display}
              </a>
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 w-full rounded-md bg-teal-accent px-4 font-semibold text-white hover:brightness-110"
              >
                Keep watching
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-1 space-y-3">
              <p className="text-sm text-gray-600">{text.intro}</p>
              <div>
                <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-semibold text-deep-navy">
                  {textLater ? "First name" : "Name"}
                </label>
                <input
                  ref={firstField}
                  id={`${id}-name`}
                  className="form-input"
                  autoComplete={textLater ? "given-name" : "name"}
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`${id}-phone`} className="mb-1 block text-sm font-semibold text-deep-navy">
                  Mobile number
                </label>
                <input
                  id={`${id}-phone`}
                  className="form-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  maxLength={50}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              {!textLater && (
                <div>
                  <label htmlFor={`${id}-email`} className="mb-1 block text-sm font-semibold text-deep-navy">
                    Email <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    id={`${id}-email`}
                    className="form-input"
                    type="email"
                    autoComplete="email"
                    maxLength={320}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}
              {textLater && (
                <label className="flex gap-3 text-xs leading-snug text-gray-600">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-5 w-5 flex-shrink-0 accent-teal-accent"
                  />
                  <span>{SMS_CONSENT_TEXT}</span>
                </label>
              )}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor={`${id}-website`}>Website</label>
                <input
                  id={`${id}-website`}
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full rounded-md bg-teal-accent px-4 font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : text.submit}
              </button>
              <p className="text-[11px] leading-snug text-gray-500">
                Your case review is free. Sending this does not create an
                attorney-client relationship.
                {site.demoMode && " Demo: nothing you enter is sent."}
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
