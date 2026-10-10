# Plan 2: Fans

The audience moat. A visitor follows an organizer with their email, and
following is worth something:

- fan-only reels;
- presale access before tickets go public;
- every new night in their phone's calendar.

The organizer gets a list they own, one their audience asked to join.

Built after Plan 1 (it reads dates as rows and the one stage rule).
Everything here is free for Big Love while it's built. The $29 Core plan
(Plan 3) gates it later.

## First principles

1. **A follow must be worth more than it costs.** The fan gives an email
   and a click. In return they get access that non-followers don't:
   presale first, reveals, fan-only reels. If following gives nothing,
   the list stays empty and the moat never forms.
2. **Consent is the product, not a checkbox.** Only confirmed emails go on
   the list (double opt-in). Every email carries one-tap unfollow, and fans
   can delete themselves. A list of people who asked to hear from an
   organizer is worth more, and lands in more inboxes, than a list that
   was scraped.
3. **Gating has to be real.** A fan-only reel never reaches someone who
   isn't a follower:
   - not in the page's HTML;
   - not in a public storage address;
   - not in a link preview card.

   Otherwise "exclusive" is a lie the first time someone views the page
   source.
4. **Value comes from timing and access, not secrecy.** Anything that plays
   on a screen can be screen-recorded. Presale windows and early reveals
   keep their value even after a leak.
5. **The content rule:** suggestive yes, explicit no.
   - No nudity or sex acts.
   - Consent from anyone identifiable in a fan-only reel.
   - It's written into the organizer terms and shown beside the fans-only
     switch.

## Where we are (facts, from the code)

- **Lead forms (text):** "Text me later" saves a phone number with consent
  wording to `leads` (intent `text_later`) and sends nothing. The Leads
  page lists these.
- **Lead forms (email):** email goes out through Resend's API in
  `src/app/api/leads/route.ts`, as a notice to the organizer only. No
  sending domain is set up for messages to fans.
- **Reel media:** stored in the public `reel-media` bucket. Anyone with the
  address can fetch it.
- **Reels:** a reel has no visibility. Every reel in the published document
  is in the page's HTML.
- **Showlnk's waitlist:** the `waitlist` table is Showlnk's own product
  waitlist (organizers), not fans.
- **Admins vs fans:** admins sign in with Supabase Auth plus `admin_users`.
  Fans have no accounts.

## Design

- **Fans and follows (rows):**
  - `fans`: one row per confirmed email.
  - `follows`: fan × organizer, with the source tag and the event they
    followed from, the consent wording they saw, and when they confirmed
    or unfollowed.
  - Server-only tables, like the Eventbrite ones: row-level security on,
    no policies, secret key only.
- **Fan sign-in without passwords or Supabase Auth:**
  - **Email link:** a single-use link, valid 20 minutes, sent by Resend
    in the organizer's name. Its token is stored hashed, like the
    Eventbrite tokens.
  - **Cookie:** confirming sets a signed, httpOnly cookie (180 days)
    holding the fan's id.
  - **Why not Supabase Auth:** keeping fans separate keeps them out of
    the admin sign-in system, and lets emails carry the organizer's
    brand.
- **Fan-only reels:**
  - Reels get `visibility: "public" | "fans"` in the published document.
  - Media for fan-only reels goes to a private bucket,
    `reel-media-fans`.
  - **In the page:** the reel shows as a locked card (title, a blurred
    cover and "Follow to watch"). Its media address is never sent.
  - **For a follower:** the player asks `/api/fans/media?reel=…` for a
    short-lived signed address. The server checks the cookie and the
    follow first.
  - **Link previews:** cards and per-reel previews skip fan-only reels.
- **Presale:**
  - A date gets an optional `presale: { url, opensAt, endsAt }`. The url
    is the organizer's Eventbrite access-code link or hidden ticket link.
  - Shown only to followers, between `opensAt` and `endsAt`.
  - Non-followers see "Fans get tickets first: follow for presale".
