import type { Metadata } from "next";
import { Big_Shoulders } from "next/font/google";
import Link from "next/link";
import Dock from "@/components/showlnk/Dock";
import PhoneScene from "@/components/showlnk/PhoneScene";
import ReelStrip from "@/components/showlnk/ReelStrip";
import SourcesBoard from "@/components/showlnk/SourcesBoard";
import WaitlistStub from "@/components/showlnk/WaitlistStub";
import "@/components/showlnk/showlnk.css";

// Showlnk's home page: the waitlist, set like a night's flyer.

const show = Big_Shoulders({ subsets: ["latin"], variable: "--font-show", axes: ["opsz"], display: "swap" });

const title = "Showlnk · Don't just announce the night. Invite them into it.";
const description =
  "Drop in your event flyer. Showlnk turns it into one link of vertical reels: the opening scene, The Night, Your People and Last Call, every one ending on your tickets. Get on the list for early access.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", siteName: "Showlnk" },
  twitter: { card: "summary", title, description },
};

// What the organizer's board looks like, to show the idea.
const BOARD_SOURCES = [
  { source: "Instagram bio", visitors: 412, tickets: 61 },
  { source: "Instagram story", visitors: 268, tickets: 44 },
  { source: "TikTok bio", visitors: 190, tickets: 19 },
  { source: "QR code on the flyer", visitors: 74, tickets: 12 },
];

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`sl-display tracking-normal normal-case ${className}`}>
      show<span className="text-[var(--sl-gold)]">lnk</span>
    </span>
  );
}

