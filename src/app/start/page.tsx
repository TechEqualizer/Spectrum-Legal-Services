import type { Metadata } from "next";
import { Big_Shoulders } from "next/font/google";
import Link from "next/link";
import Wizard from "@/components/start/Wizard";
import { inviteStatus, type InviteStatus } from "@/lib/server/invites";
import "@/components/showlnk/showlnk.css";

// The sign-up wizard (docs/plans/05-signup.md): an invited organizer turns
// their flyer into their Showlnk link. Invite-only for now: without a
// usable invite, it says why and who to ask.

const show = Big_Shoulders({ subsets: ["latin"], variable: "--font-show", axes: ["opsz"], display: "swap" });

export const metadata: Metadata = {
  title: "Make your link · Showlnk",
  description: "Drop your flyer. Watch your night become a link that sells it.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ invite?: string }> };

const STOPPED: Record<Exclude<InviteStatus, "valid">, { title: string; text: string; signIn?: boolean }> = {
  expired: { title: "This invite has expired", text: "Invites last 30 days. Ask Showlnk for a new one and you'll be making your link in a minute." },
  claimed: { title: "This invite has been used", text: "A link was already made with it. If it's yours, sign in to see it.", signIn: true },
  revoked: { title: "This invite was withdrawn", text: "Ask Showlnk for a new one." },
  unknown: { title: "Showlnk is invite-only for now", text: "Make sure you have the whole invite link. No invite yet? Join the waitlist and we'll be in touch." },
};

export default async function StartPage({ searchParams }: Props) {
  const { invite = "" } = await searchParams;
  const s = invite ? await inviteStatus(invite) : { status: "unknown" as const, readsLeft: 0 };

  return (
    <div className={`sl ${show.variable} font-sans`}>
      <header className="mx-auto flex max-w-6xl items-center px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Showlnk home" className="sl-display text-[2rem] leading-none tracking-normal normal-case">
          show<span className="text-[var(--sl-gold)]">lnk</span>
        </Link>
      </header>
      <main id="main-content">
        {!s ? (
          <Notice title="We couldn't check your invite" text="Try again in a minute." />
        ) : s.status === "valid" ? (
          <Wizard invite={invite} readsLeft={s.readsLeft} />
        ) : (
          <Notice {...STOPPED[s.status]} />
        )}
      </main>
    </div>
  );
}

function Notice({ title, text, signIn }: { title: string; text: string; signIn?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
      <h1 className="sl-display text-[clamp(2.25rem,8vw,3.5rem)] leading-[0.95]">{title}</h1>
      <p className="mt-5 max-w-[36rem] text-lg text-[var(--sl-text)]/80">{text}</p>
      <div className="mt-9">
        <Link
          href={signIn ? "/admin/login" : "/"}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--sl-gold)] px-7 text-base font-bold text-[var(--sl-ink)] hover:bg-[var(--sl-gold-deep)]"
        >
          {signIn ? "Sign in" : "Go to Showlnk"}
        </Link>
      </div>
    </div>
  );
}
