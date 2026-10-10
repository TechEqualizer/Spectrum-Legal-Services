# Plan 3: Billing (draft for approval)

Organizers pay for Showlnk: the $29 Core plan, monthly, per organizer.
Until now everything has been free while it was built (Plan 2 says Core
gates the fan features later). This plan is a draft: the decisions marked
**Decide** below are yours before step 1.

## First principles

1. **Pay for what earns them money, never for seeing their own data.**
   Results, Leads and their fan list stay viewable (and exportable) even if
   they stop paying. What Core unlocks is what grows the audience: Follow,
   fan-only reels, presale for followers, the calendar feed.
2. **Nothing a fan sees breaks when a card fails.** A lapsed plan turns
   Follow off for new fans, gracefully (the same as Follow not switched on
   today). Existing followers keep their calendar; fan-only reels stay
   locked rather than leaking. The link itself always works: tickets are
   the organizer's income, so we never take the link down.
3. **The card form is Stripe's, not ours.** Stripe Checkout to start,
   Stripe's billing portal to change card, see receipts or cancel. We never
   see or store a card number.
4. **One source of truth.** Stripe says who has paid; a webhook copies that
   into one row per organizer, and every gate reads that row. No gate reads
   Stripe directly, so a slow Stripe never slows a fan's page.
5. **Comped is a plan, not a hack.** Big Love (and anyone Showlnk chooses)
   is on Core for free, recorded the same way, so the gates have no special
   cases. `FOLLOW_ORGANIZERS` retires once plans exist.

## Where we are (facts, from the code)

- Organizers are rows in `organizers`; admins manage them through
  `manages_organizer`. Showlnk staff create clients (New client) and hand
  off a login; there's no self-serve sign-up page.
- Follow and its features are switched on per organizer by the
  `FOLLOW_ORGANIZERS` environment variable (`followOn()` in
  `src/lib/server/fans.ts`). Every fan feature already checks it.
- Eventbrite is the model for a third-party connection: OAuth, a webhook
  with a signature check, a mock server in the tests.
- No Stripe code, keys or account in the project yet.

## Design

- **Table `organizer_plans`** (one row per organizer): plan (`core`),
  status (`trialing`, `active`, `past_due`, `canceled`, `comped`), Stripe
  customer and subscription ids, when the period ends. Written only by the
  server (webhook, and Showlnk staff for comps); read by the organizer's
  admins.
- **`planOf(organizer)`** on the server replaces `followOn()`: Core is on
  when status is `active`, `trialing`, `comped`, or `past_due` within a
  grace period (Stripe retries the card for about a week).
- **Admin, Settings → Plan:** what Core includes, the status in words
  ("Core · renews Nov 10", "Card declined, update it by Nov 17"), and one
  button: Start Core (Checkout) or Manage billing (portal).
- **Where people meet it:** Fans page, the fans-only switch and the
  presale section show "Part of Core" with Start Core, instead of today's
  "Ask Showlnk to switch it on".
- **Webhook** `/api/stripe/webhook`: checks Stripe's signature, then
  updates the row on checkout completed, subscription updated or deleted,
  and invoice payment failed.
- **Tests:** a mock Stripe server like the Eventbrite one: Checkout,
  portal, signed webhooks, card failures.

## Steps

0. **Decisions and a Stripe account.** Your answers to the questions below;
   a Stripe account in test mode; the Core product and price created in
   Stripe; keys added to Vercel (`STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CORE`). Live page impact: none.
1. **Plans table and the one gate.** Migration for `organizer_plans`;
   `planOf()`; Big Love comped. `followOn()` reads the plan (and still the
   environment variable, until step 4). Live page impact: none.
2. **Start Core and Manage billing.** Settings → Plan card; Checkout and
   portal sessions; the webhook. Test mode end to end. Live page impact:
   none.
3. **Gates and upgrade prompts.** "Part of Core" where the features live;
   lapsed plans turn Follow off for new fans as described above. Live page
   impact: only for organizers without Core.
4. **Go live.** Switch to live keys; retire `FOLLOW_ORGANIZERS`; a receipt
   and "card declined" email check. Live page impact: none for Big Love
   (comped).

## Measures

- Organizers on Core, trial to paid, churn per month.
- Days from New client to Start Core.

## Deliberately not in this plan

- Email blasts to followers: Plan 4, the Email add-on.
- Annual plans, coupons, per-seat pricing, taxes beyond Stripe Tax's
  defaults.
- A public pricing page (the waitlist landing stays as is).

## Open questions (Decide)

1. **What's in Core vs free?** Proposal: free keeps the event link,
   reels, Results, Share, Leads and Eventbrite; Core adds Follow, fan-only
   reels, presale, the calendar feed and the Fans page's new followers.
2. **Trial?** Proposal: 14 days of Core, no card needed to start; card
   asked at the end.
3. **Who pays:** the organizer directly, or Showlnk invoices agencies that
   run several organizers?
4. **Stripe account:** do you have one for Showlnk (business details,
   payouts bank)? I can't create it; you sign up at stripe.com.
5. **Big Love:** comped indefinitely, or comped until a date?