- **Calendar:**
  - `/f/<organizer>/calendar.ics` is a subscribable feed of the
    organizer's upcoming public dates, built from the date rows.
  - The follow confirmation page offers "Add every <organizer> night to
    your calendar" with webcal links for Apple and Google.
  - Public and identical for everyone, so it holds no personal data and
    caches well.
- **Email in this plan:** sign-in links and the follow confirmation only.
  Blasts to followers are Plan 4, the Email add-on.
  - **Sender:** "<Organizer> via Showlnk <fans@showlnk.com>".
  - **Footer:** one-tap unfollow, plus Showlnk's postal address, as US
    anti-spam law (CAN-SPAM) requires.

## Steps

Each step is one PR.

### 0. Content rule and fan terms (done)

- `/terms`: the organizer terms, with the content rule and a promise that
  fans can be removed on request. The rule is written once
  (`src/lib/content-rule.ts`), so step 3 shows the same words beside the
  fans-only switch.
- `/privacy`: a short note for visitors and fans: what's stored, who sees
  it, how to unfollow or delete.
- Both are linked from the home page's footer. Contact details come from
  settings (`SHOWLNK_CONTACT_EMAIL`, `SHOWLNK_POSTAL_ADDRESS`).
- Live page impact: none (new pages; event links unchanged).

### 1. Fan tables and sign-in (additive)

- Migration `20261018000000_fans.sql` (confirmed before it runs): `fans`,
  `follows`, `fan_login_tokens`, the private `reel-media-fans` bucket.
  - All server-only: row-level security on, no policies, no grants.
  - The app uses six `fan_*` functions, callable with the secret key only.
    They do the rate limits (3 links an hour per email, 10 per IP) and
    make confirming atomic (a link works once).
  - Only the SHA-256 of each link and a keyed hash of the IP are stored.
- Routes:
  - `POST /api/fans/start`: email + organizer, then sends the link.
  - `/fans/confirm?token=`: the page the link opens. Opening it uses
    nothing (mail scanners open links); its button (`POST
    /api/fans/confirm`) follows and sets the cookie, signed, httpOnly,
    180 days.
  - `GET /api/fans/me`: who this browser follows.
  - `POST /api/fans/unfollow` and `POST /api/fans/forget` (deletes the fan,
    their follows and pending links). Same-site only.
- Resend: showlnk.com is verified; links come from
  "<Organizer> via Showlnk <fans@showlnk.com>".
