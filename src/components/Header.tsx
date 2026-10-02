"use client";

import { useState, useEffect } from "react";
import { JlfLogo } from "@/components/Brand";
import { site } from "@/config/site";

const navLinks = [
  { href: "#videos", label: "Videos" },
  { href: "#practice-areas", label: "Practice Areas" },
  { href: "#about", label: "About Us" },
  { href: "#testimonials", label: "Reviews" },
  { href: "#contact", label: "Contact Us" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-deep-navy text-white transition-shadow duration-300 ${
        isScrolled ? "shadow-lg" : ""
      }`}
      role="banner"
    >
      {site.demoMode && (
        <p className="bg-black/40 px-4 py-1.5 text-center text-[11px] leading-snug text-gray-200 sm:text-xs">
          Concept preview prepared for {site.name}. Not the firm&apos;s
          official website:{" "}
          <a
            href={site.officialUrl}
            className="font-semibold text-white underline underline-offset-2"
          >
            visit jlffirm.com
          </a>
        </p>
      )}
      <nav
        className="flex items-stretch justify-between"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <a
          href="#home"
          className="flex min-h-11 flex-shrink-0 items-center px-4 py-2 md:px-6"
          aria-label={`${site.name} - Home`}
        >
          <JlfLogo eager />
        </a>

        {/* Desktop Navigation */}
        <ul
          className="hidden flex-1 items-center justify-center gap-5 lg:flex xl:gap-9"
          role="list"
        >
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="whitespace-nowrap text-sm font-bold uppercase tracking-widest text-white transition-colors hover:text-sky-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* 24/7 phone box, as on the firm's site */}
        <a
          href={site.phone.href}
          className="hidden flex-shrink-0 flex-col items-center justify-center bg-sky-accent px-6 py-2 text-deep-navy transition-colors hover:bg-white lg:flex xl:px-10"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-jeff-green" aria-hidden="true" />
            Available 24/7
          </span>
          <span className="text-2xl font-black tracking-tight xl:text-3xl">
            {site.phone.display}
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest">
            Free Case Evaluation
          </span>
        </a>

        {/* Mobile: call button and menu */}
        <div className="flex items-center gap-1 pr-2 lg:hidden">
          <a
            href={site.phone.href}
            className="flex h-11 items-center gap-2 rounded-md bg-sky-accent px-3 text-sm font-bold text-deep-navy"
            aria-label={`Call ${site.phone.display}, available 24/7`}
          >
            <svg
              className="h-5 w-5"
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
            <span className="hidden sm:inline">{site.phone.display}</span>
            <span className="sm:hidden">Call</span>
          </a>
          <button
            className="flex h-11 w-11 items-center justify-center text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isMobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          className={`lg:hidden absolute top-full left-0 right-0 bg-deep-navy shadow-lg transition-all duration-300 ${
            isMobileMenuOpen
              ? "opacity-100 visible"
              : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <ul className="flex flex-col border-t border-white/10 py-4" role="list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5 hover:text-sky-accent"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="px-6 pt-4">
              <a
                href="#contact"
                className="block rounded-md bg-teal-accent px-5 py-3 text-center text-sm font-bold uppercase tracking-widest text-white transition-all hover:brightness-110"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Free Case Evaluation
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
