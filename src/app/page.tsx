import type { Metadata } from "next";
import { Big_Shoulders } from "next/font/google";
import Link from "next/link";
import Dock from "@/components/showlnk/Dock";
import ReelFan from "@/components/showlnk/ReelFan";
import WaitlistStub from "@/components/showlnk/WaitlistStub";
import "@/components/showlnk/showlnk.css";

// Showlnk's home page: the waitlist, set like a night's flyer.

const show = Big_Shoulders({ subsets: ["latin"], variable: "--font-show", axes: ["opsz"], display: "swap" });

const title = "Showlnk · Your flyer, as reels that sell the night";
const description =
  "Drop in your event flyer. Showlnk turns it into one link of vertical reels: the opening scene, The Night, Your People and Last Call, every one ending on your tickets. Get on the list for early access.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", siteName: "Showlnk" },
  twitter: { card: "summary", title, description },
};

const LINEUP = [
  { act: "Opening scene", question: "What is this night?", line: "Your title, your dates and Tickets, over your flyer or your video. The first look, in your own colors and type." },
  { act: "The Night", question: "Will this be amazing?", line: "Desire. Who they get to be that night, cut from your best moments." },
  { act: "Your People", question: "Is this for someone like me?", line: "Belonging. The crowd, the dress code, the vibe, from real nights only. No invented reviews." },
  { act: "Last Call", question: "Why buy now?", line: "The true reason to act: the date, the price that ends, the last tickets. Never fake scarcity." },
];

// Illustrative only, and labeled as such on the page.
const SAMPLE_SOURCES = [
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
  const most = Math.max(...SAMPLE_SOURCES.map((s) => s.visitors));
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
        {/* The flyer: three lines of type with the four reels fanned through them. */}
        <section aria-labelledby="sl-title" className="sl-wash relative">
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:pb-24 lg:pt-10">
            <h1 id="sl-title" className="sl-display relative z-0 text-[clamp(3.4rem,10.5vw,6rem)] lg:text-[clamp(6rem,7.6vw,8.5rem)]">
              <span className="block">Drop a flyer.</span>
              <span className="block text-[var(--sl-gold)]">Get four reels.</span>
              <span className="block">Sell the night.</span>
            </h1>

            <ReelFan className="relative z-10 mx-auto mt-8 w-full max-w-md lg:absolute lg:right-10 lg:top-2 lg:mt-0 lg:w-[45%] lg:max-w-[640px] xl:right-16" />

            <div className="relative z-20 mt-10 max-w-2xl lg:mt-14">
              <p className="max-w-[58ch] text-base leading-relaxed text-[var(--sl-text)]/90 sm:text-lg">
                Showlnk turns your event flyer into one link of vertical reels that sells your night. Every reel ends on your
                ticket page, and every ticket click shows which reel and which post brought it.
              </p>
              <div className="mt-8">
                <WaitlistStub id="join" />
              </div>
            </div>
          </div>
        </section>

        {/* The lineup: the four things, in the order a visitor meets them. */}
        <section aria-labelledby="sl-lineup" className="border-t border-[var(--sl-line)]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
              <div>
                <h2 id="sl-lineup" className="sl-display text-[clamp(2.75rem,6vw,5.5rem)]">Tonight&apos;s lineup</h2>
                <p className="mt-4 max-w-[42ch] text-[var(--sl-muted)]">
                  One flyer in, four things out. Each reel answers the question every guest asks before they buy, in the order
                  they ask it.
                </p>
              </div>
              <ol role="list" className="divide-y divide-[var(--sl-line)] border-y border-[var(--sl-line)]">
                {LINEUP.map((a) => (
                  <li key={a.act} className="sl-row grid gap-x-6 gap-y-2 py-6 sm:grid-cols-[minmax(0,15rem)_1fr] sm:py-7">
                    <h3 className="sl-act sl-display text-[clamp(2rem,4vw,3.25rem)]">{a.act}</h3>
                    <div className="sm:pt-1.5">
                      <p className="text-lg font-bold">&ldquo;{a.question}&rdquo;</p>
                      <p className="mt-1 max-w-[52ch] text-[var(--sl-muted)]">{a.line}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* The door list: which post sold the ticket. */}
        <section aria-labelledby="sl-traced" className="bg-[var(--sl-night-2)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div>
              <h2 id="sl-traced" className="sl-display text-[clamp(2.75rem,6vw,5.5rem)]">
                Know which post <span className="text-[var(--sl-gold)]">sold the ticket</span>
              </h2>
              <p className="mt-5 max-w-[50ch] text-[var(--sl-muted)]">
                Every tap on Tickets carries the reel and the place it came from: your bio, a story, TikTok, or the QR code on a
                printed flyer. You see what works before the next drop, not after the night.
              </p>
            </div>
            <figure className="rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night)] p-5 sm:p-7">
              <figcaption className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-bold">Ticket clicks by source</span>
                <span className="rounded-full border border-[var(--sl-lilac)]/50 px-2.5 py-0.5 text-xs font-bold text-[var(--sl-lilac)]">Sample numbers</span>
              </figcaption>
              <table className="mt-5 w-full text-left text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>Source</th>
                    <th>Visitors</th>
                    <th>Ticket clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_SOURCES.map((s) => (
                    <tr key={s.source} className="border-t border-[var(--sl-line)] first:border-t-0">
                      <td className="py-3 pr-3">
                        <span className="block font-semibold">{s.source}</span>
                        <span className="mt-2 block h-1.5 rounded-full bg-[var(--sl-line)]" aria-hidden="true">
                          <span className="block h-full rounded-full bg-[var(--sl-gold)]" style={{ width: `${(s.visitors / most) * 100}%` }} />
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-[var(--sl-muted)]">{s.visitors} visitors</td>
                      <td className="py-3 text-right font-bold tabular-nums text-[var(--sl-gold)]">{s.tickets} tickets</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
          </div>
        </section>

        {/* After the night: a quiet beat before the close. */}
        <section aria-labelledby="sl-after" className="border-t border-[var(--sl-line)]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 id="sl-after" className="sl-display max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
              The night ends. <span className="text-[var(--sl-lilac)]">The link doesn&apos;t.</span>
            </h2>
            <p className="mt-6 max-w-[56ch] text-lg text-[var(--sl-muted)]">
              When it&apos;s over, your link plays the recap and points to your next event. The link in your bio always shows
              what&apos;s next, so you never change it again.
            </p>
          </div>
        </section>

        {/* The close: the second stub. */}
        <section aria-labelledby="sl-close" className="sl-wash border-t border-[var(--sl-line)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-28 pt-20 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-28">
            <h2 id="sl-close" className="sl-display text-[clamp(3.4rem,9vw,8rem)]">
              Doors open <span className="text-[var(--sl-gold)]">soon.</span>
            </h2>
            <WaitlistStub id="join-close" />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--sl-line)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 pb-28 text-sm text-[var(--sl-muted)] sm:px-8 lg:pb-8">
          <span className="text-2xl leading-none text-[var(--sl-text)]">
            <Wordmark />
          </span>
          <span>© 2026 Showlnk. Reels that sell the night.</span>
          <Link href="/admin/login" className="flex min-h-11 items-center font-semibold hover:text-[var(--sl-text)]">
            Organizer log in
          </Link>
        </div>
      </footer>
      <Dock />
    </div>
  );
}
