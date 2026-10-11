---
name: flyer-cuts
description: Direct and review a reel's flyer cut, the short trailer each core reel (The Night, Your People, Last Call) plays from the event's flyer until the organizer adds a video. Use when changing how Claude writes cuts (cutBrief and CUT_SCHEMA in src/lib/server/funnel-draft.ts), parseCut, the scene's reel mode, FlyerCut, or when someone says a reel cut looks wrong, repetitive, slow or salesy.
---

# Flyer cuts

Someone who gives us only a flyer should feel they got three trailers. Each
core reel gets its own cut from the flyer, played by the opening's engine
(`src/remotion/OpeningScene.tsx` with `reel`), in the opening's mood. First
read `opening-scene`: the shots, moves, moods and review loop are the same.
This skill covers what's different. Research and sources:
`docs/plans/08-flyer-cuts.md`.

## One flyer, four cuts: make them different

The opening and three reels all come from one picture, so a fan sees the
same artwork four times. What keeps it from feeling repetitive is a
different job, framing, rhythm and voice for each:

| Reel | Job (the question it answers) | Framing | Rhythm | Words |
| --- | --- | --- | --- | --- |
| The Night | "Will this be amazing?" Desire and self-image | Closer than the opening: eyes, the mask, the outfit, the light | A hook line alone on black first, then pushes, tighter each shot | Who they get to be, second person, present tense ("You, in gold.") |
| Your People | "Is this for someone like me?" Belonging | Wider than the others: the crowd, the group, the room | Unhurried, pans the way the subject faces, pull-backs; no hook | Who it's for, from the flyer: dress code, age, music, vibe, bring your people |
| Last Call | "Why buy now?" True urgency | Punch-ins on subjects | Brisk: shorter shots, one fact each | The date, place, price, doors, a deadline; the date last |

Never reuse a shot from the opening or another reel unless it's closer.

## The rules a cut adds to the opening's

1. **The bottom belongs to the reel.** Its title, the organizer's name and
   the Tickets button sit there, so a cut's words are top or middle only
   (`parseCut` moves any bottom line to the middle). This is the same idea as
   TikTok's and Instagram's safe zones.
2. **It ends on the whole flyer**, crisp, for 2.2 seconds, so the fan takes it
   in and can tap Tickets. No blurred hold, no loop: the reel moves on.
3. **Facts from the flyer, voice from the reel.** Unlike the opening (the
   flyer's own words), a cut's lines may be Claude's own words in the reel's
   voice. Every fact in them must be on the flyer or in the known dates.
   Never invent quotes, reviews, numbers, performers, "selling fast" or
   "sold out".
4. **Short.** 2 to 4 shots (3 is right), five words a line at most: about 6
   to 9 seconds in all. The Night and Your People 1.6 to 2.2 seconds a shot,
   Last Call 1.2 to 1.6.
5. **Real video wins.** A cut is the reel until the organizer adds media;
   then it's gone. Don't make cuts compete with real footage.

## Review a cut

Watch it before judging it, using the opening's review loop
(`scripts/review-opening.mjs`, see `opening-scene`), or play the reel in the
wizard's phone (`/start`, step 2) or the studio preview. Check:

- [ ] Does it do its job? Could you tell from the cut alone which reel it is?
- [ ] Is it different from the opening and the other two (framing, rhythm,
  words), not the same shots again?
- [ ] Is every fact on the flyer? Nothing invented, no fake urgency?
- [ ] Are the words clear of the bottom third, and never over a face?
- [ ] Does Last Call end on the date, then the whole flyer under Tickets?
- [ ] Is each line on screen long enough to read with the sound off?

When a fix belongs to every cut, change `cutBrief` or `CUT_SCHEMA`, or the
scene's reel mode, not one recipe.

## Where cuts come from and go

- Written in `draftFunnel` (sign-up wizard and the studio's Draft from flyer),
  cleaned by `parseCut`, stored on the reel's photo
  `{ kind: "image", src: flyer, cut }`, checked on publish (`checkMedia`).
- Played by `FlyerCut` in `ReelViewer` (`CutSlide`); less motion or a broken
  flyer gets the still flyer.
- Shown to organizers as "Flyer cut" (reel list, media picker, Home).
