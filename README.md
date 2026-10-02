# Spectrum Legal Services

Landing page for Spectrum Legal Services: Next.js 16 (App Router), React 19, Tailwind CSS 4.

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
- **Leads** from the hero and contact forms go to `/api/leads`, which saves
  them with the visitor id and the reel that led to the booking, then
  optionally emails the firm through Resend.

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
