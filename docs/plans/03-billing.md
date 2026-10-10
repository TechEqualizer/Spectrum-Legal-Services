# Plan 3: Billing

Organizers pay for Showlnk: the Core plan, per organizer. Until now
everything has been free while it was built (Plan 2 says Core gates the
fan features later). Decided Oct 10, 2026 (see Decided below).

## What works elsewhere (researched Oct 2026)

| Product | Closest to | How it charges |
| --- | --- | --- |
| Laylo | Follow, drops, presale codes | Free to start; Pro $25/mo or $300/yr (unlimited RSVPs, pixels, message on demand); texts and emails bought separately as credits ($10 per 650 texts, $10 per 5,000 emails) |
| Linktree | The bio link | Free forever (unlimited links, email collection); Starter ~$8, Pro ~$15, Premium ~$35 a month; about 20% off yearly; 7-day trial on paid tiers |
| Feature.fm / Hypeddit | Smart links, fan gates | Free smart links; fan gates and advanced features paid (~$9 to $39/mo) |
| Posh, DICE | Nightlife ticketing | No subscription: a cut of each ticket (Posh 10% + $0.99, paid by the buyer; DICE negotiated) |

What they agree on, and what this plan copies:

1. **A generous free plan wins the bio.** Linktree and Laylo let anyone
   start free; the paid plan sells scale and control, not the basics.
2. **Let people taste the moat, then charge for scale.** Laylo's free plan
   collects fans; Pro makes it unlimited and adds the power tools. Showlnk
   copies that: Follow works on free up to a cap, so organizers see their
   list grow before they pay.
3. **Messaging is metered, never bundled.** Laylo sells texts and emails as
   credits on top of the plan, because sending costs real money per
   message. Plan 4 (email blasts) does the same.
4. **Yearly at about two months free.** Laylo $25/$300, Linktree ~20% off.
5. **Ticket cuts belong to the ticketing company.** Posh and DICE take a
   cut of each ticket; Showlnk sends buyers to Eventbrite and stays a flat
   subscription, so organizers keep every ticket dollar. That's the pitch
   against Posh's fees.

Sources: [Laylo](https://laylo.com/), [Laylo on Shopify](https://apps.shopify.com/laylo),
[Linktree pricing 2026 (Unilink)](https://www.unilink.us/blog/linktree-pricing-2026),
[Linktree pricing (u2l)](https://u2l.ai/blog/linktree-pricing.md),
[Hypeddit vs ToneDen vs Feature.fm](https://twostorymelody.com/hypeddit-vs-toneden-vs-featurefm/),
[Posh fees](https://www.ticketfairy.com/en-mx/event-ticketing/posh-vs-shotgun),
[DICE alternatives](https://hi.events/dice-alternative). Several are
competitors' pages; check prices on the vendors' own sites before quoting.

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

- **Plans:**
  - **Free:** the event link, reels, Results, Share, Leads, Eventbrite, and
    Follow up to 100 fans (the list keeps growing in view; new follows past
    100 wait until Core).
  - **Core, $29/month or $290/year:** unlimited fans, fan-only reels,
    presale for followers, the calendar feed, no Showlnk branding on the
    link.
  - **Email credits (Plan 4):** blasts to followers, bought as needed.
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

0. **Decisions and a Stripe account.** Decisions made (below). A separate
   Showlnk Stripe account (not Adsure's), set up in test mode first:
   - a product "Showlnk Core" with two prices, $29 monthly with lookup key
     `core_month` and $290 yearly with lookup key `core_year`;
   - a webhook endpoint at `https://showlnk.com/api/stripe/webhook` for
     `checkout.session.completed` and `customer.subscription.created`,
     `.updated`, `.deleted`;
   - the customer portal switched on (update card, invoices, cancel);
   - in Vercel: `STRIPE_SECRET_KEY` (test `sk_test_…` first) and
     `STRIPE_WEBHOOK_SECRET` (the endpoint's `whsec_…`).

   Live page impact: none.
1. **Plans table and the Plan card (built).** Migration
   `20261023000000_organizer_plans.sql`: `organizer_plans` (no row is Free)
   and `organizer_plan()` for the organizer's admins; Big Love comped. The
   rules in `src/lib/plans.ts` (`hasCore`, `planSummary`: trial days, the
   7-day grace for a declined card, comps with an end date). Settings →
   Plan says the plan in words and, on Free, what Core adds. Nothing is
   gated yet: Follow still follows `FOLLOW_ORGANIZERS` until step 3. Live
   page impact: none.
2. **Start Core and Manage billing (built).** Settings → Plan: monthly or
   yearly (yearly picked first, two months free), Start Core opens Stripe
   Checkout; back from it, the card says what happened and waits for the
   webhook. Manage billing (Update card when a card is declined) opens
   Stripe's portal. `/api/stripe/webhook` takes only events Stripe signed
   and re-reads the subscription from Stripe, so a late event can't undo a
   newer one. Stripe's REST API over fetch, no SDK
   (`src/lib/server/stripe.ts`); a mock Stripe in the tests. Until the two
   keys are set, the card shows Core without a button. Live page impact:
   none.
3. **Gates, the trial and upgrade prompts (built).** `planOf()` reads an
   organizer's plan with the secret key, kept a minute and cleared the
   moment it changes (the webhook, a claim); if it can't be read, the gates
   keep what fans already have.
   - **Follow** is on for organizers who signed up themselves (a trial or
     Stripe plan), and, until step 4, for those `FOLLOW_ORGANIZERS` lists:
     how organizers Showlnk set up (Big Love, comped) get it, so Big
     Love's Follow still waits for that switch.
   - **Presales for followers** need Core: on Free the link shows no
     presale and `/api/fans/presale` gives no links.
   - **Fans-only reels** need Core: on Free they stay locked for everyone,
     followers too (`/api/fans/media` refuses); nothing leaks.
   - **The fan list:** on Free, the Fans page and the export show the first
     100 following (by when they confirmed) and say how many more are
     waiting; following never fails for a fan.
   - **Part of Core** in the editor: on Free, the Fans only switch and the
     presale switch can't be turned on, with "Part of Core. … Start Core"
     (Settings → Plan); one already on can be turned off.
   - The calendar feed stays for everyone: it's what existing followers
     already have (first principle 2).
   - The 14-day trial starts at claim (Plan 5).

   Live page impact: none today (Big Love is comped and keeps its
   `FOLLOW_ORGANIZERS` state); organizers on Free lose presales and
   fans-only reels.
4. **Go live.** Switch to live keys; retire `FOLLOW_ORGANIZERS`; a receipt
   and "card declined" email check. Live page impact: none for Big Love
   (comped).

## Measures

- Organizers on Core, trial to paid, churn per month.
- Days from New client to Start Core.

## Deliberately not in this plan

- Email blasts to followers: Plan 4, the Email add-on.
- Coupons, per-seat pricing, taxes beyond Stripe Tax's defaults.
- A public pricing page (the waitlist landing stays as is).

## Decided

- **Free vs Core:** Follow is free up to 100 fans; Core is $29/month or
  $290/year for unlimited fans, fan-only reels, presale and the calendar
  feed.
- **Trial:** 14 days of Core, no card to start. It begins when an
  organizer claims their link in the sign-up wizard (Plan 5), a reverse
  trial: everything on from day one, then Free unless they pay. (Changed
  Oct 10, 2026 from "when they first reach 100 fans".)
- **Who pays:** each organizer, directly.
- **Stripe:** a separate Showlnk account (not Adsure's), test mode first.

## Open questions

1. **Big Love:** comped indefinitely, or until a date? (Comped with no end
   for now.)
