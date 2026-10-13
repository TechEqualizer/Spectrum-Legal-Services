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
   - a webhook endpoint at `https://www.showlnk.com/api/stripe/webhook`
     (the `www` address: `showlnk.com` redirects there, and Stripe doesn't
     follow redirects) for
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
   - **Follow** was on for organizers who signed up themselves (a trial or
     Stripe plan), and for those `FOLLOW_ORGANIZERS` listed, until step 4
     made it on for everyone but `FOLLOW_HOLD`.
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
4. **Go live.**
   - **Follow for everyone (built).** `FOLLOW_ORGANIZERS` is retired: every
     organizer's links have Follow (Free includes it, up to 100 fans) once
     the deployment has every fan setting, except those `FOLLOW_HOLD` lists.
     `FOLLOW_HOLD=biglove` is set in Vercel (production and preview, Oct 10,
     2026): Big Love's Follow waits until after its Oct 31 night and the
     owner's go-ahead (then remove it from the list).
   - **Waiting on the owner:**
     - `RESEND_API_KEY` in Vercel. Without it Follow is off everywhere in
       production: it sends the confirm emails.
     - The Showlnk Stripe account (step 0), test keys first:
       `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel; a full
       test-mode run (Start Core, the webhook, the portal, a declined card);
       then the live keys and the live webhook's secret.
     - Stripe → Settings → Customer emails: successful payments (receipts)
       and failed payments on; check one of each arrives in test mode.

   Live page impact: none for Big Love (held); other organizers' links
   get Follow once `RESEND_API_KEY` is set.

## Upgrade nudges (Oct 10, 2026)

Settings → Plan alone is too easy to miss. Core is sold where the
organizer always looks: the sidebar.

**What works elsewhere:**
- GitLab tested a trial widget in the sidebar showing the days left and an
  upgrade button, with more emphasis when 14 to 7 days and then 3 or fewer
  days remain. It reported more trial conversions with it (its own
  experiment; the shared figure is a click-through rate).
- Reverse trials (Calendly's 14 days of its premium plan with no card,
  Toggl's 30-day all-access pass) give everything first and then fall back
  to Free; the nudges remind people what they'd lose.
- Common advice is a calm, informative message a week out and a more
  direct one in the last 1 to 3 days, and as little friction to upgrade as
  possible.

**What we do:**
- **Sidebar card**, on a trial without a card: "Core trial · N days left",
  a bar of the trial used, "Your trial ends <date>. Keep Core to keep
  every fan." and Keep Core. In the last 3 days it turns gold and says what
  stops (Follow past 100 fans, presales, fans-only reels). On Free: "Get
  Core". With a declined card: "Update card". Nothing once they pay or are
  comped. Folded sidebar: a gold badge with the days. Phones: a chip beside
  the account.
- **Charged at checkout** (decided Oct 11, 2026): paying for Core, during
  the trial or after it, takes the first payment at once; the trial's
  remaining days don't carry into Stripe. The Plan card says "Charged
  today, then every month/year", and afterwards reads "Core · Renews
  <date>". (Before this, Keep Core during the trial set Stripe's
  `trial_end`, and the first charge waited for the trial's end; anyone who
  paid that way keeps that schedule.)

Sources: [GitLab: trial days remaining in the sidebar](https://gitlab.com/gitlab-org/gitlab/-/issues/334936),
[Trial-ending reminders (Knock)](https://knock.app/template-library/workflows/trial-ending),
[SaaS free trial best practices (UserMotion)](https://usermotion.com/blog/saas-free-trial-best-practices),
[Reverse trials (Candu)](https://www.candu.ai/blog/reverse-reverse-the-definitive-guide-to-reverse-trials),
[Reverse trials (Userpilot)](https://userpilot.com/blog/?p=13042).
Figures in these are vendors' own and unverified.

## Pay to go live (decided Oct 11, 2026)

This replaces the Free plan and the 14-day trial below. Organizers build
everything free (the wizard, the opening scene, reels, dates, the Stories
video) and pay when they want the link public.

**What works elsewhere:**
- **Squarespace:** you build on a free trial, but the site isn't public
  until you subscribe. Visitors meet a password or trial notice, and a
  domain you connect won't resolve until you pay.
- **Webflow:** every site starts free on a staging address. Publishing to
  your own domain needs a paid site plan.
- **Linktree and Carrd** publish free and charge for extras. That works
  for a list of links, but Showlnk's link is the finished product (the
  opening, the reels, the tickets), so going public is the moment of value.
- Paywall advice agrees: ask after people have seen the value (here, their
  built link playing in the phone), never before it, and always with a
  clear way back.

Sources: [Squarespace free trial (Style Factory)](https://www.stylefactoryproductions.com/squarespace-free-trial),
[Can I share a trial Squarespace site (Website Builder Insider)](https://www.websitebuilderinsider.com/can-i-share-a-trial-squarespace-site/),
[Webflow plans and pricing (Webflow help)](https://help.webflow.com/lesson/webflow-plans-and-pricing),
[Workspace and Site plans (Webflow help)](https://help.webflow.com/hc/en-us/articles/33961379128723),
[Paywall and upgrade design (Corey Haines' marketing skills)](https://skillselion.com/skills/coreyhaines31/marketingskills/paywalls).
The Squarespace pages are third-party write-ups and disagree on details;
check Squarespace's own help before quoting.

**The model:**
- **Build: free.** Sign up, claim the link, make the opening and reels,
  preview the link signed in. Nobody else sees it.
- **Live: $29/month or $290/year** (Stripe's `core_month` and `core_year`
  prices). The public link: the opening scene, reels, dates, Results,
  Leads, Share, Eventbrite and the Stories video. No Follow.
- **Fans add-on: $15/month or $150/year** (new prices, `fans_month` and
  `fans_year`) on top of Live: Follow (unlimited), presales for followers,
  fans-only reels and the calendar feed.
- **Not live** (never paid, canceled, or a declined card past the 7-day
  grace): the link shows a "Coming soon" page with the organizer's name,
  not an error, and isn't indexed. Their admins still see the real link
  when signed in, with a bar saying only they can see it. Nothing is
  deleted: paying again puts it straight back.
- **Comped** organizers (Big Love) have Live and Fans.

This reverses first principle 2 ("we never take the link down"). It's the
owner's call: live means paid. It also changes the reverse trial in
Decided: claiming no longer starts a trial. Book Signing's trial was a
test.

**Steps:**
1. The tour starts by itself after the wizard, so new organizers aren't
   lost before they meet the paywall (done, PR #88).
2. Go live (this change). The plan keeps its name, Core; the action is
   "Go live".
   - Claiming starts no trial (migration `20261026000000_pay_to_go_live`).
   - `publicLink()` serves Coming soon for links that aren't live: the
     page, reel pages and their link previews (a Coming soon card). The
     calendars answer 404.
   - The organizer's admins see the real link at `/admin/link/<slug>`,
     with a "Only you can see this · Go live" bar. Coming soon links
     there.
   - Go live appears on the welcome card, the sidebar card and Settings →
     Plan (Stripe Checkout for `core_*`).
   - The webhook refreshes the link and its preview cards at once.
   - Fans stay inside Core until step 3, so no paying organizer loses
     anything in between.
3. The fans add-on (this change), a second item on the same Stripe
   subscription (prices `fans_month` $15 and `fans_year` $150), at Core's
   cadence.
   - **Where it's bought:** a checkbox when they go live, or later Add Fans
     on Settings → Plan, charged now for the rest of the period. Remove
     (it asks first) takes it off now and credits the unused time to the
     next bill.
   - **Recording it:** the webhook writes `organizer_plans.fans` from the
     subscription's items (migration `20261028000000_fans_addon`).
   - **What it gates:** `hasFans()` covers starting a follow, Follow on the
     link, presales, fans-only reels and the fan calendar. Comped
     organizers and trials from before have it.
   - **The fan list:** always shown in full, on any plan. The 100-fan cap
     of the old Free plan is gone.

## Fans add-on nudges (Oct 11, 2026)

Before this, the add-on could only be found on Settings → Plan, and not
even there in two cases. Comped organizers (Big Love) saw nothing, because
the add-on part was hidden. Trials from before "Pay to go live" got Keep
Core with no way to keep Fans. Once an organizer went live, the sidebar
card went quiet.

**What works elsewhere:**
- **Canva** marks Pro items with a crown wherever they appear. Picking one
  on the free plan brings up the upgrade, at the moment it's wanted.
- **Linktree** marks premium features in its admin and prompts to upgrade
  when one is opened (a third-party review; Linktree's help doesn't
  describe the prompts).
- **Laylo** sells its fan list and drops on a paid Pro plan ($25/month
  plus messaging, per its Shopify listing). The fan list is the upsell, as
  it is here.
- Upgrade-prompt advice agrees on three things:
  - ask after value is shown (here, the link's reel views);
  - say what they gain rather than "locked";
  - let people put it off, and don't show a dismissed prompt again soon.
  Over-prompting has cost products support load and NPS.

**What we do:**
- **The sidebar card**, once live on Core without the add-on: "Fans add-on
  · Let fans follow you", what it adds and its price at their cadence,
  with **Add Fans** and **Not now**. What must be done (Go live, a
  declined card, a trial's last days) still comes first. On phones the
  chip stays for those only; offers are on Home.
- **Home:** a card above the numbers.
  - The heading uses the link's reel views over 30 days: "1,240 reel views
    in 30 days. Let them follow you." With no views yet: "Let the people
    watching follow you."
  - **Add Fans · $15/month** and **Not now**.
- **Not now** hides both for 14 days, for that organizer, in that browser.
  Settings → Plan always shows the add-on.
- **Settings → Plan:**
  - **Live without the add-on:** it stands out (a gold border), with "Your
    link is live. Let the people watching follow you…".
  - **Back from going live without it:** "You're live. Next: let the
    people watching follow you".
  - **Going live:** the add-on box sits beside Go live, with what it does.
  - **Trials from before:** "Keep the Fans add-on" beside Keep Core, saying
    the fan features stop without it.
  - **Comped:** "Fans add-on · Included".
- **Where Add Fans leads:** every Add Fans link goes to `#fans`, meaning
  the nudges and the notes beside presales, Fans only and the Fans page.
  Settings → Plan brings that part into view and outlines it for a moment.
