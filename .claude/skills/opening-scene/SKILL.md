---
name: opening-scene
description: Direct and review a link's opening scene, the short trailer cut from an event's flyer (src/remotion/OpeningScene.tsx). Use when writing or changing an opening recipe, a mood, the shots, the words or the hold, when changing how Claude writes openings (src/lib/server/funnel-draft.ts), and when someone says an opening looks wrong, slow, busy or off for their event.
---

# The opening scene

The first seconds of a link, cut like a teaser from the event's own flyer.
It's free for every event: no video model is involved. The browser draws it
from a **recipe** (`src/lib/opening.ts`) that Claude writes when it reads the
flyer. It plays like this (`src/remotion/OpeningScene.tsx`):

1. **The hook.** The first shot's line (two to four words), huge on black,
   one word a row, with the flyer drifting inside the letters and a sheen
   crossing them. The cutting
   moods then fly through the words into the first shot; in the dissolving
   moods, the black falls away around the words instead.
2. **One camera.** It moves across the flyer from shot to shot, resting on
   each with a move (push, pull, tilt, pan). It travels between shots in the
   dissolving moods, and cuts with a punch-in and flash in the others. Each
   shot's line is set over it, in the mood's type style.
3. **The reveal.** The camera pulls back from the last shot to the whole
   flyer, with a light sweeping across the print. Every detail turns out to
   be this poster.
4. **The hold.** The poster fades into a calm, softened loop, and the link's
   title and button come up over it, about six seconds in.

For Remotion itself (frames, sequences, transitions), also follow
`remotion-best-practices`.

## Read the event first

Every flyer says what kind of night it is: what happens there, the venue,
the time of day, who it speaks to, its type and palette. Pick the **mood**
from that, before anything else. The mood decides the cut; the shots and
words follow from it.

| Mood | For | Pace | Cut | Type | In the air | Words |
| --- | --- | --- | --- | --- | --- | --- |
| electric | club nights, parties, hip-hop and R&B, concerts | 0.8× | punch-in, accent flash | slammed a word at a time | embers | one or two loud words a line |
| glamour | galas, fashion shows, masquerades, awards | 0.95× | punch-in, white flash, light leak | tracks in from wide | glitter | confident, a promise |
| soulful | jazz, live music, comedy, lounges, gospel | 1.05× | camera glides, light leak | surfaces softly | haze | warm, an invitation |
| editorial | book signings, talks, galleries, panels | 1.1× | camera glides, no leak | rises from a mask, left-aligned | dust | calm, let the flyer speak |
| sunlit | day parties, brunches, festivals, cookouts | 0.9× | punch-in, white flash, light leak | rises from a mask | sun motes | bright and easy |

Each mood also sets the light and the camera: a color grade (glamour warm and
gold, editorial cool and crisp, soulful warm and soft, electric hard and
saturated, sunlit bright), a bloom (the glow film gives highlights), and how
steady the camera is (electric and sunlit hand-held; the rest a gentle
float).

The moods live in `OPENING_MOODS`. When a new kind of event doesn't fit any
of them, add a mood there (its direction is plain data) rather than bending
one. A book signing is never electric, and a club night is never editorial.

## Cut it like a teaser

What trailer editors and short-form video agree on (sources in
`docs/plans/06-opening-scene.md`):

- **Hook first.** Viewers decide within a second or two, so the first shot
  is the flyer's most striking image (a face or figure when it has one) with
  its most enticing line. No preamble: never open on a logo, the presenter
  credit or the date. A credit, if used, is an eyebrow on the second shot.
- **One hook, one idea per card.** Each shot carries one line of at most
  five words, made to read with the sound off.
