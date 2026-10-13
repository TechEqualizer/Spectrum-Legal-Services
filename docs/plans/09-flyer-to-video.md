# Plan 9: The best video from a flyer alone

What it takes to turn one flyer into the best possible opening and three
reels. This combines everything we've learned so far: the opening-scene and
flyer-cuts skills, remotion-best-practices, ui-ux-design and impeccable, and
plans 06 to 08. Code readers mapped the engine, Claude's directing, our
skills and docs, and how the video plays. We watched the Masquerade and
Book Signing renders frame by frame. Research below. (Oct 12, 2026)

## Verdict

- **What we have:** a well-built, free, deterministic engine with a real
  signature (the hook, with the flyer inside the letters) and a sound
  trailer grammar: hook, build, reveal, then Tickets.
- **How good it is, honestly:** good on a strong flyer. It still reads as a
  well-made slideshow, not a trailer:
  - the camera stops between every shot;
  - every shot with words plays the same length;
  - it's one flat picture;
  - it's silent.
- **Why:** Claude directs blind. It guesses boxes as fractions (Anthropic's
  docs say that works poorly), nothing checks its work, and almost every
  rule we've learned lives only in the prompt.
- **It's also heavier than it needs to be:** 3 filtered copies of the flyer
  and about 5 full-screen blend layers every frame, never measured on a
  real phone.
- **The best version:** a director that measures the flyer and checks its
  own cut, a leaner engine with real rhythm and a camera that keeps moving,
  then depth (2.5D) and sound.

## Where we stand

What works:
- The mood system (pace, cut style, type, grade and particles as plain data).
- The hook.
- The pull-back reveal.
- Frame-exact review (`scripts/review-opening.mjs`).
- The fallbacks.
- Free per event, the same in the Player and the export.

What doesn't:

| # | Gap | Evidence | Fix | Effort |
| --- | --- | --- | --- | --- |
| 1 | **Claude places boxes blind.** It's asked for fractions of a flyer whose size it isn't told. Anthropic: "Claude does not work well when you ask for normalized coordinates." | `funnel-draft.ts` box(); vision-coordinates docs | Send the flyer at the size Claude sees it, tell it the pixel size, ask for `[x1, y1, x2, y2]` in pixels, convert in code | S |
| 2 | **Rules are prompt-only.** Nothing checks repeated moves or subjects, five words a line, the date last, fake urgency, or facts against the flyer. | `opening.ts` parse checks shape only | A code "lint" of every recipe, then one automatic re-ask with the problems listed | S–M |
| 3 | **Rhythm is one beat.** The reading floor wins for any shot with words, so every reel plays about 1.2s a shot. Mood pace, "build" and Last Call's briskness vanish. Worse, the floor counts the words' entrance and exit, so a line is fully still for only about 0.1 to 0.4s. | `OpeningScene.tsx:93`, `:370` | Real seconds. Words get entrance + readable hold (0.6s + 0.2s a word) + exit, and the shot stretches to fit them | S |
| 4 | **The camera stops at every join.** Each shot eases in and out, which is Ken Burns slideshow motion. | `OpeningScene.tsx:139`, `:145` | One continuous camera path through every shot, easing only at the start and end; cuts land on motion | M |
| 5 | **Framing depends on the screen.** Cover-fit uses the screen's shape, so wide boxes become a center slice (Your People's "wide" shot shows about 23% of its box). Pans travel ±5%. Small boxes are enlarged 5 to 9 times, and about 7.8 times on desktop. | `shots.tsx:19-23`, `:44-61` | Fix the composition at 9:16, enforce phone-shaped boxes, pan across the box, cap the enlargement | M |
| 6 | **Words land on faces.** `at` is a screen position, and the camera centers the subject, so "middle" is the face. | `OpeningScene.tsx:372`, `opening.ts:158` | Claude reports each shot's subject in pixels; code places words in the free space | M |
| 7 | **Hook bug.** A four-word hook on one line shows three words. | `OpeningScene.tsx:247` | Keep every word | S |
| 8 | **Heavy and unmeasured.** Per frame: 3 filtered flyer copies, a blur that changes each frame, about 5 blend layers, grain at 4× the screen area, a WebGL context per player, no quality tiers. | `shots.tsx:94-118`, `:210-226` | Lean rebuild (below), quality tiers, and a frame-rate check on a real mid-range phone | M |
| 9 | **The four cuts are the same film.** One mood, one transition and one ending for all of them. Your People in electric still slams and flashes. | `opening.ts` parseCut, `OpeningScene.tsx:129` | Each reel gets its own treatment: Your People glides, Last Call punches, and each ends differently | S–M |
| 10 | **Facts freeze.** Last Call's date, price and doors time are burned in, so date changes or sold out don't reach them. A mood change in Style doesn't reach the reels. | `funnel-draft.ts:163`, `StyleSheet.tsx:533` | Last Call reads facts from the live dates at play time; a mood change re-moods the cuts | M |
| 11 | **Fallbacks hide things.** Reduced motion and failed cuts show a cropped still with no words. If the player fails, the title and Tickets never appear. | `ReelViewer.tsx:1199`, `CinematicHero.tsx:121` | Show the whole flyer with the cut's words as gentle stills; a time limit releases the title | S |
| 12 | **Silent everywhere.** | no `<Audio>` in src | Sound effects in the downloadable Stories video first; the link stays muted, as Reels autoplay is | M |
| 13 | **No eval set or telemetry.** No set of test flyers, no frame-rate numbers, no media type in reel analytics, and the opening isn't tracked. | `reel-events/route.ts` | 12 to 20 test flyers with a scored rubric, plus media type and opening reach in analytics | M |
| 14 | **PDF flyers get no video.** | `Wizard.tsx:135` | Turn page 1 into an image in the browser | M |

