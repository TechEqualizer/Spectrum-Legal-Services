# Plan 5: The sign-up wizard

An organizer goes from a flyer to a live Showlnk link in three steps, and
is sold on it before they're asked for anything: they watch their own night
become reels, with Core's features already working in the preview, and only
then claim the link. Claiming starts Core's 14-day trial.

Invite-only for now (decided Oct 10, 2026): Showlnk sends invite links; the
waitlist on showlnk.com stays as it is.

## What works elsewhere (researched Oct 2026)

| Product | What it does at sign-up | What we take |
| --- | --- | --- |
| Linktree | Asks what kind of creator you are first, then shows matching templates. A teardown counts about 31 steps before a user shares their link, and calls the upgrade pitch before anything is made the flow's main mistake. | Ask the role once, early, to tailor the copy. Few steps. No pitch before the wow. |
| Partiful | The invite page is the product and the ad: everyone who opens one sees what it makes. Phone first. | The preview is their real link, on a phone, from the first minute. |
| Flmlnk (ours) | Role, project, genres, then URL and email, with a progress bar and "I'll add this later". | The step bar, plain one-question screens, and "add later" for anything optional. |
| Reverse trials | Start on the paid plan, drop to Free unless they pay. Suits products whose "wow" has to be seen. | Core's 14 days start at claim (see Plan 3). |

