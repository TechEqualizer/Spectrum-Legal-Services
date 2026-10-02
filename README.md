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
- Funnels are listed in `src/data/funnels.ts`; each one's `slug` is its
  link. Any other `/f/...` path is a 404. Each funnel gets its own link
  preview image (`src/app/f/[slug]/opengraph-image.tsx`).

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
  It pads for phone safe areas (notch, home bar). The rail shows labels,
  not counts: there are no made-up like or comment numbers.
- **Events** (`viewed`, `completed`, `skipped`, `exited`, `cta_clicked` for
  Book, `call_clicked`, `text_later_clicked`, `shared`, `liked`) are sent to
  `/api/reel-events` with an anonymous visitor id stored in the browser and
  the link's source tag. Visitors sending Global Privacy Control or Do Not
  Track are not tracked.
- **Leads** from the reels' forms and the hero form go to `/api/leads`, which
  saves them with the visitor id, the reel they came from and the link's
  source tag, then optionally emails the firm through Resend.

## Admin preview (`/admin`)

A UI/UX preview of the reel funnel admin, with **sample data only**
(`src/admin/sample-data.ts`, generated per business from
`src/admin/business.ts`). The business picker in the sidebar switches every
page between The JLF Firm and the Aurelia Med Spa sample, in that
business's colors; the choice is remembered in the browser. There is no login yet, so it never reads the
real Supabase tables, and nothing on it saves or sends. It is not linked
from the public site and is marked `noindex`.

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
  and WebVTT captions. **Preview edits** (or a row's thumbnail) plays the
  edited funnel in the real reel viewer, with nothing tracked or sent.
  Uploads stay in the browser until the admin has storage and a login. The model is
  `src/admin/editor-model.ts`; it starts from the live funnel in
  `src/data/reels.ts`, and edits stay in the page.
- **Overview** (`/admin/overview`): views, watch-through and booking rates, a daily views chart,
  and what viewers did with each reel, for the last 7, 30 or 90 days.
- **Share links**: a builder for tagged funnel links, and which sources bring
  calls and call-back requests per 100 visitors.
- **Funnel map**: the live paths from `src/data/reels.ts` as a diagram.
  Selecting a reel shows its numbers; changing where it leads redraws the map
  (preview only).
- **Drip campaigns**: email sequences that each feature a reel, with a
  trigger, send days, subject lines, and an email preview.
- **Leads**: sample leads with the videos each one watched before booking.

Next steps to make it real: an admin login (Supabase Auth), reading the
tables with the secret key on the server, storing funnels and campaigns in
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