Also found: the Stories export puts bottom words inside Instagram's bottom
bar, and it renders the hook letters solid white. Fonts can draw in a
fallback face for the first second. `@remotion/transitions` is installed
but unused, and `@remotion/effects` (glow, LUTs, zoom blur, shine,
chromatic aberration) is installed but only its light leak is used.

**Contradictions in our own knowledge**, to settle in the skills:
- impeccable bans eyebrow labels, gradient text and stacked effects. The
  opening uses all three.
- Plan 06's "never animate the words" was overturned but never marked as
  superseded.
- Three different reading-time rules are written down (plan 06 has one,
  the code and plan 08 another, the skills a third).

## Recommended design: director-first, lean engine, then depth

Three directions were weighed:
- **A. Craft-first:** 2.5D depth in the browser.
- **B. AI-motion hybrid:** paid image-to-video plates.
- **C. Director-first:** perception, checks, self-review.

The biggest, cheapest wins are in C plus a lean version of A's engine work.
B costs money per event and its weakness on lettering is untested, so it
stays a later decision.

1. **Director (server, one Claude call, still free):**
   - Send the flyer pre-sized to what Claude sees, with its pixel size.
   - Ask first for a short map, in pixels: the subjects (faces and
     figures), the lettering blocks, and the empty areas.
   - Then ask for the shots in pixels.
   - Code turns pixels into fractions, checks every rule (gap 2) and re-asks
     once with the problems.
2. **Engine (browser, leaner and faster):**
   - One continuous camera, real seconds and readable holds.
   - A fixed 9:16 frame, words placed in the shot's free space, a separate
     treatment per reel.
   - Fewer layers:
     - drop the per-frame blur filter (blur only on cuts);
     - bloom from the installed glow effect, or none on low tiers;
     - a small grain tile;
     - sparks without box-shadow;
     - one shared light leak, premounted.
   - Quality tiers from device memory and measured frame drops.
3. **Depth (phase 2):** compute a depth map once per flyer on the
   organizer's side or the server (Depth Anything V2 Small, Apache-2.0, about
   100MB as ONNX: too big to send to fans). Store it next to the flyer as a
   small grayscale image, and play a cheap parallax shader for fans. The
   code has to be read before it's installed.
4. **AI motion plates (phase 3, optional, paid):** about $0.05 to $0.11 a
   second (Veo 3.1 Lite or Fast, Kling 3.0 720p), so about $1.20 to $2.70 an
   event for a 6s opening loop and three 6s reels. Only after testing how
   each model treats lettering, and only behind a paid tier.

## Phase 1 progress (Oct 12, 2026)

Built:

