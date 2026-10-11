# Plan 8: Flyer cuts: every reel from the flyer alone

An organizer who gives us only a flyer should still get a link that sells:
an opening and three reels that feel like trailers, not a photo with a timer
on it. Before this, the opening was cut from the flyer (plan 6), but the
three core reels showed the still flyer, cropped, for eight seconds, under
"Needs video".

Now Claude directs each reel from the flyer while it drafts the funnel, and
the reel plays that cut until the organizer adds a video. It runs on the
opening's engine and mood, at no extra cost per event (one more part of the
same Claude call, drawn in the browser), and it is never fake footage: only
the flyer's own artwork, moved by a camera, with words that sell it.

## What works elsewhere (researched Oct 2026)

| Source | What it says | What we take |
| --- | --- | --- |
| Short-form hook guides (Opus Clip, Teleprompter, True Future Media) | Viewers decide in the first 1.5 to 3 seconds; most watch with the sound off; on-screen text carries the hook, short (5 to 10 words), large and high contrast; each text card about 1 to 2 seconds. Instagram now reports a 3-second skip rate. | The Night opens on its hook line alone, huge, inside the first second. Every line is five words at most, and on screen at least about a second. |
| Meta and TikTok creative guidance (via Seer, Tiger Pistol; TikTok's TopView specs) | Front-load the key visual; design for sound off; full-screen 9:16. Keep words off the platform's own buttons, and never open on a logo or a plain white frame. | A cut's words stay at the top or middle: the bottom belongs to the reel's own title and Tickets button, like the app's safe zone. No cut opens on a logo, credit or date. |
| Netflix Timed Text Style Guide | A subtitle stays at least 5/6 of a second; reading speed is capped per language (about 13 to 17 characters a second for adults). | The scene's rule, a glance plus a moment per word (0.8s + 0.12s a word), already meets this. |
| Ken Burns practice (Soundslides via Mulinblog, ShortGenius, Boinx forum) | Pick where the move ends first; vary the move from photo to photo; slow and smooth reads as polish, fast reads cheap; tie direction to the subject; start wider than feels needed. | Each reel moves differently: The Night pushes in, Your People pans and pulls back, Last Call punches in briskly. Never the same move twice in a row. |
| Event promo templates (Envato, Adobe Stock, a concert-promo brief on Freelancer) | Bold type reveals timed to a beat; a storyboard of the event's name, who it's for, the performers, the when and where, then the call to action; editable date, venue and ticket link. | The three reels follow that storyboard as three cuts: the promise (The Night), who it's for (Your People), the facts and the call to action (Last Call). |
| Flyer-to-video tools (Vidio, plan 6's Canva and Adobe research) | Promoters already turn flyers into animated posts by hand or with a tool. | We do it for them, three ways, as part of the draft. |

Sources: [Ideal Reels length (Opus Clip)](https://www.opus.pro/blog/ideal-instagram-reels-length),
[Hooks for Instagram Reels (Teleprompter)](https://www.teleprompter.com/blog/hooks-for-instagram-reels),
[The two-step test for Reels hooks (True Future Media)](https://www.truefuturemedia.com/articles/instagram-reels-hooks-two-step-test),
[Facebook and Instagram ad types (Seer Interactive)](https://www.seerinteractive.com/insights/the-ultimate-guide-to-facebook-instagram-ad-types),
[Effective vertical video ads (Tiger Pistol)](https://tigerpistol.com/create-effective-vertical-video-ads/),
[TopView specifications (TikTok Ads)](https://ads.tiktok.com/help/article/tiktok-reservation-topview),
[Timed Text Style Guide: General Requirements (Netflix)](https://backlothelp.netflix.com/hc/en-us/articles/215758617),
[Pacing and photo movement (Mulinblog)](https://www.mulinblog.com/sound-photo-slideshow-editing-tips-on-pacing-and-photo-movement),
[What is the Ken Burns effect (ShortGenius)](https://shortgenius.com/blog/what-is-the-ken-burns-effect),
[Ken Burns effect (Boinx forum)](https://forum.boinx.com/t/ken-burns-effect/8828),
[Animated concert promo brief (Freelancer)](https://www.freelancer.in/projects/2d-animation/animated-concert-promo-flyer),
[Stylish typography promo (Envato)](https://elements.envato.com/stylish-typography-promo-mogrt-UEHPT2U),
[Video flyer maker (Vidio)](https://www.vidio.ai/en-GB/tools/auto-video-flyer-maker).
Most of these are vendor and agency guides, not platform policy; the
numbers are rules of thumb. Plan 6 has the trailer-editing sources the
opening was built on.

## How it works

- **One call, four cuts.** `draftFunnel` asks for each reel's `cut` with the
  opening (`CUT_SCHEMA`, `cutBrief` in `src/lib/server/funnel-draft.ts`).
  Claude sees all four together, so it can keep them apart.
- **Three treatments.** The Night: closer than the opening, its hook line
  first, pushing in. Your People: wider and unhurried, pans and pull-backs,
  no hook. Last Call: brisk, one true fact a shot, the date last.
- **Words.** A cut's lines may be Claude's own words in the reel's voice
  ("You, in gold."), unlike the opening's, which are copied from the flyer.
  Every fact in them (names, dates, places, prices, dress code, age, how
  many are left) must be on the flyer or in the known dates. No quotes,
  reviews, numbers, "selling fast" or "sold out" unless true and given.
- **The recipe.** A cut is an `OpeningRecipe` on the reel's photo:
  `{ kind: "image", src: flyer, cut }`. `parseCut` (`src/lib/opening.ts`)
  cleans it like an opening, takes the opening's mood, moves bottom words to
  the middle and sets the hold to the whole flyer. Publishing checks it
  (`checkMedia`: "bad flyer cut").
- **The scene.** `OpeningScene` with `reel`: no hold under a title. It ends
  on the whole flyer, crisp, for 2.2 seconds under the reel's title and
  Tickets, then the reel moves on. About 6 to 9 seconds in all.
- **The player.** `FlyerCut` (`src/components/FlyerCut.tsx`), loaded only for
  reels with a cut, reports progress like a video and ends the reel. Less
  motion, or a flyer that won't load, gets the still flyer.
- **Where it shows.** The wizard's phone (step 2, "One flyer in. An opening
  and three reels out"), the claimed link, the studio's Draft from flyer for
  existing events, Home's checklist ("Flyer cut", counted done), and the
  reel list and media picker ("Flyer cut").
- **Real video wins.** Adding a video or photo to a reel replaces its
  media, cut and all.

## Later

- Edit a cut's words in the studio, and "Make another cut".
- Cuts for existing reels without a fresh draft (one Claude call per reel).
- Download a reel's cut for Stories, like the opening (plan 7).