export default function ShowlnkHome() {
  return (
    <div className={`sl ${show.variable} font-sans`}>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Showlnk home" className="text-[2rem] leading-none">
          <Wordmark />
        </Link>
        <nav aria-label="Showlnk" className="flex items-center gap-1 sm:gap-3">
          <Link href="/admin/login" className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-[var(--sl-muted)] hover:text-[var(--sl-text)]">
            Log in
          </Link>
          <a href="#join" className="hidden min-h-11 items-center rounded-full border border-[var(--sl-gold)]/60 px-5 text-sm font-bold text-[var(--sl-gold)] hover:bg-[var(--sl-gold)] hover:text-[var(--sl-ink)] sm:flex">
            Get on the list
          </a>
        </nav>
      </header>

      <main id="main-content">
        {/* The flyer: the headline in two beats and the stub, beside a real opening scene on a phone. */}
        <section aria-labelledby="sl-title" className="sl-wash relative">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-14 lg:pb-24 lg:pt-10">
            <div className="min-w-0">
              <h1 id="sl-title" className="sl-display text-[clamp(3.4rem,10.5vw,6rem)] lg:text-[clamp(5rem,6.9vw,7.5rem)]">
                {/* On phones the setup steps back so the invitation lands on its own. */}
                <span className="block max-lg:text-[0.6em] max-lg:leading-[0.95]">Don&apos;t just announce the night.</span>
                <span className="block text-[var(--sl-gold)] max-lg:mt-3">Invite them into it.</span>
              </h1>

              <div className="mt-10 max-w-2xl lg:mt-12">
                <p className="max-w-[58ch] text-[17px] leading-relaxed text-[var(--sl-text)]/75 sm:text-lg">
                  <span className="font-semibold text-[var(--sl-text)]">A flyer tells people when.</span> Showlnk turns it into one
                  link of experiences that let guests step inside the night before they buy, and shows you which post sold every
                  ticket.
                </p>
                <div className="mt-8">
                  <WaitlistStub id="join" />
                </div>
              </div>
            </div>

            {/* What a guest sees first when they tap the link: the real link, playing. */}
            <figure className="sl-phone-wrap mx-auto w-[min(78vw,300px)] lg:w-[clamp(260px,22vw,320px)]">
              <div className="sl-phone">
                <div className="sl-phone-screen">
                  <PhoneScene
                    src="/f/masquerade"
                    still="/showlnk/opening-scene.webp"
                    alt="Big Love Productions' Showlnk link on a phone: Masquerade on the Runway, Saturday October 31 at 8 PM, with Sneak peek inside and Get tickets buttons"
                  />
                </div>
              </div>
              <figcaption className="mt-4 text-center text-sm text-[var(--sl-muted)]">
                <span className="font-semibold text-[var(--sl-text)]">Big Love Productions</span>, live on Showlnk
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Big Love's night: one flyer, the four reels it became, and how. */}
        <section aria-labelledby="sl-lineup" className="border-t border-[var(--sl-line)]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end lg:gap-16">
              <h2 id="sl-lineup" className="sl-reveal sl-display text-[clamp(2.75rem,6vw,5.5rem)]">
                One flyer <span className="text-[var(--sl-gold)]">became this.</span>
              </h2>
              <p className="sl-reveal max-w-[52ch] text-[var(--sl-muted)] lg:pb-2">
                <span className="font-semibold text-[var(--sl-text)]">Big Love Productions</span> dropped one flyer for Masquerade
                on the Runway, Oct 31 in Detroit. Showlnk turned it into four reels, each answering what a guest asks before
                they buy, and every one ends on Tickets.
              </p>
            </div>
            <div className="mt-12 lg:mt-16">
              <ReelStrip />
            </div>
            {/* How the video comes to be, honestly. */}
            <ol role="list" aria-label="How it works" className="sl-reveal sl-steps mt-14 lg:mt-20">
              {["Drop in your flyer", "Showlnk drafts four reels and a shot list", "Add your clips or photos", "Publish one link that ends on Tickets"].map(
                (step, i) => (
                  <li key={step}>
                    <span className="sl-display text-2xl text-[var(--sl-gold)]">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                )
              )}
            </ol>
          </div>
        </section>

        {/* The door list: which post sold the ticket. */}
        <section aria-labelledby="sl-traced" className="bg-[var(--sl-night-2)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div>
              <h2 id="sl-traced" className="sl-reveal sl-display text-[clamp(2.75rem,6vw,5.5rem)]">
                Know which post <span className="text-[var(--sl-gold)]">sold the ticket</span>
              </h2>
              <p className="sl-reveal mt-5 max-w-[50ch] text-[var(--sl-muted)]">
                Every tap on Tickets carries the reel and the place it came from: your bio, a story, TikTok, or the QR code on a
                printed flyer. You see what works before the next drop, not after the night.
              </p>
            </div>
            <div className="sl-reveal">
              <SourcesBoard sources={BOARD_SOURCES} />
            </div>
          </div>
        </section>

        {/* After the night: a quiet beat before the close. */}
        <section aria-labelledby="sl-after" className="border-t border-[var(--sl-line)]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 id="sl-after" className="sl-reveal sl-display max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
              The night ends. <span className="text-[var(--sl-lilac)]">The link doesn&apos;t.</span>
            </h2>
            <p className="sl-reveal mt-6 max-w-[56ch] text-lg text-[var(--sl-muted)]">
              When it&apos;s over, your link plays the recap and points to your next event. The link in your bio always shows
              what&apos;s next, so you never change it again.
            </p>
          </div>
        </section>

        {/* The close: the second stub. */}
        <section aria-labelledby="sl-close" className="sl-wash border-t border-[var(--sl-line)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-28 pt-20 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-28">
            <h2 id="sl-close" className="sl-reveal sl-display text-[clamp(3.4rem,9vw,8rem)]">
              Doors open <span className="text-[var(--sl-gold)]">soon.</span>
            </h2>
            <div className="sl-reveal">
              <WaitlistStub id="join-close" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--sl-line)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 pb-28 text-sm text-[var(--sl-muted)] sm:px-8 lg:pb-8">
          <span className="text-2xl leading-none text-[var(--sl-text)]">
            <Wordmark />
          </span>
          <span>© 2026 Showlnk. Reels that sell the night.</span>
          <nav aria-label="Showlnk footer" className="flex flex-wrap items-center gap-x-5">
            <Link href="/terms" className="flex min-h-11 items-center hover:text-[var(--sl-text)]">
              Terms
            </Link>
            <Link href="/privacy" className="flex min-h-11 items-center hover:text-[var(--sl-text)]">
              Privacy
            </Link>
            <Link href="/admin/login" className="flex min-h-11 items-center font-semibold hover:text-[var(--sl-text)]">
              Organizer log in
            </Link>
          </nav>
        </div>
      </footer>
      <Dock />
    </div>
  );
}
