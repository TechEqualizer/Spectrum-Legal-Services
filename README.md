# The JLF Firm (concept site)

Concept landing page for The JLF Firm, a California personal injury firm:
Next.js 16 (App Router), React 19, Tailwind CSS 4.

**This is a sales mock-up, not the firm's official website** (that is
jlffirm.com). Firm details live in `src/config/site.ts` and come from the
firm's public directory listings and website; confirm each one with the firm.

### Demo mode (on by default)

While `NEXT_PUBLIC_DEMO_MODE` is anything other than `false`:

- a banner says the site is a concept and links to jlffirm.com,
- pages send `noindex, nofollow` (meta tag and `X-Robots-Tag` header),
- the intake forms show a "demo, not sent" message and `/api/leads`
  returns 403, so nobody's details are collected.

Set `NEXT_PUBLIC_DEMO_MODE=false` only after the firm has approved the site
and wants leads delivered.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Without the Supabase variables the site still runs, but the intake forms show
an error instead of saving, and reel events are dropped.

## Shareable funnel link (`/f/jlf`)

The reel funnel on its own, with no website around it: the link to put in an
Instagram or TikTok bio, a Google Business Profile, a text, or a referral
partner's email. It opens on "What happened?" topic choices; each one starts
the reels at that topic.

- **Every reel has three buttons**: the funnel's main action (`primaryCta`:
  `call` for The JLF Firm, `book` suits businesses where people weigh their
  options), plus the other one and **Text me later**. Booking and "text me
  later" open a short form over the reel, so visitors never leave the videos.
- **Where the link was shared**: add `?src=<tag>` (e.g. `?src=instagram`).
  The tag is saved with every reel event and lead, and the most recent tag is
  remembered in the browser. `/admin/links` builds tagged links.
- **Start on one video**: `?start=<reel id>` skips the topic choices. Follow-up
  texts use this to send someone the next video, e.g.
  `/f/jlf?start=injury-claim-deadlines&src=sms`.
- **Text me later** saves a lead with `intent = 'text_later'`, the visitor's
  mobile number, and the exact consent wording they agreed to (the
  funnel's `brand.smsConsent`, which the business's counsel should approve). **Texts are not sent yet**: that needs an SMS provider (e.g.
  Twilio) and a job that texts each request the link to its next reel.
- **Share**: the end card's "Send to someone who got hurt" shares the link
  tagged `src=share`.
- **Opening scene**: the top of the opening screen plays like the start of
  a trailer: the scene fades up from black, then the title comes up out of a soft blur
  over film grain and a vignette. Behind it plays `cover.hero.media` (a
  video file, a YouTube video or Short, or a photo; otherwise the first
  reel's), muted, looping and slowly zooming; a YouTube video shows its
  thumbnail until it's actually playing; until there is one, a
  low sun and lens flare drawn in the brand's own colors. Set
  `cover.hero` (title, tagline, button label, optional `media` and `zoom`)
  to make the scene the whole first screen, with nothing to scroll: the
  dates (or topics) as Instagram-style story circles, a "Sneak peek
  inside" button into the reels, Get tickets (or Call) beside it, and the
  fine print. Swiping up steps inside, like moving to the next reel.
  Without it, the heading sits over a shorter scene and the choices follow. People
  who turn on "reduce motion" get a still scene, and a browser that skips
  animations still shows every word (`src/components/CinematicHero.tsx`).
- Funnels are listed in `src/data/funnels.ts`; each one's `slug` is its
  link. Any other `/f/...` path is a 404. Each funnel gets its own link
  preview image (`src/app/f/[slug]/opengraph-image.tsx`).

### Event funnels (`/f/events`)

For event organizers, a funnel sells tickets instead of booking calls
(`primaryCta: "tickets"`):

- **Event dates** live in `funnel.events` (name, start time, venue, price,
  ticket link, `on_sale` / `few_left` / `sold_out`). Reels point at one with
  `eventId`.
- **"Which night?"**: the opening screen lists upcoming dates with a
  countdown (Tonight, Tomorrow, In 3 days), price and status, plus "Watch
  last time" for the latest recap.
- **Recaps happen on their own**: once a date is over, its reels show
  "Recap" and their Tickets button sells the next date on sale. Sold-out
  dates do the same; if nothing is on sale, Tickets becomes **Waitlist**.
- **Tickets** opens the organizer's own ticket page (Eventbrite, Posh,
  Dice...) in a new tab, with tracking added so their ticketing report shows
  which source sold each ticket: Eventbrite's `aff=reels_<source>` code, or
  UTM tags for other platforms. Logged as `cta_clicked`.
