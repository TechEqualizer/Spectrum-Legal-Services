import Image from "next/image";
import { site } from "@/config/site";

/**
 * The firm's logo: white artwork on a transparent background, so it only
 * belongs on dark backgrounds (the header and footer are navy).
 */
export function JlfLogo({
  className = "h-12 w-auto sm:h-14 lg:h-16",
  eager = false,
}: {
  className?: string;
  /** Load immediately; use for the always-visible header copy. */
  eager?: boolean;
}) {
  return (
    <Image
      src="/brand/jlf-logo-white.png"
      alt={`${site.name}, Car Accident Lawyer`}
      width={450}
      height={204}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      className={className}
    />
  );
}

/** Small uppercase label above a section heading. */
export function Eyebrow({
  children,
  onDark = false,
  className = "",
}: {
  children: React.ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`text-sm font-bold uppercase tracking-[0.15em] ${
        onDark ? "text-sky-accent" : "text-teal-accent"
      } ${className}`}
    >
      {children}
    </p>
  );
}

/** The curved underline the firm puts under its headings. */
export function Swoosh({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M2 10C70 3 170 0 278 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const headingClass =
  "font-black uppercase leading-[1.05] tracking-tight";
