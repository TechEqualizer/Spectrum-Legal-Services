# Hosting on Vercel (Pro)

Showlnk runs on Vercel, on the Pro plan since Oct 10, 2026. The database
(Supabase, project Reel Funnels) is in AWS us-east-1.

## In the code

- `vercel.json` pins the app's functions to `iad1` (Washington, D.C.), next
  to the database in us-east-1. Every page and API call talks to Supabase,
  so a function far from it pays the distance on every query.
- Reading a flyer (`/api/start/flyer`, `/api/admin/import-event`) may take
  up to 120 seconds, and drafting a funnel (`/api/admin/draft-funnel`) up
  to 120; Claude can be slow on a big flyer at busy times.

## In the dashboard (Project → Settings), once

| Where | Setting | Why |
| --- | --- | --- |
| Functions | Fluid compute on | One instance serves many requests while it waits on Supabase, Claude or Stripe: fewer cold starts, lower cost. |
| Advanced | Skew Protection on (max age 12 hours) | During a deploy, someone mid-way through the wizard or the admin keeps talking to the version their page came from, instead of breaking. |
| Firewall → Rules | The rate limits below | Stops a script from flooding the public forms, burning AI credit or guessing passwords. Counted per IP at Vercel's edge, before the app runs. |
| Firewall | Bot protection on (challenge) | Keeps automated traffic off the forms. |
| Billing → Spend Management | A monthly budget with alerts at 50%, 75%, 100% | No surprise bill if traffic or AI use spikes. |
| Speed Insights, Web Analytics | On | Real visitors' load times and page views per link, Pro's higher limits. |

### Firewall rate limits

| Rule | Path starts with | Limit per IP | When exceeded |
| --- | --- | --- | --- |
| Sign-up wizard | `/api/start/` | 20 per minute | Deny (429) |
| Admin sign-in | `/api/admin/login` | 10 per minute | Deny (429) |
| Follow | `/api/fans/` | 20 per minute | Deny (429) |
| Forms | `/api/leads`, `/api/waitlist` | 10 per minute | Deny (429) |
| Viewing reels | `/api/reel-events` | 300 per minute | Deny (429) |

The app has its own limits too (follow emails: 3 per email and 10 per IP an
hour; each invite reads 5 flyers), so these are a first wall, not the only
one. Stripe's and Eventbrite's webhooks (`/api/stripe/webhook`,
`/api/eventbrite/webhook`) are left out: they're signed, and limiting them
would make the providers retry.
