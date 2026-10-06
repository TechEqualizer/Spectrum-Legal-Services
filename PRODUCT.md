# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Event organizers (primary).** Nightlife and event promoters, like Big Love
  Productions, who run their own events in the admin. Not technical; usually
  on a phone, between other things, close to an event date. Their job: turn
  the people who tap their Instagram bio, story or ad into ticket buyers, and
  see what worked.
- **The agency (secondary).** The product's owner sets up each organizer,
  handles the first event with them, and steps in to help. Uses the admin on
  desktop, across several organizers.
- **Visitors.** People who open an organizer's link from Instagram, a text or
  a printed flyer. They decide in seconds whether the night is for them, then
  buy tickets on the organizer's ticketing page.

## Product Purpose

Event Reels turns an event's link into a short story of vertical video reels
that sells the night and ends on Tickets. An organizer drops in a flyer and
gets four things: the opening scene, and three core reels built on the
proven reasons people buy a ticket. **The Night** (desire and self-image:
"Will this be amazing?"), **Your People** (belonging and real social proof:
"Is this for someone like me?") and **Last Call** (fear of missing out, from
true deadlines: "Why buy now?"). Claude reads the dates, the look and the
selling points and drafts all four with a video prompt each; the organizer
reviews and publishes. Success is ticket sales the organizer can trace to the reel and
source that made them, and organizers who can do all of this themselves.

## Positioning

Not a link-in-bio page of blocks. The link is one story, told in reels, in
the organizer's own brand, built from their flyer, with the ticket button as
the destination of every reel. Each ticket click carries the reel and source
that earned it (Eventbrite affiliate codes, UTM tags elsewhere).

## Operating Context

- Links live in Instagram and TikTok bios and stories, texts, ads, and QR
  codes on printed flyers; nearly every visitor is on a phone.
- Tickets are sold on the organizer's own platform (Eventbrite, Posh, Dice,
  or other); the link sends people there and never takes payment itself.
- An organizer works event by event: a flyer arrives, dates and prices
  change, sold-out nights become waitlists, past nights become recaps.
- Organizers sign in to `/admin`; their link is `/f/<slug>`.

## Capabilities and Constraints

- Funnel links (`/f/<slug>`): an opening scene with the date(s) and Tickets,
  then reels with a Tickets button, sign-up forms ("Updates", waitlist,
  presale) and an end card. Several dates of one event are supported; a
  single date gets its own card.
- Admin: Reels studio (opening scene, dates, reels, style, live phone
  preview, path strip), flyer import (dates, look, and the four-part draft:
  opening scene, The Night, Your People, Last Call, with video prompts), Leads, Results, Share, Paths. Edits save in the browser and
  go live on Publish, with undo.
- Stack: Next.js 16 App Router, React 19, Tailwind 4, Supabase (auth,
  publications, storage, leads), Claude API for flyers and drafts, Vercel.
- Organizers and their events live in the database (`organizers`,
  `event_funnels`); the demos stay in code. Several events per organizer and
  one permanent organizer link are planned next.
- Results and leads shown in the admin are sample numbers until real
  tracking data is wired in.
- Video generation inside the product is not built; organizers copy prompts
  into a video tool and upload the clips.
- Law firm (`/f/jlf`) and med spa (`/f/medspa`) funnels remain as demos; the
  focus is events and nightlife.

## Brand Commitments

- Product name: **Showlnk** (was Event Reels; the domain is showlnk). The
  home page is the Showlnk waitlist.
- On a funnel link, the organizer's brand leads (their name, colors, title
  typeface, flyer); the product's own brand stays out of the way.
- Agreed direction from earlier reviews: keep it elegant, and make Tickets
  the hero of every screen a visitor sees.

## Evidence on Hand

- One live client: Big Love Productions, Masquerade on the Runway
  (`/f/masquerade`, seeded from `supabase/seed/biglove.json`), with its flyer
  and Eventbrite details (`public/clients/masquerade`).
- Sample funnels, always labeled as samples: Golden Hour Sundays
  (`/f/events`), Aurelia Med Spa (`/f/medspa`), and The JLF Firm concept
  (`/f/jlf`).
- No real testimonials, sales figures, conversion rates or customer counts
  exist yet. Never present sample results as real ones.

## Product Principles

1. **Tickets are the destination.** Every visitor screen makes the next step
   to tickets obvious; nothing competes with it.
2. **One story, not blocks.** The link is a sequence of reels with a beginning
   and an end, not a menu of links.
3. **The flyer is the starting point.** Anything the flyer already says
   (dates, prices, look, selling points) is read, not retyped.
4. **Built for an organizer on a phone.** Every admin task works one-handed
   on a phone, with plain words, visible feedback and undo.
5. **Only true claims.** Nothing on a link is invented: no made-up
   performers, prices, results or scarcity.

## Accessibility & Inclusion

- WCAG 2.2 AA contrast on every funnel, including organizer-chosen colors
  (adjusted automatically when they fall short).
- 44px minimum touch targets, text no smaller than 11px, full keyboard
  operation, screen-reader labels on icon-only controls, and reduced-motion
  support.
