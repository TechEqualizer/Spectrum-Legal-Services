# End-to-end tests

Real-browser tests for the funnel links and the admin, run against
stand-ins for Supabase, the Claude API and Eventbrite, so nothing touches
real services or costs anything.

```sh
npm run test:e2e                  # build, then every suite (about 7 minutes)
npm run test:e2e -- draft path    # only these suites
npm run test:e2e -- --no-build    # reuse the last test build
```

The runner (`run.mjs`) starts the mocks, builds the app pointed at them,
starts it on port 3002, signs in a test admin, and runs each suite with a
fresh mock state. It prints one line per suite and exits non-zero if any
check fails. Each suite's full output, plus screenshots, goes to
`tests/e2e/.out` (not committed).

Ports 3002, 3003 (the `eventbrite` suite's second app, without Eventbrite
settings), 54321 (mock Supabase), 54400 (mock Claude), 54600 (mock
Eventbrite) and 54700 (mock Resend) must be free.
Building replaces the app's `.next` folder with a test build, so run
`npm run build` again before `npm start` for real.

## The test calendar

Every run happens on Oct 7, 2026, whatever today's date is. The suites were
written around Big Love's Oct 31 night, so they keep passing after it. Time
still moves forward during a run.

- **Processes:** the app, its build and the mocks load `shift-time.cjs` (through
  `NODE_OPTIONS`), which moves their clock by a fixed offset.
- **Pages:** shifted the same way inside the browser (`browser.mjs`).
- **Suites:** keep the real clock, because Playwright works out cookie expiry
  there. Use `testNow()` from `browser.mjs` for dates a suite builds.
- **A page's own clock:** set with `page.clock` or `context.clock`, it takes
  over for that page. `clock.install()` without a time starts at the run's
  calendar.
- **A different moment:** `E2E_NOW=2026-11-15T12:00:00Z npm run test:e2e` runs
  the whole run at that time.
- **Data cache:** every run starts with the app's data cache cleared, so one
  run's events never leak into the next.

## What's here

- `suites/`: one script per area. Each prints `PASS  name` or `FAIL  name`
  per check.
  - `client-link`: Big Love's live link, `/f/masquerade`.
  - `sell`, `fold`, `hero`, `yt-hero`, `events`, `one-date`, `emphasis`:
    the funnel link a visitor sees.
  - `sound`: a video reel opens with sound after a tap, and plays muted
    (with Unmute) when the browser refuses sound. Headless Chromium never
    refuses, so the suite plays by a phone's rule (no sound before a tap),
    with `fixtures/sample-reel-sound.webm`, a clip with an audio track.
    A stricter rule (nothing plays outside a tap, like an iPhone in Low
    Power Mode) checks the Play button and the opening scene starting on
    the first touch.
  - `share-card`: the link preview card (the art with a play button, the
    date and where tickets stand, and the words under it), and a `?start=`
    link previewing its reel for link-preview crawlers only. The cards are
    saved as `share-card-*.png`.
  - `event-dates`: publishing writes an event's dates as rows
    (`event_dates`, through `set_event_dates`), with Eventbrite's event id;
    taking edits down restores the built dates; others can't write them.
  - `fans`: following an organizer by email (Plan 2, step 1; no Follow
    button on links yet). The link goes out through the mock Resend, opening
    it only shows the page and its button confirms; the signed cookie; links
    that are used, expired, made up or rate-limited; unfollow and forget;
    the fan functions closed to visitors.
  - `fan-reels`: fans-only reels (step 3). A private file (added with
    `/__fan-file`) on a published fans-only reel: not in the page, its reel
    page or a public address; a visitor's locked card and "Follow to
    watch"; a follower's signed address that plays; a follower of another
    organizer refused; admins' private uploads and preview addresses; the
    editor's switch with the content rule.
  - `calendar-feed`: the organizer's calendar feed (step 5): upcoming
    nights only, soonest first, tagged links, an event's own feed, and the
    confirmation's Apple, Google and Outlook links.
  - `presale`: a presale for followers (step 4): the link kept out of the
    published edits and the page; "Fans get tickets first" for a visitor,
    "Get presale tickets" for a follower, nothing after the window;
    others refused; the date sheet's presale fields.
  - `follow`: Follow on the link (step 2), on only for the fan suites' own
    test organizers (`FOLLOW_ORGANIZERS=gh-follow,gh-reels,gh-presale`, added to the
    mock with `/__organizer`, with Golden Hour's event at their own links:
    the app keeps what earlier suites saw at `/f/sundays` for the run). Big Love's link keeps Updates. The rail's Follow, the
    sheet, "Check your email", Following after confirming, unfollow, a
    refused follow's message, and the choose-a-night page's Follow.
  - `legal`: the organizer terms (`/terms`, with the content rule) and the
    privacy note (`/privacy`), linked from the home page's footer and
    readable on a phone.
  - `tour`: the admin's guided tour, on desktop and phone. Other suites
    start as someone who has had it (`browser.mjs`).
  - `book-first`: a book-first link that isn't live (`/f/skin-notes`, the
    test-only Lumen Skin Studio from `fixtures/book-first.mjs`: Book is the
    main action; forms simulate).
  - `leads`: the admin's Leads page: a fresh event's empty state, a lead
    sent from Big Love's live link showing with its reel, source and the
    reels watched first, who may see leads, no sample wording anywhere in
    the admin, and the old sample links (`/f/medspa`, `/f/events`) as 404s.
  - `eventbrite`: Big Love's organizer connects Eventbrite (orders already
    placed are imported), a webhook order from Instagram shows as tickets
    sold on Results, Share and Home, refunds lower it, forged webhooks and
    a mismatched state change nothing, another business's admin
    (`rival@example.com`) can't see or touch the connection, the token
    never reaches the browser, disconnecting keeps the history, and a
    second app on port 3003 without the settings shows "not turned on yet".
  - `link`: a call-first link that isn't live yet (`/f/velvet-room`, added
    to the mock for the suite: forms simulate, tracking is real), plus the
    admin's link builder.
  - The rest: the admin (dates, flyer import, the "Draft my funnel" draft,
    look and style, opening screen, studio and path strip, publishing,
    saving, media).