| Gap | What changed | How we checked |
| --- | --- | --- |
| 1 | Claude gets the flyer's pixel size (read from its bytes), maps it first (subjects, lettering), and gives every box and each shot's focus in pixels. Code converts them. | Unit tests; the e2e mock answers in pixels |
| 2 | `lintRecipes` checks the rules in code: repeated moves, shots on lettering, over five words, The Night's hook, Last Call's date last, reused shots, lines too long to show, and facts the flyer and dates don't state. Broken drafts go back to Claude once. | Unit tests; e2e checks the re-ask carries the problems |
| 3 | Shots last long enough for words to hold still: entrance + 0.35s + 0.15s a word + exit | Words now hold across at least two half-second samples |
| 4 | The camera keeps moving through every join; gliding shots truly dissolve | The slowest moment inside a shot moves about 3x more |
| 5 | A pan crosses a wide box end to end; zoom capped at 4x (a 2.4x cap was tried and let lettering in) | Renders |
| 6 | Words move off each shot's focus | Renders |
| 7 | Four-word hooks keep every word | Renders |
| 8 | Lighter frames on every device: the blurred copy only when needed, motion blur and glitter in steps, grain at 1x the area instead of 4x. A lite tier for phones with ≤4 GB memory, ≤2 cores or Data Saver. | Chromium with the CPU slowed 6x and no GPU: old engine 4.8 fps, new full 5.0, new lite 18 |
| 9 | Your People glides, Last Call punches, whatever the mood | Renders |
| 11 | A cut that can't play shows the whole flyer, not a crop; the title and Tickets come up within 15s even if the player never loads (1.5s after a tap) | Typecheck and review only; no test covers these fallbacks yet |

Still open from phase 1:
- **A real-phone frame-rate test.** The full tier's remaining cost is CSS
  filters, which a phone's GPU should carry; the software test can't show
  that.
- **The 12-flyer eval set.** This environment has no Claude key, so the new
  director hasn't run on real flyers yet. The first live drafts need
  watching with `scripts/review-opening.mjs`.

## Phase 2: depth (in progress)

- **Renderer (built):** `src/remotion/depth.tsx`. One WebGL2 pass draws the
  camera's view and shifts each pixel by its depth, so near things move more:
  a pan slides them, a tilt lifts them, a push grows them, around the shot's
  focus, which holds still. It falls back to flat without WebGL2 or a map;
  the lite tier skips it. Checked with a synthetic depth map: depth frames
  differ from flat ones, more as a push goes on.