- **Not built:** email nudges (Plan 4), and prompts that start from what
  fans do, like taps on a Follow that isn't there, which we don't record.

Sources: [Gated feature upsell templates (Chameleon)](https://www.chameleon.io/templates/upsell-modal),
[Designing in-app upgrade prompts (Genesys Growth)](https://genesysgrowth.com/blog/designing-in-app-upgrade-prompts),
[In-app upsell guide (Kompassify)](https://kompassify.com/blog/in-app-upsell-guide),
[Upsell screen examples (ScreensDesign)](https://screensdesign.com/articles/mobile-app-upsell-screen-examples/),
[Linktree in-app screens (ScreensDesign)](https://screensdesign.com/showcase/linktree-link-in-bio-creator),
[Laylo on the Shopify App Store](https://apps.shopify.com/laylo),
[Free vs Pro Canva templates (Brenda Cadman)](https://brendacadman.com/free-vs-pro-canva-templates-whats-the-difference/).
These are vendors' and third parties' accounts. Their figures are
unverified.

## The tour sells, then asks (Oct 13, 2026)

Going live was easy to miss. The tour that started after the sign-up wizard
was 14 steps of where buttons are. It never mentioned going live or the
price, and it ended on Settings with "You're all set". The welcome card, the
one screen with Go live and its price, was gone by then, because the tour
had moved to other pages. Every Go live was a link to the fourth section of
Settings. The Fans add-on was an unticked box there. Before paying, the
tour told organizers to put a link in their bio that showed Coming soon.

### What works elsewhere

- **Squarespace** builds for free and charges to publish: the site stays
  private until you pay, with Upgrade in the editor
  ([Style Factory](https://stylefactoryproductions.com/squarespace-free-trial)).
  This is our model, and the ask belongs right where the work is.
- **Tours:** completion falls below 50% after five steps, and three-step
  tours finish about 66% of the time
  ([Chameleon](https://www.chameleon.io/blog/product-tours-still-work)).
- **When to ask:** in RevenueCat's 2026 data (mostly mobile apps), about a
  third of purchases happen on day 0 and over 60% within a week
  ([RevenueCat](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026.md)).
  The first session, while what they made is fresh, is the moment.
- **Linktree** pitches Pro during onboarding, before anything is made, and
  teardowns name that as its weak spot
  ([Supademo](https://supademo.com/user-flow-examples/linktree)).
- **Blinkist** spelled out what happens when on its paywall (full access
  today, a reminder, then the charge). The fear of being charged without
  noticing is what stops people, and the change is reported to have lifted
  conversion by 23%
  ([Growth.Design](https://growth.design/case-studies/trial-paywall-challenge),
  secondhand).
- **Add-ons at checkout:** order bumps are said to be taken 20 to 40% of the
  time ([dsebastien.net](https://concepts.dsebastien.net/concept/order-bump/),
  unsourced). In the EU a charge from a box ticked in advance can be
  claimed back, so the add-on is never chosen for them
  ([Consumer Rights Directive, Art. 22](https://www.legislation.gov.uk/eudr/2011/83/article/22/data.htm)).

### What we built

1. **The welcome tour** starts by itself after the wizard (`WELCOME_STEPS`
   in `src/admin/tour.ts`). It has five stops on their own night, each
   about what it does for them:
   - their flyer, now a trailer (the reels);
   - one link for every night (the bio link);
   - which post sold tickets (a link for each place they post);
   - who's coming (Results);
   - their own list (Fans, tagged Add-on).

   Its last button is Go live. It goes back to their welcome and opens Go
   live there. Already live or comped: Done. The 14-step how-to stays, as
   "Take the tour" in the account menu.
2. **One Go live sheet** (`GoLiveSheet.tsx`) opens from every Go live: the
   end of the tour, the sidebar card, the phone chip, the welcome card, the
   Publish sheet, the Share page and the private preview's bar
   (`?golive=<organizer>`). It shows:
   - their opening, playing in a phone;
   - "Right now anyone who opens your link sees Coming soon", and a count
     down to their next date;
   - two plans side by side, Core and Core + Fans ("For nights you run
     again"). Core is chosen; the add-on is a plan they pick, never
     ticked for them;
   - yearly first ("2 months free", with the monthly price beside it);
   - one button straight to Stripe ("Go live · $290 today"), what's charged
     and when, a full refund in the first 7 days on request, and "Keep
     building privately".
3. **Honest before paying:** the Share page says the link is private, with
   Go live, before they post it. After publishing, the Publish sheet opens
   their private preview (not Coming soon) and offers Go live.
4. **Terms:** the Fans add-on is named in its own right, and the 7-day
   refund is promised there too. Refunds are done by hand in Stripe.

Next: a "You're live" moment after paying, with a one-tap Fans add-on for
those who chose Core only (the card is on file). Then the claim cut to
email and terms with a sign-in link, and an email for organizers who claim
but don't go live.

## Measures

- Organizers on Core, trial to paid, churn per month.
- Days from New client to Start Core.
- Welcome tours finished, Go live sheets opened (and from where), the share
  who pick Core + Fans, and refunds asked for.

## Deliberately not in this plan

- Email blasts to followers: Plan 4, the Email add-on.
- Coupons, per-seat pricing, taxes beyond Stripe Tax's defaults.
- A public pricing page (the waitlist landing stays as is).

## Decided

- **Free vs Core:** Follow is free up to 100 fans; Core is $29/month or
  $290/year for unlimited fans, fan-only reels, presale and the calendar
  feed.
- **Superseded Oct 11, 2026** by "Pay to go live" above: no Free plan and
  no trial; Live is $29/month or $290/year, and the fans add-on is
  $15/month or $150/year. Before that:
- **Trial:** 14 days of Core, no card to start. It begins when an
  organizer claims their link in the sign-up wizard (Plan 5), a reverse
  trial: everything on from day one, then Free unless they pay. (Changed
  Oct 10, 2026 from "when they first reach 100 fans".)
- **Who pays:** each organizer, directly.
- **Stripe:** a separate Showlnk account (not Adsure's), test mode first.

## Open questions

1. **Big Love:** comped indefinitely, or until a date? (Comped with no end
   for now.)
