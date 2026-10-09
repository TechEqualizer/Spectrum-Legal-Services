# Plan 1: Events as records

The foundation for the season calendar and the living link. It adds no
new screens. Each step ships on its own, behind tests, without changing
what the live Big Love page shows.

## First principles

1. **Rows for what we ask questions across; documents for what we edit
   as a whole.** Questions like "what's next for this organizer", "which
   date did this sale buy" and "what changes at 8 PM tonight" run across
   dates. Dates therefore become rows. A link's reels, look and words are
   edited and published together, so they stay one JSON document.
2. **One truth per fact.** Every reader gets the same, already-combined
   event. No reader chooses between "built" and "published".
3. **Time is an input, never a hidden read.** An event's stage is a pure
   function of its dates and `now`. Tests pass `now` in, so they never
   depend on the real calendar.
4. **Additive, then switch, then remove.** New tables sit beside old ones.
   Readers move behind one setting that can be flipped back, and old
   storage goes only after the new path has run in production.

## Where we are (facts, from the code)

- **Unit and identity:** an event is an `event_funnels` row. Its stable
  identity is `slug` plus `funnel_id`. Dates are a JSON array:
  `data.events` at creation, then `funnel_publications.data.events` once
  edited.
  - The published list replaces the built one wholesale
    (`src/lib/publication.ts:56`).
  - `event_funnels.data` is never updated after creation.
- **Readers mix the two copies.** Most apply the publication, but some read
  the built copy:
  - `ReelsEditor`'s `liveFunnel` is the built copy (`AdminBusiness.tsx:55`).
  - `resolveLink` returns the built copy plus the publication for callers
    to combine.
  - Link-preview text read the built copy until last week.
- **Stage rules are scattered.** "Over 6 hours after start" is in
  `isOver`. Recap, next night and chips are worked out separately in
  `FunnelExperience`, `ReelViewer`, `Home`, `Events`, `DatesCard` and
  `share-card`. `StyleSheet` uses "after start" instead of the 6-hour rule.
- **Time depends on rebuilds.** Server-rendered parts (`resolveLink`,
  link-preview text and card) use the time of the last rebuild:
  - fetches refresh every 300 s;
  - preview cards refresh every 3600 s;
  - nothing rebuilds when a date passes;
  - the client recomputes recap with its own clock.
- **Eventbrite matching** re-parses every date's `ticketUrl` on every
  order (`organizerEventMap`, `src/lib/server/eventbrite.ts:322`). Sales
  store `funnel_id` plus the date's JSON id.
- **Tests use the real clock against Big Love's real date (Oct 31).** From
  Nov 1 the suites that expect an upcoming night will fail.

## Steps

Each step is one PR.

### 0. Tests own their clock (done)

- Every test run happens on a fixed calendar (Oct 7, 2026), with time still
  moving. The app, its build, the mocks and the pages are shifted by a
  test-only offset (`tests/e2e/shift-time.cjs`, `browser.mjs`). Suites build
  dates with `testNow()`. No app code changed.
- The data cache is cleared before every run, which also removes the
  long-standing problem of the home suite failing when run on its own.
- Live page impact: none (test files only).

### 1. One combined event for readers

The built copy can't simply go away: it's what **Take down published
edits** returns to, and the admin's preview re-applies edits as they're
typed. So step 1 keeps it for the editor and hides it from everyone else.

- Server readers get the combined event from one function (`resolveLink`
  includes it). None of them combines the two copies on its own again.
- The editor keeps the built copy and the publication, with honest names
  (`ReelsEditor`'s `liveFunnel` is the built copy and gets renamed).
- Live page impact: none in what it shows (pure refactor; the full e2e
  suite and the share-card suite prove the HTML and card match).

### 2. One stage function

- New `src/lib/lifecycle.ts`:
  - `dateStage(date, now)`: `announce` | `on_sale` | `final_week` |
    `tonight` | `live` | `over`.
  - `linkState(events, now)`: the headline date, other upcoming dates, and
    recap or quiet.
- `events.ts` helpers, `share-card`, `FunnelExperience`, `ReelViewer`,
  `Home`, `Events`, `DatesCard` and `StyleSheet` all read it.
- Fast unit tests with `node:test` (no new dependency) cover the edges:
  midnight, 6-hour end, time zones, sold out, two dates on one night.
- Live page impact: none expected. Today's behavior is preserved (on sale
  until 6 hours after start, then recap). The new stages exist but nothing
  shows them yet.

### 3. Dates become rows (additive)

- Migration (confirmed before it runs): table `event_dates`.

  | Column | Notes |
  |---|---|
  | `id` | Primary key (the date's existing JSON id) |
  | `funnel_id` | References `event_funnels.funnel_id` |
  | `starts_at`, `time_zone`, `venue`, `price` | |
  | `ticket_url`, `eb_event_id` | `eb_event_id` is parsed once at write time |
  | `status`, `opening_reel_id` | |
  | `published_at` | |

  - Public read, like `funnel_publications`.
  - Writes need `can_publish_funnel`.
- Publish writes the dates to both the publication JSON and `event_dates`
  in one route.
- A one-off backfill copies Big Love's published date.
- A check script compares the JSON and the rows for every event.
- Live page impact: none (nothing reads the table yet).

### 4. Read dates from rows (the switch)

- Readers get dates from `event_dates` when `EVENT_DATES=rows`, else from
  the JSON as today.
- Eventbrite matching uses `eb_event_id` directly.
- Switch in production after the check script shows no differences, and
  after Oct 31.
- Live page impact: the one moment it could change. Guarded by:
  - the check script;
  - a before-and-after comparison of `/f/masquerade`, `/f/biglove` and
    their preview cards;
  - flipping the setting back without a redeploy.

### 5. Time moves the link

- A Vercel cron every 15 minutes finds dates that crossed a stage boundary
  since the last run. It revalidates their link's tags and preview card,
  so "Tonight" and recap happen on time without a publish.
- Live page impact: the page now switches to recap within 15 minutes of
  the 6-hour mark, instead of up to 5 minutes plus whenever a visitor's
  browser notices. Same content, more punctual.

### 6. Remove the old path

- After a few weeks on rows: stop writing `events` into the publication
  JSON, and delete the JSON fallback and the setting.
- Live page impact: none (already reading rows).

## Deliberately not in this plan

- New screens: the calendar, the season inbox, showing the new stages.
  Those are Plans 2 and 3.
- Moving reels, look or copy into tables. They stay one published document.
- Changing link addresses, `funnel_id`, tracking tags, or how leads and
  sales are stored.

## Open questions

- **Is "one event (link) with several dates" still the right shape for
  weekly club nights?** Or should each night be its own event? This plan
  keeps today's shape, and rows make either easy later.
- **Who runs the switch in production, and when?** Proposed: the first week
  of November, after a side-by-side check with you.