- **Presale** (the "Text me later" form) collects numbers for the next
  ticket drop, with SMS consent.
- `brand.phone` is optional; without it, Call buttons are hidden.

`/f/events` is a sample: Golden Hour Sundays is made up, its dates are
always relative to today, and its ticket links go to example.com.

### DM demos ("Prepared for ...")

To pitch an organizer, build them a private preview from their own clips:

```bash
cp scripts/demo-template/example.json prospect.json   # edit: name, colors,
                                                      # events, ticket links, clips
node scripts/new-demo.mjs prospect.json               # prints /f/<name>-<random>
git add -A && git commit -m "demo: <name>" && git push
```

The opening scene plays the first clip behind the organizer's name (or
`"heroTitle"` and `"heroTagline"` if set). Clips (`"clip"`) are cropped and compressed with `scripts/prepare-reel.sh`
into `public/demos/<slug>/`; reels can also use `"youtube"` links or
`"photo"` files. The link has a random suffix, says "Private preview
prepared for ...", is never indexed, and sends nothing (it's a sample), but
its Tickets buttons go to the organizer's real ticket page. The script
refuses an accent color too light for white text. Remove a demo with
`node scripts/new-demo.mjs --remove <slug>` (and `--list` shows them all).
Only use a prospect's content for the private pitch, and take it down if
they say no.

### More than one business

Each funnel carries its own reels, paths and **brand**
(`src/data/funnel-types.ts`): name, logo image or text wordmark, phone,
colors, the services a lead can ask about, SMS consent wording,
disclaimers, and every button and form label. The colors override the
tokens in `globals.css` on the funnel's pages only, so the reel viewer and
forms re-skin without code changes.

| Link | Business | Main button |
| --- | --- | --- |
| `/f/jlf` | The JLF Firm (concept) | Call |
| `/f/medspa` | Aurelia Med Spa (**sample**, made up) | Book |
| `/f/events` | Golden Hour Sundays (**sample**, made up) | Tickets |
| `/f/masquerade` | Big Love Productions: Masquerade on the Runway (**client**) | Tickets |

**`/f/masquerade` is a real client's link**, so its forms and tracking are
live. Its content comes from the event flyer (`src/data/masquerade.ts`): one
date (Sat, Oct 31, 8pm, Detroit, 21+), Eventbrite tickets, the flyer behind
the opening screen, and two reels with photos cropped from it
(`public/clients/masquerade`). The other reels show "Video coming soon" until
their videos are uploaded in the admin, where Big Love Productions replaced
Golden Hour Sundays. Golden Hour stays at `/f/events` as a sample to show
other organizers.

**`/f/medspa` is a sample for pitching aesthetics businesses.** Aurelia Med
Spa doesn't exist: the page always says so, is never indexed, uses a
555-01xx phone number reserved for fiction, and its forms and tracking send
nothing (the API refuses its funnel id too). Its nine reels walk from a
topic (wrinkle relaxers, lip filler, facials, microneedling, laser hair
removal) to pricing and "what happens at your consultation", then the end
card. Scripts are placeholders written to avoid outcome claims; a real
clinic's medical director should review its own.

