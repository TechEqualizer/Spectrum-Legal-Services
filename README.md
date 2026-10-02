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

## Reel funnel

The "Know Your Rights" section (`src/components/Reels.tsx`) is a branching
video funnel, like a drip campaign inside one visit: what a visitor does with
each reel decides which one comes next.

- **Paths** live in `src/data/reels.ts`. Each reel has a `completed` link
  (watched to the end, usually a deeper reel on the same topic) and a
  `skipped` link (swiped or tapped next, usually another practice area).
  `null` ends on a "talk to an attorney" card. Bump `defaultFunnel.id`
  whenever the paths change, so results from different versions stay apart.
- **Videos**: put files in `public/reels/` and add a `video` entry to the
  reel. Reels without one show a "Video coming soon" slide for 8 seconds.
- **Events** (`viewed`, `completed`, `skipped`, `cta_clicked`, `exited`) are
  sent to `/api/reel-events` with an anonymous visitor id stored in the
  browser. Visitors sending Global Privacy Control or Do Not Track are not
  tracked.
- **Leads** from the hero case evaluation form go to `/api/leads`, which saves
  them with the visitor id and the reel that led to the booking, then
  optionally emails the firm through Resend.

## Admin preview (`/admin`)

A UI/UX preview of the reel funnel admin, with **sample data only**
(`src/admin/sample-data.ts`). There is no login yet, so it never reads the
real Supabase tables, and nothing on it saves or sends. It is not linked
from the public site and is marked `noindex`.

- **Overview**: views, watch-through and booking rates, a daily views chart,
  and what viewers did with each reel, for the last 7, 30 or 90 days.
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

`supabase/migrations/` holds the schema: `reel_events`, `leads`, and two
functions, `log_reel_event` and `submit_lead`. The tables have row-level
security with no policies, so the publishable key cannot read or write them
directly; it can only call the two functions, which validate their input.
Read the data in the Supabase dashboard (SQL editor or Table editor).

Useful queries:

```sql
-- How each reel performs
select reel_id,
       count(*) filter (where event = 'viewed')      as views,
       count(*) filter (where event = 'completed')   as completed,
       count(*) filter (where event = 'skipped')     as skipped,
       count(*) filter (where event = 'cta_clicked') as booked
from reel_events
where funnel_id = 'know-your-rights-v1'
group by reel_id
order by views desc;

-- Leads with the videos each person watched before booking
select l.created_at, l.name, l.case_type, l.referring_reel_id,
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
