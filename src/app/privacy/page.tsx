import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { ContactLines } from "@/components/showlnk/LegalPage";

// What Showlnk keeps about the people who visit event links and follow
// organizers, who sees it, and how to leave.

export const metadata: Metadata = {
  title: "Privacy · Showlnk",
  description: "What Showlnk keeps when you watch an event link, sign up or follow an organizer, who sees it, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="October 10, 2026"
      intro={
        <p>
          Showlnk runs event links for organizers. This note is for the people who watch those links, sign up on them or follow an
          organizer. In short: we keep little, the organizer sees what you give them, we never sell it, and you can leave at any
          time. Organizers using Showlnk are covered by the <Link href="/terms">organizer terms</Link>.
        </p>
      }
    >
      <h2>What we keep</h2>
      <p>
        <strong>When you watch a link:</strong> a random id kept in your browser (not your name), which reels you watched or
        skipped, which buttons you tapped, and the tag on the link you came from (Instagram, a text, a QR code). If your browser
        sends Global Privacy Control or Do Not Track, we keep none of this.
      </p>
      <p>
        <strong>When you fill in a form:</strong> what you typed (your name, phone or email, and any message), and, if you asked
        for texts, the exact consent wording you agreed to.
      </p>
      <p>
        <strong>When you follow an organizer:</strong> your email, who you follow, when and from which link, the wording you
        agreed to, and a cookie that keeps you signed in as a follower on that browser.
      </p>
      <p>
        <strong>When you buy tickets:</strong> you buy from the organizer&apos;s ticketing provider, under its own privacy
        policy. If the organizer connected it, we keep the order number, how many tickets, the amount and the link it came from,
        so they can see which post sold the night. We don&apos;t keep your name or email from the order.
      </p>

      <h2>Who sees it</h2>
      <ul>
        <li>
          <strong>The organizer</strong> of the link, and the people on their team, see your sign-ups, follows and what was
          watched on their own links. Organizers don&apos;t see each other&apos;s.
        </li>
        <li>
          <strong>Our service providers</strong> host and send it for us: Vercel (the website), Supabase (the database) and Resend
          (email).
        </li>
        <li>
          <strong>YouTube</strong> plays some reels, in its privacy-enhanced mode. When one plays, YouTube&apos;s own privacy
          policy applies to it.
        </li>
        <li>We never sell it, and never use it for ads.</li>
      </ul>

      <h2>Emails and texts</h2>
      <p>
        You only get messages you asked for. Every email from Showlnk has a one-tap link to unfollow. Texts come from the organizer,
        and replying STOP ends them.
      </p>

      <h2>Removing yourself</h2>
      <p>
        You can unfollow from any email. To have everything about you deleted (your follows, sign-ups and email), write to us and
        we&apos;ll delete it, and tell the organizer to delete any copy they exported. You can also clear the id in your browser
        by clearing this site&apos;s data.
      </p>

      <h2>How long we keep it</h2>
      <p>
        For as long as the organizer uses Showlnk, unless you ask us to delete it first. When an organizer leaves, their
        followers and sign-ups are deleted.
      </p>

      <h2>Children</h2>
      <p>Showlnk isn&apos;t meant for anyone under 13, and we don&apos;t knowingly keep anything about them.</p>

      <h2>Contact</h2>
      <ContactLines />
    </LegalPage>
  );
}