To add a business: copy `src/data/medspa.ts`, change the brand, reels and
links, remove `sample` for a real client, and add it to
`src/data/funnels.ts`. Lead emails go to `LEAD_NOTIFY_EMAIL` for every
funnel for now, with the funnel's name in the message; per-business
routing comes with the admin login.

## Reel funnel

The "Injury Insights" section (`src/components/Reels.tsx`) is a branching
video funnel, like a drip campaign inside one visit: what a visitor does with
each reel decides which one comes next.

- **Paths** live in `src/data/reels.ts`. Each reel has a `completed` link
  (watched to the end, usually a deeper reel on the same topic) and a
  `skipped` link (swiped or tapped next, usually another practice area).
  `null` ends on a "talk to an attorney" card. Bump `defaultFunnel.id`
  whenever the paths change, so results from different versions stay apart.
- **Media**: each reel's `media` is a video file (`{ kind: "video", src,
  poster?, captions? }`, e.g. from `public/reels/`), a YouTube video or
  Short (`{ kind: "youtube", id }`, played in the privacy-enhanced
  youtube-nocookie player, driven by the reel so it pauses, mutes and
  advances like a file), or a photo (`{ kind: "image", src }`, shown for 8
  seconds like a story). Reels without media show "Video coming soon".
  TikTok, Instagram and Facebook videos can't be embedded; download and
  upload them instead.
- **Preparing clips**: `scripts/prepare-reel.sh <clip> <output-name> [start]
  [length]` (needs ffmpeg) turns any clip into a reel: 720x1280 center crop,
  H.264 MP4 with fast start, and a JPEG cover from the first second.
- **Layout**: like YouTube Shorts: full-bleed media, a back arrow and sound
  controls at the top, a rail of plain icons (Like, the main action in the
  brand color, the other action, Text me, Share) ending in the business's
  avatar, and at the bottom left the avatar, `brand.handle` and a Book (or
  Call) pill where Shorts has "Join". The title is one line; tapping it
  shows the summary, topic and price chips, and the disclaimer. A thin
  progress line runs along the bottom. Tap to pause, double-tap to like.
  Sizes follow Shorts: about 28px rail icons roughly 62px apart, a 32px
  channel avatar, 15px handle and title, a 2px progress line. On desktop
  the video is a 9:16 card with the rail beside it as round buttons, as
  on YouTube's site. It pads for phone safe areas (notch, home bar). The rail shows labels,
  not counts: there are no made-up like or comment numbers.
- **How hard a reel sells** (`emphasis`): by default the main action
  *builds up*: Book (or Call) starts quiet, an outline on the pill and a
  plain icon on the rail, and fills with the brand color 60% of the way
  through, like the call-to-action strip on a sponsored reel. `"quiet"`
  hides the pill and keeps the rail plain for teaching reels; `"bold"`
  highlights it from the start for pricing or consultation reels. The end
  card always shows it. Set per reel in the admin's Edit reel ("Selling").
- **Events** (`viewed`, `completed`, `skipped`, `exited`, `cta_clicked` for
  Book, `call_clicked`, `text_later_clicked`, `shared`, `liked`) are sent to
  `/api/reel-events` with an anonymous visitor id stored in the browser and
  the link's source tag. Visitors sending Global Privacy Control or Do Not
  Track are not tracked.
- **Leads** from the reels' forms and the hero form go to `/api/leads`, which
  saves them with the visitor id, the reel they came from and the link's
  source tag, then optionally emails the firm through Resend.

## Admin (`/admin`)

**Sign in** at `/admin/login` with an email and password (Supabase Auth).
Only accounts listed in the `admin_users` table get in, and each one can
publish only the funnels listed for it (`'*'` for all). A new admin starts
with a temporary password and must choose their own at first sign-in;
**Change password** and **Sign out** are in the account menu.

**Publishing**: reel edits save in the browser as you go. When they differ
from what's live, a bar offers **Publish** (or **Discard**). Publishing
uploads any new files straight from the browser to Supabase Storage (bucket
`reel-media`, 50 MB per file, a folder per funnel), then stores the edits in
`funnel_publications` and refreshes the funnel link at once. Every publish
is also kept in `funnel_publication_history`. **Take down published edits**
(in Funnel settings) puts the link back to its built-in content. Publish
sends the default funnel.

How it's secured: the sign-in tokens are httpOnly cookies refreshed by
`src/proxy.ts`; pages check the admin with Supabase on every visit; and
every write is made with the admin's own token, so Supabase's row-level
security decides what it may change (`supabase/migrations/20261006000000_admin_publishing.sql`).
The site needs no secret key. Published content is validated on the server
(`src/lib/publication.ts`) before it's stored and again when it's read.

**Adding an admin**: create the user in Supabase (Authentication, Users,
"Add user", with "Auto Confirm User"), then
`insert into admin_users (email, slugs) values ('them@example.com', '{jlf}');`.

Results and Leads still show **sample data** (`src/admin/sample-data.ts`,
generated per business from `src/admin/business.ts`). The business picker
switches every page between the businesses the admin may edit, in that
business's colors. It is not linked from the public site and is marked
`noindex`.

- **Opening screen** (top of the Reels page): **Edit** opens one sheet for
  the words visitors see first (title, tagline, main button and dates
  heading on event funnels; heading and intro on the others) and what plays
  behind them, with a live preview. An empty field uses the original words.
  **Remove background** has Undo.
- **Dates** (event funnels): the dates as rows; tap one to change its name,
  date and time, price, venue, ticket link (https) and status (On sale, Few
  left, Sold out). **+ Add date** starts a week after the last one with the
  same details. Delete has Undo. Each date is a story circle on the opening
  screen. Words and dates publish with everything else.
- **Import flyer** (Dates): choose a flyer (photo, screenshot or PDF) or
  paste the event details, and Claude reads the date, time, venue, price and
  ticket link. Each date it finds opens in the date sheet, filled in and
  marked with what the flyer left out, so nothing is added until it's
  reviewed. Photos are shrunk in the browser first. It needs
  `ANTHROPIC_API_KEY` (`/api/admin/import-event`, `src/lib/server/flyer-import.ts`);
  without it the sheet says so. QR codes aren't read: paste those ticket
  links.
- **Draft my funnel** (in the import sheet, after reading a flyer): Claude
  plans the whole funnel from the same flyer, with no re-upload: the opening
  screen's words, and 4 to 6 reels in selling order (hook, the show, who's
  there, details, the dare, last call), each linked to its date. Each reel,
  and the opening scene, also gets a ready-to-paste video prompt (camera
  move, length, 9:16, the scene, a shared style lock, and what to avoid,
  such as on-screen text or warped hands). "Use this draft" replaces the
  published funnel's reels (the old ones stay in the library; Undo puts
  everything back). Drafted reels are marked **Needs video**, and their
  prompt, with **Copy prompt**, is in the reel's editor and on the opening
  screen card. Prompts are notes, never published, kept in this browser
  (`src/admin/prompts.ts`) (`/api/admin/draft-funnel`,
  `src/lib/server/funnel-draft.ts`).
- **Match your flyer's style**: a flyer photo or PDF also gives three
  ready-made styles (True to flyer, Bold, Elegant: five brand colors and a
  title typeface each), plus the flyer's own colors. The import sheet shows
  them in a segmented control with a preview; **Use this style** applies one
  (with Undo), optionally with the flyer as the background. The flyer is kept
  with the style (`look.flyer`), so it never has to be uploaded again.
- **Style** (Opening screen card): one sheet with a live preview of the
  opening screen (logo, title, date circles, both buttons) that updates as
  you tap. **Suggested** styles and **Original**; **Colors** (Background,
  Buttons, Highlights) picked from the flyer's own swatches, with
  **Shuffle** for another good pairing; **Title** samples in all five
  typefaces (classic serif, fashion serif, engraved capitals, bold
  condensed, modern sans); **Background**: Flyer (sharp over a blur of
  itself), Blurred (its colors only), or Glow. Cancel changes nothing; Done
  saves with Undo. Colors are kept readable automatically, and the sheet
  says when a pick was adjusted; a light accent such as gold keeps its color
  and gets dark button words (`--on-accent`). `src/lib/look.ts`,
  `src/admin/components/StyleSheet.tsx`, `src/components/lookFonts.ts`.
- **Selling the next date** (several dates): when the next date on sale starts
  within 48 hours, or is "Few left", **Tickets** is the main button (orange,
  shimmering) and says which date ("Tickets · Sun, Oct 4"); Watch steps back.
  Under the buttons, one line says what it buys: date, time, price and the
  age limit (`brand.ageLimit`, e.g. "21+"). Sold-out dates come after the
  dates on sale, dimmed and marked "Waitlist"; their reels lead with
  **Join the waitlist** (a waitlist sheet) and offer the next date by name
  ("Get Oct 4") instead of silently selling it.
- **One upcoming date**: the opening screen shows a single event card
  (day, time, venue, price, status; tap to watch) instead of a row of one
  circle, with **Add to calendar** (`/f/<slug>/calendar/<event id>`, an
  .ics file with a reminder) and **Watch last time**. The line above the
  title becomes a hook ("This Sunday", "One night only") and, on the day,
  a countdown ("Starts in 3h 20m"). Within 48 hours, or once it's "Few
  left", **Get tickets** becomes the main button.
- **A reel for each date**: a date's **Opens with** picks the reel its
  circle plays (or **+ New reel for this date**, which opens the reel
  editor ready for it). That reel's Tickets button sells that date; picking
  a reel that belonged to another date moves it. A reel's own **Sells
  tickets for** sets its date from the other side, and each reel row shows
  its date. Rows without a reel say "No reel yet".
- **Studio** (the Reels page on screens 1280px and wider): three columns.
  On the left, the story in the order visitors meet it: **1 Opening scene →
  2 Dates → 3 Reels**, each with **Show** to jump the phone there. In the
  middle, the real funnel running in a phone with your unpublished edits
  (`/admin/preview/<slug>`, fed by `postMessage`; nothing tapped there is
  tracked or sent), with **Restart**; a reel's preview button plays it in
  the phone. On the right, **Design** (the Style controls, applied live),
  **Results** (sample numbers per reel; tap one to play it) and
  **Settings** (funnel settings). The top bar has **Undo / Redo** (also
  ⌘Z / ⇧⌘Z), the live link, Discard and **Publish**. Narrower screens and
  phones keep the single-column editor below.
- **Path strip** (under the studio's phone): the funnel the link shows, as a
  path: **Opening → each reel in order → End** (the main action). Each reel
  shows the date circles that open it ("Oct 4"), its detours ("Skipped → 3",
  "Watched → End"), and fades if no topic, date or path reaches it. Tap a
  stop to play it in the phone; as you tap through the phone, the stop on
  screen is highlighted ("On screen"). The preview reports what's on screen
  with `postMessage`; the End stop opens the end card directly.
- **Reels** (the admin home): each funnel as an ordered list. Every reel goes
  to the next one unless it has its own path for "watched to the end" or
  "skipped", so branching is added only where it helps. Rows show the reel's
  button, topic choice, missing video, broken cover image, any reel no path
  reaches, and its results. Funnels have a "shown to" trigger (any visitor,
  returning visitor, a link's source tag...) and one is the default. The edit
  dialog covers content (title, topic, summary), media, the reel's main
  button, and its paths. **Media**: upload a video (MP4, MOV, WebM, up to
  500 MB) or photo (JPEG, PNG, WebP, GIF, up to 25 MB) by dragging or
  choosing a file, or paste a link (YouTube watch, Shorts and youtu.be
  links, or a direct video or photo link). Videos can add a cover image
  and WebVTT captions; a pasted link counts as soon as it's valid.
  **Preview** (or a row's thumbnail) plays the edited funnel in the real
  reel viewer, with nothing tracked or sent. **Saving**: every change saves
  in this browser as you go, per business, uploaded files included
  (`src/admin/drafts.ts`: localStorage, with files in IndexedDB), and
  survives a reload; **Reset to live** discards it. The live link changes
  once the admin has a login and a database. The model is
  `src/admin/editor-model.ts`; it starts from the live funnel.
- **Results** (`/admin/overview`): views, watch-through and booking rates, a daily views chart,
  and what viewers did with each reel, for the last 7, 30 or 90 days.
- **Share**: a builder for tagged funnel links, and which sources bring
  calls and call-back requests per 100 visitors.
- **Paths**: the live paths from `src/data/reels.ts` as a diagram.
  Selecting a reel shows its numbers; changing where it leads redraws the map
  (preview only).
- **Leads**: sample leads with the videos each one watched before booking.
- **Navigation**: on phones the five places sit in a bottom tab bar; on
  desktop, a sidebar. Screens follow `.claude/skills/simple-navigation`.

Next steps to make it real: an admin login (Supabase Auth), reading the
tables with the secret key on the server, storing funnels in
Supabase, and sending email through Resend.

## Database (Supabase)

`supabase/migrations/` holds the schema: `reel_events`, `leads`, and the
functions the site writes through, `log_reel_event_v2` and `submit_lead_v3`
(which also records the lead's `funnel_id`).
The tables have row-level security with no policies, so the publishable key
cannot read or write them directly; it can only call the functions, which
validate their input. Older versions (`log_reel_event`, `submit_lead`,
`submit_lead_v2`) are kept for earlier deploys; drop them once every deploy
uses the current ones (the SQL is at the top of
`20261003000000_funnel_links.sql`).
Read the data in the Supabase dashboard (SQL editor or Table editor).

Useful queries:

```sql
-- How each reel performs
select reel_id,
       count(*) filter (where event = 'viewed')      as views,
       count(*) filter (where event = 'completed')   as completed,
       count(*) filter (where event = 'skipped')     as skipped,
       count(*) filter (where event = 'call_clicked') as calls,
       count(*) filter (where event = 'cta_clicked') as booked
