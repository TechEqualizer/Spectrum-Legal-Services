# Seed data

Organizers and their events, as they go into the `organizers` and
`event_funnels` tables (see `../migrations/20261007000000_organizers_events.sql`).
Each event's `data` is a funnel definition (`src/data/funnel-types.ts`) and
must pass `parseFunnelRecord` (`src/lib/funnel-record.ts`).

- `biglove.json`: Big Love Productions, Masquerade on the Runway
  (`/f/masquerade`), a real client. Built from the event's flyer and its
  Eventbrite page (prices, 30+, dress code, refunds); its photos are crops of
  the flyer in `public/clients/masquerade`. The end-to-end tests' mock
  Supabase loads this file too.

Once a row is in the database, the database is the source of truth: edit
the event there (or, soon, in the admin), not in this file.
