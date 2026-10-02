"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#practice-areas", label: "Practice Areas" },
  { href: "#videos", label: "Videos" },
  { href: "#about", label: "About" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#contact", label: "Contact" },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white shadow-md py-3"
          : "bg-white/95 backdrop-blur-sm py-4"
      }`}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <a
          href="#home"
          className="flex items-center gap-2 text-deep-navy font-bold text-xl md:text-2xl"
          aria-label="Spectrum Legal Services - Home"
        >
          <svg
            className="w-8 h-8 md:w-10 md:h-10"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="40" height="40" rx="8" fill="#0C1A2A" />
            <path
              d="M10 28V12L20 8L30 12V28L20 32L10 28Z"
              stroke="#1CB5A3"
              strokeWidth="2"
              fill="none"
            />
            <path d="M20 8V32" stroke="#1C4CBD" strokeWidth="2" />
            <circle cx="20" cy="18" r="4" fill="#1CB5A3" />
          </svg>
          <span className="hidden sm:inline">Spectrum Legal Services</span>
          <span className="sm:hidden">Spectrum Legal</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          <ul className="flex items-center gap-6" role="list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-charcoal hover:text-royal-blue font-medium transition-colors duration-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#contact"
            className="bg-teal-accent text-white font-semibold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md hover:brightness-110 transition-all duration-200"
          >
            Request Consultation
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-deep-navy"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          className={`lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg transition-all duration-300 ${
            isMobileMenuOpen
              ? "opacity-100 visible"
              : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <ul className="flex flex-col py-4" role="list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block px-6 py-3 text-charcoal hover:bg-soft-gray hover:text-royal-blue font-medium transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="px-6 pt-4">
              <a
                href="#contact"
                className="block text-center bg-teal-accent text-white font-semibold px-5 py-3 rounded-md shadow-sm hover:shadow-md hover:brightness-110 transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Request Consultation
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
