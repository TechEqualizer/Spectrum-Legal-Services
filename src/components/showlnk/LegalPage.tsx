import { Big_Shoulders } from "next/font/google";
import Link from "next/link";
import "@/components/showlnk/showlnk.css";

// Showlnk's terms and privacy pages: the home page's night palette, set for reading.

const show = Big_Shoulders({ subsets: ["latin"], variable: "--font-show", axes: ["opsz"], display: "swap" });

/** Where people reach Showlnk, from settings: an email address and a postal address. */
export const contact = {
  email: process.env.SHOWLNK_CONTACT_EMAIL?.trim() || undefined,
  postal: process.env.SHOWLNK_POSTAL_ADDRESS?.trim() || undefined,
};

export function ContactLines() {
  return (
    <>
      {contact.email ? (
        <p>
          Email <a href={`mailto:${contact.email}`}>{contact.email}</a>.
        </p>
      ) : (
        <p>Our contact email is being set up and will appear here.</p>
      )}
      {contact.postal && <p>Post: {contact.postal}</p>}
    </>
  );
}

export default function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`sl ${show.variable} font-sans`}>
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Showlnk home" className="sl-display text-[2rem] leading-none tracking-normal normal-case">
          show<span className="text-[var(--sl-gold)]">lnk</span>
        </Link>
        <nav aria-label="Legal" className="flex items-center gap-1 text-sm font-semibold text-[var(--sl-muted)]">
          <Link href="/terms" className="flex min-h-11 items-center rounded-full px-3 hover:text-[var(--sl-text)]">
            Terms
          </Link>
          <Link href="/privacy" className="flex min-h-11 items-center rounded-full px-3 hover:text-[var(--sl-text)]">
            Privacy
          </Link>
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-5 pb-24 pt-6 sm:px-8">
        <h1 className="sl-display text-[clamp(2.75rem,8vw,4.5rem)]">{title}</h1>
        <p className="mt-3 text-sm text-[var(--sl-muted)]">Last updated {updated}</p>
        <div className="sl-intro mt-8 max-w-[62ch] text-[17px] leading-relaxed text-[var(--sl-text)]/85">{intro}</div>
        <div className="sl-legal mt-12 max-w-[62ch]">{children}</div>
      </main>
    </div>
  );
}