from reel_events
where funnel_id = 'jlf-injury-v1'
group by reel_id
order by views desc;

-- Which links bring calls: actions per 100 visitors, by source tag
select coalesce(source_tag, 'direct') as source,
       count(distinct visitor_id) as visitors,
       count(*) filter (where event = 'call_clicked') as calls,
       count(*) filter (where event = 'cta_clicked') as book_taps,
       round(100.0 * count(*) filter (where event in ('call_clicked', 'cta_clicked'))
             / nullif(count(distinct visitor_id), 0), 1) as per_100
from reel_events
where funnel_id = 'jlf-injury-v1'
group by 1
order by per_100 desc nulls last;

-- "Text me later" requests waiting for their next video
select created_at, name, phone, case_type, referring_reel_id, source_tag
from leads
where intent = 'text_later'
order by created_at;

-- Leads with the videos each person watched before booking
select l.created_at, l.name, l.intent, l.case_type, l.referring_reel_id, l.source_tag,
       array_agg(distinct e.reel_id) filter (where e.event = 'completed') as watched
from leads l
left join reel_events e on e.visitor_id = l.visitor_id and e.created_at <= l.created_at
group by l.id
order by l.created_at desc;
```

## Before launch

Contact details, stats, testimonials and reel scripts are placeholders. An
attorney should review all marketing copy against the state bar's advertising
rules, and the site needs a privacy policy that covers the visitor id and the
intake forms.
