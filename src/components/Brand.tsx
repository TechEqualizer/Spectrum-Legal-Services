import { site } from "@/config/site";

/** "THE [JLF] FIRM" word mark with the "Car Accident Lawyer" line, after the firm's logo. */
export function JlfLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span className="flex items-center gap-1.5 text-lg tracking-wide sm:text-xl">
        <span className="font-medium">THE</span>
        <span className="border-2 border-current px-1.5 py-0.5 font-black tracking-tight">
          {site.shortName}
        </span>
        <span className="font-medium">FIRM</span>
      </span>
      <span className="mt-1 text-[9px] font-semibold tracking-[0.25em]">
        CAR ACCIDENT LAWYER
      </span>
    </span>
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