- Settings: `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `FAN_COOKIE_SECRET`,
  `SHOWLNK_POSTAL_ADDRESS`. Following stays off until all are set.
- Tests: the `fans` suite, with a mock Resend that keeps the emails.
- Live page impact: none (nothing on the page uses it yet).

### 2. Follow on the link (built)

- "Follow" in the reel rail, on the end card, after the night (in place of
  Updates) and on the organizer's choose-a-night page.
  - It replaces "Text me later" for event links. A sold-out date's
    Waitlist stays a text sign-up.
  - Existing phone leads stay where they are, on the Leads page.
- Email field → "Check your email" → confirmed → "You're following".
  (The calendar offer comes with step 5.)
- A returning follower sees "Following" (the rail) or "Following ✓", and
  the sheet lets them unfollow.
- The switch: `FOLLOW_ORGANIZERS` (organizer slugs, or `*`). Without it,
  and without every fan setting, links are exactly as before. The admin's
  preview and demos never show Follow.
- Live page impact: **yes, visible, once switched on.** The rail's Updates
  button becomes Follow. Big Love is switched on only when you say.

### 3. Fan-only reels (built)

- **Editor:** a "Fans only" switch per reel, with the content rule shown
  beside it, and a "Fans only" chip on the reel's row. Files added while
  it's on upload to the private bucket (`reel-media-fans`, a folder per
  event; migration `20261019000000_fan_reel_uploads.sql` lets an event's
  admins upload there). The reel names them `fans:<event>/<file>`.
  - Media already at a public address (or on YouTube) stays reachable
    there; the editor says so and asks for a fresh upload.
- **What visitors get:** `resolveLink` drops fans-only media, so the page,
  its reel pages and link previews never carry it. The published JSON
  holds only `fans:` references, and the bucket has no public address.
- **Player:** a locked card (lock, title, "Follow to watch") for
  non-followers; a follower's player asks `/api/fans/media`, which checks
  the cookie and the follow, then signs addresses that work for an hour.
  The admin's preview signs its own (`/api/admin/fan-media`).
- **Gating tests:** the `fan-reels` suite.
- Live page impact: none until a reel is switched to fans only.

### 4. Presale (built)

- **Editor:** "Presale for followers" on each date (the date sheet): the
  link (an access-code or hidden ticket link) and when it opens and ends,
  on the date's own clock.
- **Where it's kept:** the window is published with the date (anyone can
  read published edits); the link isn't. It lives in `event_presales`
  (migration `20261020000000_presales.sql`): the event's admins write and
  read it through `set_event_presales` / `event_presales_for`, the server
  reads it with the secret key. Publishing takes the link out first;
  taking edits down clears them.
- **On the link,** during the window, where the organizer has Follow on:
  followers get "Get presale tickets" (the link from
  `/api/fans/presale`, which checks the cookie, the follow and the
  window); everyone else gets "Fans get tickets first" and Follow.
- Tests: the `presale` suite.
- Live page impact: none until a date has a presale.

### 5. Calendar feed (built)

- `/f/<organizer>/calendar.ics`: every upcoming night of the organizer's
  events, soonest first, each linking to its Showlnk link tagged
  `?src=calendar` (so results credit the calendar), with a reminder 3
  hours before. `/f/<event>/calendar.ics` is one event's. Calendar apps
  check back every 6 hours; it's public and cached.
  - Built from the dates as visitors see them (the published lists), like
    every other reader today; it moves to the date rows with Plan 1 step 4.
- The follow confirmation offers it: Apple Calendar (webcal), Google
  Calendar and Outlook. The one-date "Add to calendar" file shares the
  same builder (`src/lib/server/ics.ts`).
- Tests: the `calendar-feed` suite.
- Live page impact: one new link, on the confirmation page only.

### 6. Fans in the admin (built, in part)

- **A Fans page** (built), beside Leads at `/admin/leads/fans` with a
  Leads | Fans switch on both, so the nav keeps its few places:
  - followers, newest first, with when and where each one followed
    (source tag, event), and how many have unfollowed;
  - CSV export of current fans (the organizer's list, theirs to keep;
    formula-looking cells are defused);
  - remove a fan, from this organizer only (asked first);
  - a note when Follow isn't switched on for their links yet.
  - Migration `20261021000000_organizer_fans.sql`: `organizer_fans` and
    `remove_fan`, for admins who manage the organizer.
- Not yet: Home and Results gaining **Follows** next to ticket clicks (plus
  the share of visitors who follow), and a Fans step in the guided tour.
- Live page impact: none (admin only).

## Measures

| Measure | What it shows |
|---|---|
| Follow rate (visitors who follow) and confirm rate (follows confirmed by email) | Is following worth it to fans? |
| Followers per organizer, and how many come back for the next event | Is the list becoming an asset? |
| Presale conversion vs public sale conversion | Is the fan advantage real money? |
| Fans following 2 or more organizers in a city | The network forming. Plan 5 builds on it |

## Deliberately not in this plan

- **Email blasts:** Plan 4, the Email add-on.
- **Texts:** later, once email works. Texting needs proper TCPA consent and
  a sending service, and costs more per message.
- **Ads:** a later add-on.
- **Billing:** Plan 3.
- **Ticket protection:** check-in and dispute evidence packs, Plan 5.
- **Fan accounts with passwords, fan profiles, comments or likes.**
- **Per-fan unique presale codes:** the shared access-code link comes
  first.

## Decided

- **Email sign-in first.** Texts come later.
- **The content rule:** suggestive yes, explicit no, with consent from
  anyone identifiable.
- **Email footer:** Showlnk's postal address, from a setting
  (`SHOWLNK_POSTAL_ADDRESS`), in every fan email.
- **Following is per organizer:** one list, every night.

## Open questions

- **When does Big Love switch Follow on?** Proposed: after Oct 31, so the
  masquerade's ticket flow stays as it is.
