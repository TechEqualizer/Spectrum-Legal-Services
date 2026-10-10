import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { ContactLines } from "@/components/showlnk/LegalPage";
import { CONTENT_RULE } from "@/lib/content-rule";

// The terms organizers agree to, including the content rule for reels.

export const metadata: Metadata = {
  title: "Organizer terms · Showlnk",
  description: "The terms for event organizers who use Showlnk, including the content rule for reels.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Organizer terms"
      updated="October 10, 2026"
      intro={
        <p>
          These terms are for event organizers and the people on their team who use Showlnk to build event links. Using Showlnk
          means you agree to them. The people who visit your links are covered by our <Link href="/privacy">privacy note</Link>.
        </p>
      }
    >
      <h2>1. Your account</h2>
      <p>
        You sign in with your email. Keep your sign-in to yourself, and only invite people you trust to your events: you are
        responsible for what your team does with your account.
      </p>

      <h2>2. Your content</h2>
      <p>
        Your flyers, videos, photos and words stay yours. You let Showlnk store them, show them on your links, and make link
        previews and shorter cuts from them, for as long as they are on Showlnk.
      </p>
      <p>
        You need the rights to everything you upload: the music, the footage, and the faces in it. Remove anything you no longer
        have the rights to.
      </p>

      <h2>3. The content rule</h2>
      <div className="sl-rule">
        <p>
          <strong>{CONTENT_RULE.summary}</strong>
        </p>
        <ul>
          {CONTENT_RULE.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <p>
        The same rule covers reels only your fans can see. We may take down a reel that breaks it, and suspend an account that
        keeps breaking it.
      </p>

      <h2>4. Your audience</h2>
      <p>
        The people who ask to hear from you through your link (your leads and your followers) are your list. Contact them only
        about what they agreed to, and only in the way they agreed to.
      </p>
      <ul>
        <li>Every text you send them honors STOP, and every email has a way to unsubscribe.</li>
        <li>
          <strong>Anyone can be removed on request.</strong> When a fan asks us to remove them, we remove them from your list, and
          you agree to remove them from any copy you exported.
        </li>
        <li>You don&apos;t sell or hand your list to anyone else.</li>
      </ul>

      <h2>5. Tickets and sales</h2>
      <p>
        Tickets are sold by your ticketing provider (Eventbrite, for example), not by Showlnk. Refunds, entry and the night itself
        are yours. If you connect Eventbrite, Showlnk reads your orders to count the tickets each link sold. You can disconnect at
        any time; the counts already made stay.
      </p>

      <h2>6. Price</h2>
      <p>
        Showlnk is free while it&apos;s in early access. Before we start charging, we&apos;ll email you the price at least 30 days
        ahead, and you can leave before paying anything.
      </p>

      <h2>7. Leaving, and suspensions</h2>
      <p>
        You can stop using Showlnk at any time and ask us to delete your events. We may suspend an account that breaks these
        terms, and will tell you why.
      </p>

      <h2>8. Limits</h2>
      <p>
        We work to keep your links up, but Showlnk is provided as it is, without a promise that it never fails. As far as the law
        allows, Showlnk isn&apos;t liable for lost sales or other indirect losses, and our total liability is limited to what you
        paid us in the last 12 months.
      </p>

      <h2>9. Changes</h2>
      <p>
        If we change these terms in a way that matters, we&apos;ll email you before the change takes effect. The date at the top
        shows the latest version.
      </p>

      <h2>10. Contact</h2>
      <ContactLines />
    </LegalPage>
  );
}
