import { Big_Shoulders } from "next/font/google";
import Link from "next/link";
import "@/components/showlnk/showlnk.css";
import ShowlnkLogo from "@/components/showlnk/ShowlnkLogo";

const show = Big_Shoulders({ subsets: ["latin"], variable: "--font-show", axes: ["opsz"], display: "swap" });

/**
 * A link whose organizer hasn't gone live yet, or isn't live anymore
 * (docs/plans/03-billing.md, "Pay to go live"): their name and "Coming soon",
 * never an error, and nothing about the night itself. The organizer can open
 * the real link from here once signed in.
 */
export default function ComingSoon({ name, slug }: { name: string; slug: string }) {
  return (
    <div className={`sl ${show.variable} flex min-h-dvh flex-col font-sans`}>
      <main id="main-content" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sl-gold)]">Coming soon</p>
        <h1 className="sl-display mt-4 break-words text-[clamp(2.75rem,11vw,5.5rem)] leading-[0.92]">{name}</h1>
        <p className="mt-6 max-w-[34rem] text-lg text-[var(--sl-text)]/80">This link isn&apos;t live yet. Check back soon for the next night.</p>
      </main>
      <footer className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 pb-8 text-sm text-[var(--sl-muted)] sm:px-8">
        <Link href="/" aria-label="Showlnk home" className="flex min-h-11 items-center">
          <ShowlnkLogo className="h-6 w-auto" />
        </Link>
        <Link href={`/admin/link/${slug}`} className="flex min-h-11 items-center underline-offset-4 hover:text-[var(--sl-text)] hover:underline">
          Is this your link? Preview it
        </Link>
      </footer>
    </div>
  );
}