- **Maps (built, unverified on the real model):** `src/lib/depth-map.ts`
  runs Depth Anything V2 Small (Apache-2.0, about 27 MB quantized) with
  onnxruntime-web 1.30.0. It was audited before install: MIT, no install
  scripts, no new audit findings. The runtime is served from our own site
  (`public/ort/`, copied on install). It runs in the organizer's browser
  in the wizard (from the moment the flyer is chosen) and the studio's import, and the map
  is stored next to the flyer at claim or publish. Anything that fails
  leaves the flyer flat. A stand-in model of the same shape ran the whole
  pipeline in a browser (518x728 output, correct orientation and colors).
  The real model can't be reached from the build environment yet.
  Merged (#98) before that check; still to do: run `scripts/make-depth.mjs`
  on the Masquerade and Book Signing flyers, look at the maps, then watch
  the cuts with `scripts/review-opening.mjs --depth`. The console says
  `[depth] made a WxH depth map in Ns` when it works, and why when it doesn't.
- **Visible (after the first try on production):** testing the wizard on a
  desktop, no difference could be seen. Three reasons, all fixed:
  - The map came too late. It started only once the flyer was read and took
    15 to 45 seconds, by which time the phone's opening had played flat and
    stopped on the hold. Now it starts as soon as the flyer is chosen, and
    the phone starts over once it lands.
  - It was too faint: near things moved 3% of the flyer over a shot (a few
    pixels in the phone). Now 5%, a push grows them 12% (was 8%), and the
    whole flyer and the hold drift slowly instead of standing still.
  - Depth jumped back to still between shots. Now it stays as the last shot
    left it and settles during the pull-back.
  At the stronger setting a hard-edged test map tore the picture at the
  edge of a near thing (a frame line bent, lettering folded over itself).
  Softening the map over about 1.5% of its size (was 3 px) turned that into
  a gentle curve.
- Off in the e2e tests (`NEXT_PUBLIC_DEPTH_MAPS=off`), which would otherwise
  download the model on every run.

## Drafts failed in production after phase 1 (fixed)

Every draft from #97 on failed with a 400 from the API: "The compiled grammar
is too large, which would cause performance issues." Phase 1b put the map, a
focus box per shot and pixel boxes (each an object of four keys, in seven
places) into the one schema that drafted everything, and the API compiles each
structured-output schema into a grammar with an internal size limit beyond the
documented ones (24 optional parameters, 16 unions; both were met). The e2e
mock accepted any schema, so nothing caught it; with no draft, the wizard fell
back to the flyer's basics, with no opening and no cuts, so depth had nothing
to move.

Fixed: the draft is two answers asked at once, the words (`wordsSchema`) and
the direction (`directionSchema`: map, opening, cuts by role), each well under
half the size that failed; every box is a list `[x1, y1, x2, y2]`; if the
direction fails the words still come. The mock now refuses a schema over a
stand-in limit (measured without descriptions; the failing one was 4,176
characters, the limit is 3,000, the two halves 1,185 and 2,142), and the draft
suite checks both answers are asked. Source: platform.claude.com/docs/en/build-with-claude/structured-outputs
("Schema complexity limits").

## The wizard waited on everything (fixed)

With drafts working again, step 2 still showed "Cutting your flyer into a
story…" for a minute or more. From the production logs of one run: the flyer
was read, then drafted (both answers back about 34 seconds after the upload),
then the code's check found nine problems (cuts repeating the opening's
shots, a "5 PM" the flyer doesn't print), and the fix took another 30 to 60
seconds. Nothing showed until all of it was done.

Now nothing waits on anything it doesn't need:
- The draft starts with the reading, not after it (Claude reads the dates off
  the flyer itself; the check still uses what the reading found).
- It streams in stages: the reels' words as soon as they're written (the
  reels play over the still flyer), then the opening and cuts (the phone
  starts over with them), then the fixed cuts in place. A stage whose lines
  state a fact the flyer doesn't is held back for the fix.
- Step 2 shows the story at once, with a one-line status, not a spinner in
  its place; Change the words opens once the words are written, and a later
  stage brings only shots, so the organizer's changes stay.

Truly instant would mean a cut made without Claude. Expected now (estimated
from that one run, not yet measured): the words in about 20 seconds, the shots
in about 30, the fix after that only if the check finds problems.

## Step 1 shows the work (the "all I did was drop my flyer" moment)

The goal: an organizer drops one flyer and says "wow, I got all of this".
Since the draft starts with the reading, most of the work was already
happening during step 1, unseen: the phone there showed only the name, the
flyer and the dates, and the card only what the flyer said.

What works elsewhere:
- The labor illusion: people value the same result more when they see the
  work done for them. In Buell and Norton's travel-search study, showing the
  flights being searched raised the perceived value of the service by 8%
  (Management Science, 2011:
  https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.1110.1376). The work
  here is real, so showing it is honest.
- Gamma builds a whole presentation from a paragraph in 30 to 60 seconds
  (https://gamma.app/explore/content/guides/turn-a-simple-paragraph-into-a-complete-presentation-with-gamma):
  the same "typed one thing, got all this" promise, at about our wait.

So, right after the scan:
- The "From your flyer" card lists what the flyer is becoming, each line
  ticked as it really lands (BuildList): the night and its dates; its colors
  (swatches from the flyer); three reels, by their titles; the opening and
  the cuts, counted; the flyer in 3D (only where a depth map is being made).
  "Building your link…" turns to "Your link is built."
- The phone shows the drafted story from step 1 (the reels once written,
  then the opening and cuts), not only from step 2.
- Continue reads "Watch your night" once the flyer is read.

## The night, never half-made (Oct 13, 2026)

In production on Oct 13, a Masquerade flyer reached step 2 with no opening
and no cuts. The phone showed the plain page, the flyer small over the
title. The logs showed why:
- The first cut came back, but the check in code flagged a line saying
  "11PM", and a draft with a made-up fact was held back for the fix.
- The flyer does say "8PM - 11PM". The reading kept only the start time,
  so the end time looked invented. The other two production runs that day
  were flagged the same way, for "5 PM".
- The fix round (another 20 to 30 seconds) ran while the phone showed the
  basics. On a phone, the phone was also taller than the screen.

What changed:
1. **The reading keeps every time on the flyer.** Doors, the end and last
   entry are read as `otherTimes`, so a cut may say them.
2. **No line with a made-up fact is ever shown.** The line comes off its
   shot (`withoutUnbacked`) and the shot stays. The first cut is shown at
   once, so the fix no longer holds anything up.
3. **The fix keeps the opening.** By the time the fix comes back the
   opening is already playing, so only the cuts change, in place. The fix
   gets 30 seconds (`DRAFT_FIX_WAIT_MS`); after that the first cut stands.
4. **The shots are asked for twice if they fail**, before settling for the
   still flyer.
5. **Never half-made.** Step 2's phone scans the flyer, with a bar that
   moves between real milestones (the reels written, the opening cut, the
   depth). It doesn't stop at the first cut: it also waits for the depth
   map, for up to 5 seconds more. Then the night plays from the start.
   "Claim this link" waits too ("Building your night…"). A slow wait that
   shows the work beats a fast half-result (Buell & Norton, above).
6. **The phone fits above the fold** on a phone: its width follows the
   screen's height, so the whole phone sits above the Claim bar.

## Roadmap

**Phase 1: the lean rebuild (1 to 2 weeks, free).** Gaps 1, 2, 3, 4, 5, 7,
8, 9 and 11.
- Build: pixel directing with a flyer map, recipe lint with one re-ask,
  continuous camera, real rhythm, fixed 9:16 framing with words in free
  space, per-reel treatments, fewer layers with quality tiers, the hook
  fix, and honest fallbacks.
- Better means:
  - a 12-flyer eval set (club, gala, jazz, book signing, day party,
    text-heavy, landscape, low-res) scored by a rubric: first-second hook,
    readable lines, nothing over faces or lettering, four distinct cuts,
    facts true;
  - every flyer passes the lint;
  - a mid-range Android phone holds at least 55 fps.

**Phase 2: depth, sound and control (2 to 3 weeks).** Gaps 6 (with
detection), 10, 12, 13 and 14.
- Build: depth parallax, sound effects in the Stories video, live facts on
  Last Call, mood carried to the reels, editing a cut's words and "Make
  another cut", analytics by media type and opening reach, PDF flyers.
- Better means: completion rate of cut reels against still flyers on live
  links, and the share of organizers who download a Stories video.

**Phase 3: decide on paid motion.** Test image-to-video on the eval set
(lettering, faces), price it per event, and A/B test on paying organizers.

## How the skills fit together

- **Who decides what:**
  - `opening-scene` and `flyer-cuts` own direction (what to show, in what
    order, with what words);
  - `remotion-best-practices` owns the engine (frames, effects,
    transitions, fonts);
  - `ui-ux-design` and `impeccable` own type craft and the organizer
    controls;
  - the eval set and rubric decide what "better" means.
- **New:** a `flyer-video-eval` skill with the test flyers, rubric and
  review script.
- **To fix in the existing skills:**
  - settle the eyebrow, gradient-sheen and effect-stacking contradictions
    (video is an exception, stated once);
  - mark plan 06's first principles superseded;
  - one reading-time rule.

## Decisions for the owner

- **Paid AI video per event?** Not yet. Phase 3, after the free version is
  excellent and measured.
- **Sound?** Yes, in downloads only: licensed sound effects. Music needs
  licensing we don't have; Instagram adds its own.
- **A depth model?** Yes, computed once per flyer on the organizer's side,
  never sent to fans, after reading its code.
- **Trade some effects for speed on low-end phones?** Yes: quality tiers.

## Sources

[Coordinates and bounding boxes (Claude docs)](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates),
[Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2),
[Real-time depth estimation in the browser (Transformers.js demo)](https://huggingface.co/spaces/Xenova/webgpu-realtime-depth-estimation/blob/main/index.html),
[Parallax offset mapping with WebGL (Sascha Willems)](https://www.saschawillems.de/blog/2015/05/06/parallax-offset-mapping-with-webgl/),
[DepthFlow](https://pypi.org/project/depthflow/0.7.1),
[Video model pricing 2026 (ModelsLab)](https://modelslab.com/blog/api/veo-3-1-vs-kling-3-sora-2-ai-video-api-cost-2026),
[AI video API pricing 2026 (DevTK)](https://devtk.ai/en/blog/ai-video-generation-pricing-2026/),
[Best image-to-video APIs 2026 (fal)](https://fal.ai/learn/tools/best-image-to-video-apis-2026),
[Timed Text Style Guide (Netflix)](https://backlothelp.netflix.com/hc/en-us/articles/215758617),
[TopView specs (TikTok)](https://ads.tiktok.com/help/article/tiktok-reservation-topview).
Plans 06 to 08 have the trailer-editing, hook and Ken Burns sources. Video
prices are from aggregators and change monthly: confirm before budgeting.
