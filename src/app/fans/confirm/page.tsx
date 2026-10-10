import type { Metadata } from "next";
import { Big_Shoulders } from "next/font/google";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import Unfollow from "@/app/fans/confirm/Unfollow";
import { followConsent } from "@/lib/fans";
import { FAN_COOKIE, fanIdFromCookie, following, tokenInfo } from "@/lib/server/fans";
import { getOrganizer } from "@/lib/server/funnels";
import "@/components/showlnk/showlnk.css";

// Where the emailed link lands. Opening it only shows what it's for; the
// button confirms (so mail scanners that open links don't follow anyone).

const show = Big_Shoulders({ subsets: ["latin"], variable: "--font-show", axes: ["opsz"], display: "swap" });

export const metadata: Metadata = { title: "Follow · Showlnk", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token?: string; following?: string }> };

const BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--sl-gold)] px-7 text-base font-bold text-[var(--sl-ink)] hover:bg-[var(--sl-gold-deep)]";
const LINK = "font-semibold text-[var(--sl-gold)] underline underline-offset-4";

export default async function ConfirmFollowPage({ searchParams }: Props) {
  const { token = "", following: followed } = await searchParams;
  const fanId = fanIdFromCookie((await cookies()).get(FAN_COOKIE)?.value);

  let body: React.ReactNode;
  if (followed) {
    const organizer = await getOrganizer(followed);
    const active = fanId ? (await following(fanId))?.includes(followed) : false;
    body = organizer && active ? (
      <>
        <h1 className="sl-display text-[clamp(2.5rem,9vw,4rem)]">
          You&apos;re following <span className="text-[var(--sl-gold)]">{organizer.name}</span>
        </h1>
        <p className="mt-5 text-lg text-[var(--sl-text)]/80">
          You&apos;ll hear about their next nights first: presales, reveals and fans-only reels.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link href={`/f/${organizer.slug}`} className={BUTTON}>
            See upcoming nights
          </Link>
          <Unfollow organizer={organizer.slug} name={organizer.name} />
        </div>
        <CalendarLinks feed={await feedUrl(organizer.slug)} name={organizer.name} />
      </>
    ) : organizer ? (
      <Notice
        title={`You're not following ${organizer.name}`}
        text="Changed your mind? Follow again from their page any time."
        action={<Link href={`/f/${organizer.slug}`} className={BUTTON}>Go to {organizer.name}</Link>}
      />
    ) : (
      <Notice title="You're not following anyone here" text="Open the link in your email again to follow." />
    );
  } else {
    const info = token ? await tokenInfo(token) : null;
    const organizer = info ? await getOrganizer(info.organizer) : undefined;
    if (!info || !organizer) {
      body = <Notice title="This link doesn't work" text="It may have been copied only in part. Ask for a new one from the event's page." />;
    } else if (info.status === "valid") {
      body = (
        <>
          <h1 className="sl-display text-[clamp(2.5rem,9vw,4rem)]">
            Follow <span className="text-[var(--sl-gold)]">{organizer.name}</span>?
          </h1>
          <p className="mt-5 text-lg text-[var(--sl-text)]/80">{followConsent(organizer.name)}</p>
          <form method="post" action="/api/fans/confirm" className="mt-9">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className={BUTTON}>
              Confirm and follow
            </button>
          </form>
          <p className="mt-6 text-sm text-[var(--sl-muted)]">
            Read how we handle your email in our <Link href="/privacy" className={LINK}>privacy note</Link>.
          </p>
        </>
      );
    } else if (info.status === "used" && fanId && (await following(fanId))?.includes(organizer.slug)) {
      body = (
        <Notice
          title={`You're already following ${organizer.name}`}
          text="This link has been used, and you're all set."
          action={<Link href={`/f/${organizer.slug}`} className={BUTTON}>See upcoming nights</Link>}
        />
      );
    } else {
      body = (
        <Notice
          title={info.status === "used" ? "This link was already used" : "This link has expired"}
          text={`Links work once, for 20 minutes. Ask for a new one on ${organizer.name}'s page.`}
          action={<Link href={`/f/${organizer.slug}`} className={BUTTON}>Go to {organizer.name}</Link>}
        />
      );
    }
  }

  return (
    <div className={`sl ${show.variable} font-sans`}>
      <header className="mx-auto flex max-w-3xl items-center px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Showlnk home" className="sl-display text-[2rem] leading-none tracking-normal normal-case">
          show<span className="text-[var(--sl-gold)]">lnk</span>
        </Link>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
        <div className="max-w-[40rem]">{body}</div>
      </main>
    </div>
  );
}

/** The organizer's calendar feed (/f/<organizer>/calendar.ics), on this site's own address. */
async function feedUrl(organizer: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "showlnk.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/f/${organizer}/calendar.ics`;
}

/**
 * Subscribe to every night in the fan's own calendar app: the organizer's
 * feed, which updates itself as nights are added.
 */
function CalendarLinks({ feed, name }: { feed: string; name: string }) {
  const webcal = feed.replace(/^https?:/, "webcal:");
  const links = [
    { label: "Apple Calendar", href: webcal },
    { label: "Google Calendar", href: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}` },
    { label: "Outlook", href: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed)}&name=${encodeURIComponent(name)}` },
  ];
  return (
    <section aria-labelledby="calendar-title" className="mt-12 rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night-2)] p-5 sm:p-6">
      <h2 id="calendar-title" className="text-lg font-bold text-[var(--sl-text)]">
        Add every {name} night to your calendar
      </h2>
      <p className="mt-1.5 text-sm text-[var(--sl-muted)]">New nights appear on their own, so you never miss one.</p>
      <ul className="mt-4 flex flex-wrap gap-2.5" role="list">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--sl-line)] px-4 text-sm font-semibold text-[var(--sl-text)] hover:border-[var(--sl-gold)] hover:text-[var(--sl-gold)]"
              {...(l.href.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notice({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <>
      <h1 className="sl-display text-[clamp(2.25rem,8vw,3.5rem)]">{title}</h1>
      <p className="mt-5 text-lg text-[var(--sl-text)]/80">{text}</p>
      {action && <div className="mt-9">{action}</div>}
    </>
  );
}