- `browser.mjs`: Playwright's `chromium` for the suites, plus waits.
  `settle(page, ms)` returns as soon as the page is quiet (no requests in
  flight, no `setTimeout` of up to 1s pending, in any frame), and never
  later than `ms`, so use it instead of `page.waitForTimeout`. It doesn't
  wait for CSS animations (the event pages always run some); a check about
  one calls `animationsDone(page, ms)` first. `SETTLE_DEBUG=1` logs each
  settle that ran out of time and what was still busy.
- `mocks/supabase.mjs`: auth, the publications table and storage, kept in
  memory. Test accounts: `tester@example.com` / `tester-pass-1` (signed in
  for the suites), `owner@example.com` (first sign-in flow),
  `organizer@example.com` / `organizer-pass-1` (runs Big Love only) and
  `rival@example.com` / `rival-pass-1` (another business's admin). Control
  routes: `/__state`, `/__reset`, `/__log`, `/__ttl?s=`, and `/__event`
  (adds an event row straight to the table), and `/__reel-events` (adds
  visitors' reel events, each `daysAgo` days back, for results over several
  periods). Leads sent through `submit_lead_v3` are kept, and
  `funnel_leads` returns them to the event's admins, like the database.
- `mocks/eventbrite.mjs`: Eventbrite's OAuth (authorize signs the test
  account in at once and redirects back with the code and state; token) and
  the v3 API the app uses (`users/me`, its two organizations, an event's
  owner, webhooks made and removed, orders with attendees, an event's
  orders two per page). The runner points the app at it
  (`EVENTBRITE_OAUTH_BASE`, `EVENTBRITE_API_BASE`) with a test client id,
  secret and token key. Control routes: `/__orders` (add or replace
  orders), `/__fire` (`{ order_id, action }` delivers a webhook for that
  order to every webhook it holds, like Eventbrite; `{ endpoint, body }`
  delivers any body, for forged deliveries), `/__deny` (the next sign-in is
  refused), `/__state`, `/__reset`. The Supabase mock keeps
  `eventbrite_connections` and `ticket_sales` (the secret key only, like
  the real tables) and adds tickets sold to `funnel_stats`.
- `mocks/resend.mjs`: keeps every email the app sends (`/emails`, with
  the test key only) instead of sending it. Control routes: `/__emails`
  (every email, oldest first), `/__fail` (the next send fails), `/__reset`.
  The Supabase mock has the `fan_*` functions (secret key only), the
  presale functions and table (`event_presales`), the
  private `reel-media-fans` bucket (signed addresses only), `/__fan-expire`
  (expires every pending sign-in link) and `/__fan-file?path=` (puts a file
  in the private bucket).
- `mocks/claude.mjs`: answers flyer reads (`POST /__mode` with `multi`,
  `single`, `none` or `refusal`) and funnel drafts. `/__last` returns the
  last request, so suites can check the model, schema and prompt.
- `fixtures/`: a photo, two short videos, a sample flyer and a text file
  (for the wrong-file-type message), plus two test-only links the suites
  add to the mock database with `/__event`: `golden-hour.mjs` (Golden Hour
  Sundays at `/f/sundays`, several dates: sold out, few left, a recap, a
  presale) and `book-first.mjs` (`/f/skin-notes`). Neither is part of the
  app, and neither is live, so their forms simulate. Their slugs sort after
  `masquerade`, so if one lingers in the app's cached event list, Big Love
  stays the admin's default event.
- `pickEvent(page, slug)` (in `browser.mjs`) shows an admin event: it uses
  the nav's event picker, which only appears when the admin has more than
  one event (Big Love's is the only one seeded).

The admin suites use Big Love Productions (`masquerade`, organizer
`biglove`, seeded from `supabase/seed/biglove.json`), and the visitor suites
use the test-only Golden Hour event at `/f/sundays`. Most suites run in Detroit time
(`America/Detroit`). `timezones` runs in Los Angeles and London and checks
that Big Love's Oct 31, 8 PM date still reads 8 PM Detroit time (the link,
Tonight and This Saturday, the calendar file, and the admin's date sheet).
Golden Hour's dates have no `timeZone`, so they cover the fallback to the
viewer's zone.