Sources: [Linktree teardown (Supademo)](https://supademo.com/user-flow-examples/linktree),
[Linktree flow (Pageflows)](https://pageflows.com/post/desktop-web/onboarding/linktree/),
[Linktree steps (ContentStudio)](https://contentstudio.io/blog/what-is-linktree),
[Partiful's growth (NoGood)](https://nogood.io/blog/partiful-marketing-strategy/),
[Reverse trials (Inflection)](https://inflection.io/post/complete-guide-to-reverse-trials),
[Trial conversion (Userpilot)](https://userpilot.com/blog/wp-json/wp/v2/posts/13042).
Most conversion figures in these are vendors' own and unverified.

## First principles

1. **The wow before the ask.** Nothing is asked for (no email, no
   password, no plan) until they've seen their own night as reels on a
   phone. The ask comes when they want to keep it.
2. **Their flyer is the input.** Organizers already have one for every
   night. One upload, no forms to fill: the flyer gives the name, date,
   venue, price, look, and the reels' words.
3. **The preview is the real thing.** The phone shows the same link fans
   will see (the funnel player), not a mock-up, so what sells them is what
   they get.
4. **Show Core working, not a price list.** The preview has Follow, a
   fans-only reel and a presale badge, each marked "Core · free for 14
   days". The price appears once, at claim, with the trial.
5. **Nothing is lost.** The draft lives in their browser until they claim
   it; leaving and coming back resumes it. Anything optional ("add your
   videos") says "add later" and waits in the admin.
6. **Costs stay bounded.** Each invite reads a few flyers at most (the AI
   costs money); drafts aren't stored before the claim.

## Where we are (facts, from the code)

- Reading a flyer with Claude: `src/lib/server/flyer-import.ts` (dates,
  venue, price, and the flyer's look: colors and title typeface).
- Drafting the funnel from a flyer: `src/lib/server/funnel-draft.ts` (the
  opening scene and the three core reels, The Night, Your People and Last
  Call, each with a video prompt).
- Both are admin-only today (`/api/admin/import-event`,
  `/api/admin/draft-funnel`), used by the flyer sheet in the admin.
- New client (`/api/admin/clients`, full admins only) creates an organizer,
  its bio link and a first event; Settings → Accounts hands over a login.
- The funnel player renders inside a phone frame for the admin's live
  preview (`PreviewFrame`).
- Plans: `organizer_plans`, the Plan card, Start Core (Plan 3).

## Design

- **Invites:** Showlnk creates an invite link in the admin (Settings →
  Invites: who it's for, Copy link). `/start?invite=<code>`. Each invite
  claims one organizer and reads up to 5 flyers. Only a hash of the code is
  stored.
- **The wizard** at `/start`, Showlnk's own look (the dark night palette),
  a step bar across the top, the phone beside the form on a wide screen
  and above it on a phone:
  1. **Drop your flyer.** Upload (or take a photo). "What do you run?":
     Promoter, Venue, Artist or DJ, Organizer. As the flyer is read, the
     phone fills in the night's name, date and venue, in the flyer's
     colors.
  2. **Your night, in reels.** The phone plays the opening scene and The
     Night, Your People and Last Call, drafted from the flyer. Each reel's
     words can be changed in place. Follow, a fans-only reel and a presale
     badge show in the preview, marked "Core · free for 14 days". Videos:
     "Add your videos after you claim" (the reels play over the flyer
     until then).
  3. **Claim your link.** `showlnk.com/f/<name>` (checked as they type),
     email, password, the terms and the content rule. Claiming creates the
     account, the organizer, its bio link and the event (not live yet),
     starts Core's trial, signs them in, and lands on Home with "Your link
     is ready", Copy link and what to do next (add videos, publish).
- **Server:** public `/api/start/*` routes that take an invite code
  instead of a sign-in, and reuse the flyer reader and the funnel draft.
  The claim reuses New client's event creation and Accounts' login
  creation, in one step.

## Steps

0. **Invites (built).** Migration `20261024000000_signup_invites.sql`:
   `signup_invites` (only a hash of each code), with create, list and
   revoke for full admins and `use_signup_invite_read()` for the server
   (5 flyer reads each). Settings → Invites: who it's for, Make invite
   link (shown once, Copy link), each invite's state (waiting with reads
   used, joined, expired, revoked) and Revoke. `/api/start/invite?code=`
   tells the wizard whether an invite is usable, and nothing about whom
   it's for. Invites last 30 days. Live page impact: none.
1. **Step 1, the flyer (built).** `/start?invite=…` checks the invite
   first and says plainly when it's expired, used or withdrawn, or when
   there's none (invite-only). The wizard: a 3-part step bar, "What do you
   run?", and a drop zone for a photo or PDF. While it's read, the flyer
   shows in the phone with a gold line sweeping down it; then the card
   shows what the flyer said (name, date, venue, price, other dates) and
   the phone becomes their link: their flyer as the poster, its colors,
   its dates. The phone is the real link player (`/start/preview`, in
   preview mode: no visits counted), live from the first second. The draft
   stays in the browser, so coming back carries on. `/api/start/flyer`
   counts each read against the invite (5 at most) before reading. Continue
   leads to step 2 (next). Live page impact: none (invite-only).
2. **Step 2, the reels (built).** The same `/api/start/flyer` answer that
   reads the flyer goes on to draft the opening scene and the three reels
   (`draftFunnel`), streamed one line at a time: step 1 shows what the flyer
   said at once, and the reels arrive while the organizer picks what they
   run, so drafting costs no extra read of the invite. Step 2 lists the
   opening (title, line under it) and The Night, Your People and Last Call
   (title, words), each with the question it answers and Play, which starts
   the phone at that reel; typing changes the phone in place. Until their
   videos come, each reel plays over the flyer. "Core · free for 14 days,
   already on your link": Follow (beside every reel), a presale for fans
   (open now on the next date) and a reel locked for followers, each with
   See it; the phone runs them in preview mode (Follow sends nothing). If
   drafting fails, the reels start from the flyer's basics and say so. Edits
   stay in the browser with the rest of the draft. Live page impact: none.
3. **Step 3, the claim (built).** Migration
   `20261025000000_signup_claim.sql`: `claim_signup_invite()` (the server's
   secret key only) makes, all or nothing, the organizer, its first event
   (the night from the flyer, published with the reels' words, opening
   words, dates and look, and the flyer: stored in the event's folder of
   the public `reel-media` bucket by the server, then the opening scene's
   backdrop, behind each reel until its video comes, and the look's flyer;
   not the preview's locked reel or made-up presale), `admin_users` access to that organizer, Core trialing
   for 14 days, and the invite marked claimed. The form: "Your name, as
   fans see it" (suggested from the flyer, the part before any colon), the
   link `showlnk.com/f/<name>` (follows the name until changed, checked as
   they type: `/api/start/link`), "Where fans buy tickets" only when the
   flyer had no ticket link (optional; a date without one borrows it or
   another date's, else waits for the studio), email, password (8+, Show),
   the trial and the price, once ("$29 a month or $290 a year, or stay on
   Free… No card now."), and the terms with the content rule.
   `/api/start/claim` makes the login first (Supabase Auth), then claims;
   if the claim fails (email already on Showlnk, link taken meanwhile,
   invite used) the login is removed. Then it signs them in, writes the
   dates as rows, and the wizard clears the draft and opens
   `/admin/home?welcome=<event>`: "Welcome to Showlnk, <name>", "Your link
   is ready" with Copy link, and next steps (Open your reels, Put it in your
   bio, Take the tour); the tour waits for it. The event is live at its own
   link from the claim (like New client's). Live page impact: none
   (invite-only).
4. **The trial's end.** Plan card and Home count the days; an email 3
   days before it ends (Resend); on the last day, Core falls back to Free
   unless they started paying. (With Plan 3 step 3, the gates.)

## Measures

- Invites opened → flyer read → reels seen → claimed.
- Claimed → link shared (copied) in the first day.
- Trial → paid (Plan 3).

## Deliberately not in this plan

- Public sign-up (the waitlist stays until Showlnk opens it).
- Uploading videos inside the wizard (they come after the claim, in the
  admin, where the reel editor already handles them).
- Social sign-in (Google, Apple).

## Decided

- Core's 14-day trial starts at claim (Oct 10, 2026), replacing "when they
  reach 100 fans".
- Invite-only for now.
- Roles: Promoter, Venue, Artist or DJ, Organizer.
- Claim with email and password (the admin's own sign-in): no detour to an
  inbox at the moment they're most sold.