- **Tease, build, reveal, then the call to action.** The shots get closer or
  more intense. The cuts quicken into the reveal (each shot is a little
  shorter than the one before, by the mood's `build`). The whole flyer is
  the reveal, and the title and button over the hold are the call to action.
  The lines move from the promise of the night toward when and where, so the
  date or place comes last.
- **Withhold.** Show a face, a mask, a skyline, not the whole picture; the
  flyer only shows in full at the reveal.
- **Every move guides the eye.** End each move framed on its subject. Push
  in on a face, tilt up a standing figure, and pan across a crowd or skyline
  in the direction it faces. Don't use the same move twice in a row, and
  don't shoot the same subject twice unless the second shot is closer.
- **Readable, then gone.** A line is on screen for a glance plus a moment
  per word (the scene stretches a shot to make room). It clears before the
  next line comes up.

## Directing rules

1. **Shots are things a fan recognizes**: a face, a figure, the venue, a
   prop. Never a crop of texture or background alone (lace, a wall, sky).
2. **Never over the flyer's lettering.** Each shot's box sits on the artwork.
   The flyer's own type only appears in the whole-flyer beat, crisp.
3. **Sharp, not enlarged.** A shot is at least 28% of the flyer's width and
   18% of its height, and the hold at least 35% of its width. The code widens
   smaller boxes, so give it boxes that are already big enough.
4. **The flyer's words only**, copied from it. Never invent names, dates or
   claims.
5. **Words where the shot is dark and empty**, never over a face. Top,
   middle or bottom.
6. **Moves follow the subject** (see "Every move guides the eye" above).
7. **The hold is calm.** It's a shot with room at the bottom for the title
   and button, and it is softened under them, so it never fights them.

## Review it: watch, then critique

Never judge an opening from its recipe. Watch it the way a fan would. This
borrows the frame-at-every-cut idea from claude-video's scene mode, using the
ffmpeg we already have; nothing gets installed.

1. Start the app: `npm run dev`.
2. Save the recipe to a file, then run:

   ```sh
   node scripts/review-opening.mjs --flyer /clients/<slug>/flyer.jpg \
     --recipe recipe.json --font <look font> --accent "<sky accent>" \
     --title "<link title>" --tagline "<tagline>" --out <dir>
   ```

   It plays the recipe on `/dev/opening` (a development-only page that 404s
   in production) on a 390×844 phone. It steps the scene one frame at a time
   at 2× resolution, so the video is smooth and sharp even on a slow machine
   (a recording of it playing live drops most of its frames). It writes:
   - `opening.mp4`, 30 frames a second;
   - a frame every half second plus every hard cut;
   - `held.png`, the hold under the title;
   - `sheet.png`, all the frames side by side.

   A full render takes a few minutes. Add `--step 6` for a quick draft (every
   sixth frame), and `--live` to record the real player playing instead.
   Times are printed from the opening's start.
3. Look at `sheet.png` and `held.png` (Read them), and check:
   - [ ] Does the first image and line land inside the first second? Is it
     the strongest the flyer has, not a credit or the date?
   - [ ] Does it build: closer or more intense shot to shot, quickening into
     the whole flyer, with the date or place last?
   - [ ] Does it feel like this kind of event? (Pace, cuts and particles fit
     the mood.)
   - [ ] Is every line readable, the eyebrow included, with nothing over a
     face, and none of the flyer's own lettering creeping into a shot?
   - [ ] Does one beat's words clear before the next beat's words come up?
   - [ ] Is every shot a recognizable subject, sharp, and no repeat of an
     earlier one unless it's closer?
   - [ ] Is each line on screen long enough to read (about a second or
     more)?
   - [ ] Do the hook's letters read on black? Does the flyer show through
     them?
   - [ ] Does the pull-back land on the whole flyer, crisp, before the hold?
   - [ ] Do the title, tagline and button read clearly over the hold?
4. Fix the recipe (or the scene, for a problem every recipe would have), and
   watch again. Stop when the checklist passes. Two rounds is usually enough.

When a fix belongs in how Claude writes openings for everyone, change the
instructions in `src/lib/server/funnel-draft.ts` (or a mood in
`OPENING_MOODS`), not just the one recipe.

## Where openings come from

- **Sign-up:** Claude cuts the opening while it drafts the funnel from the
  flyer (`draftFunnel`).
- **Existing events:** the Design tab's Opening section (`OpeningCard` in
  `src/admin/components/StyleSheet.tsx`). Make my opening calls
  `/api/admin/opening` (`draftOpening`). Feels like changes the mood with
  no new call, Make another asks for a different cut in that mood, and Turn
  off goes back to the still flyer.

Both use the same brief and schema (`openingBrief` and `OPENING_SCHEMA`), so a
rule changed there applies to both.

## Storing one by hand

An opening sits on the flyer backdrop:
`{ kind: "image", src, fit: "poster", opening }`. Clean it with
`parseOpening`: a stored recipe must equal its cleaned form exactly
(`checkOpening`), or publishing refuses it. Production data changes need the
owner's go-ahead first.
