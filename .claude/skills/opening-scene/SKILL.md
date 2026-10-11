---
name: opening-scene
description: Direct and review a link's opening scene, the short trailer cut from an event's flyer (src/remotion/OpeningScene.tsx). Use when writing or changing an opening recipe, a mood, the shots, the words or the hold, when changing how Claude writes openings (src/lib/server/funnel-draft.ts), and when someone says an opening looks wrong, slow, busy or off for their event.
---

# The opening scene

The first seconds of a link: a cut through the event's own flyer, with the
flyer's own lines set over the shots, then the whole flyer, then a calm hold
under the link's title. It's free for every event: no video model is involved.
The browser draws it from a **recipe** (`src/lib/opening.ts`).

For Remotion itself (frames, sequences, transitions), also follow
`remotion-best-practices`.

## Read the event first

Every flyer says what kind of night it is: what happens there, the venue,
the time of day, who it speaks to, its type and palette. Pick the **mood**
from that, before anything else. The mood decides the cut; the shots and
words follow from it.

| Mood | For | Cut | In the air | Words |
| --- | --- | --- | --- | --- |
| electric | club nights, parties, hip-hop and R&B, concerts | fast (0.75×), punch-ins with an accent flash | embers | one or two loud words a line |
| glamour | galas, fashion shows, masquerades, awards | 1×, punch-ins, white flash, light leak | glitter | confident, a promise |
| soulful | jazz, live music, comedy, lounges, gospel | slow (1.15×), dissolves, light leak | haze | warm, an invitation |
| editorial | book signings, talks, galleries, panels | slowest (1.25×), dissolves, no leak | dust | calm, let the flyer speak |
| sunlit | day parties, brunches, festivals, cookouts | 0.9×, punch-ins, white flash | sun motes | bright and easy |

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
   in production) on a 390×844 phone and records it. It writes:
   - `opening.mp4`;
   - a frame every half second plus every hard cut;
   - `held.png`, the hold under the title;
   - `sheet.png`, all the frames side by side.

   Times are printed from the opening's start.
3. Look at `sheet.png` and `held.png` (Read them), and check:
   - [ ] Does the first image and line land inside the first second? Is it
     the strongest the flyer has, not a credit or the date?
   - [ ] Does it build: closer or more intense shot to shot, quickening into
     the whole flyer, with the date or place last?
   - [ ] Does it feel like this kind of event? (Pace, cuts and particles fit
     the mood.)
   - [ ] Is every line readable, the eyebrow included, with nothing over a
     face or the flyer's own type?
   - [ ] Does one beat's words clear before the next beat's words come up?
   - [ ] Is every shot a recognizable subject, sharp, and no repeat of an
     earlier one unless it's closer?
   - [ ] Is each line on screen long enough to read (about a second or
     more)?
   - [ ] Is the whole flyer shown crisp before the hold?
   - [ ] Do the title, tagline and button read clearly over the hold?
4. Fix the recipe (or the scene, for a problem every recipe would have), and
   watch again. Stop when the checklist passes. Two rounds is usually enough.

When a fix belongs in how Claude writes openings for everyone, change the
instructions in `src/lib/server/funnel-draft.ts` (or a mood in
`OPENING_MOODS`), not just the one recipe.

## Storing one by hand

An opening sits on the flyer backdrop:
`{ kind: "image", src, fit: "poster", opening }`. Clean it with
`parseOpening`: a stored recipe must equal its cleaned form exactly
(`checkOpening`), or publishing refuses it. Production data changes need the
owner's go-ahead first.
