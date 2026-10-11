# Plan 6: A moving opening scene from the flyer

The opening scene is the first thing a fan sees, so it should stop the
thumb. When an organizer uploads a flyer in the sign-up wizard, Showlnk makes
a 3 to 5 second video loop from it and plays it behind the opening title.
The three reels (The Night, Your People, Last Call) stay the organizer's
own footage; Showlnk helps them get it, but doesn't fake it.

## What works elsewhere (researched Oct 2026)

| Product | What it does | What we take |
| --- | --- | --- |
| Spotify Canvas | A 3 to 8 second vertical loop behind a playing track. Spotify's advice: tell a small story in the loop rather than trimming a longer video, and avoid flashing and text that fights the controls. Its beta reported more streams (about 5% in its own test; vendors quote far higher, unverified). | The format: short, vertical, silent, looping, no text in the video. Words stay as our own type on top. |
| Flyer-to-video tools (Vidio, FlyerLab, Morphic) | Turn a flyer or prompt into an animated flyer for social posts. | Organizers already want their flyer to move; it's a known ask, not a novelty. |
| Image-to-video models (Luma Ray, Kling, Veo, Runway) | A still in, a few seconds of motion out. Luma Ray 2 has a `loop` option from one start image; Kling and others loop by using the same image as first and last frame. | Make the loop from the flyer's own image, with the loop built in, so it never jumps. |

Prices (per second of 720p video, Sep 2026 listings, verify before
committing): Veo 3.1 Lite about $0.05 (so ~$0.25 a clip), Runway Gen-4 Turbo
$0.05, Luma Ray 2 $0.10 to $0.15, Kling v3 Standard $0.084 on fal.ai. A
generation takes from about 10 seconds to several minutes under load.

Sources: [Spotify Canvas specs (artist.tools)](https://www.artist.tools/post/spotify-canvas-specifications-a-complete-guide),
[Canvas guidance (TechCrunch)](https://techcrunch.com/?p=1895095),
[Canvas and streams (Hypebot)](https://www.hypebot.com/musicians-guide-to-using-spotifys-canvas-for-cool-video-features/),
[Video flyer maker (Vidio)](https://www.vidio.ai/tools/auto-video-flyer-maker),
[Image to video for flyers (Morphic)](https://morphic.com/resources/images/event-flyer-design-image),
[Luma video generation docs](https://docs.lumalabs.ai/docs/python-video-generation),
[Luma Ray 2 loop option (RunComfy)](https://www.runcomfy.com/zh-CN/models/luma/luma-dream-machine/api),
[First and last frame models (Segmind)](https://www.segmind.com/models/all/first-and-last-frame-video-models),
[Video API pricing (TeamDay)](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026),
[Veo 3.1 Lite (The Decoder)](https://the-decoder.com/googles-veo-3-1-lite-cuts-video-generation-costs-by-more-than-half/).

## Decision (Oct 11, 2026): Claude directs coded motion, no video model

Video models were researched (above) and set aside: they cost per event,
take up to minutes, and warp a flyer's lettering. Instead Claude, which
already reads the flyer, writes a short **motion recipe**, and the browser
draws the scene live from the flyer itself (`src/components/MotionScene.tsx`):

- **focus:** the box on the flyer to feature, clear of lettering (the
  runway model, the masked face), framed with heads kept in view;
- **camera:** a slow push in and back, a drift, or a sway;
- **effects**, from a fixed set: smoke, embers, glitter, bokeh, a light
  sweep, a glow pulse, rain;
- **two colors** from the flyer (the glow, and the light in the air);
- **seconds:** one loop, 3 to 6.

Layers, back to front: the whole flyer blurred into a field of its colors,
the glow, the subject with the camera's move (edges feathered away), then
light and particles. Every motion repeats a whole number of times per loop,
so it never jumps. Free per event, instant, crisp at any size, still for
visitors who ask for less motion. The organizer's words stay our own type.

## First principles

1. **Never animate the words.** Only the artwork moves; the title, date and
   button stay our type on top.
2. **Motion that loops**, 3 to 6 seconds, calm enough that the title reads.
3. **Instant.** The scene is ready the moment the flyer is read.
4. **Free for everyone** (decided Oct 11): every new link gets its scene.

## The flow

1. **Flyer step (exists).** Claude reads the flyer and, in the same call,
   writes the motion recipe.
2. **Reels step (exists).** The phone preview opens on the moving scene.
3. **Claim (exists).** The flyer is stored as now; the opening scene's
   backdrop becomes `{ kind: "motion", src, recipe }`.
4. **Reels → Design:** "Shuffle the scene" (another recipe from the same
   flyer), pick the featured part, "Use the flyer, still", "Upload my own
   video".

## The reels: the organizer's footage, made easy

Showlnk can't film their night, and fans can tell. What we can do:

- **A shot list per reel**, written by Claude from the flyer, on each reel
  card in the wizard and the editor:
  - *The Night*: "Film the room at its best: the lights, the stage, 5 to 10
    seconds, phone held upright."
  - *Your People*: "Three regulars saying why they come back, one line each."
  - *Last Call*: "You, to camera: what's selling out and when."
- **Use what they have.** Last event's videos, an Instagram Reel or TikTok
  link, a YouTube Short (YouTube already plays). Import by link, so they
  don't have to download and re-upload.
- **Record in the browser** from the reel card, upright, with a 3-second
  countdown and the shot list on screen.
- **Until a reel has video**, it shows the flyer with gentle motion (as
  now), and Home's "four things" keeps counting it as "Needs video".
- **Later, maybe:** a "Get it filmed" option that connects them with a
  local videographer, a paid add-on.

## Steps

1. Prototype the renderer from Big Love's flyer (done: two recordings
   shared Oct 11).
2. The recipe: Claude writes it while reading the flyer; checked on the
   server like every other field (boxes inside the flyer, known effects,
   hex colors, 3 to 6 seconds).
3. The backdrop: a `motion` scene kind in the link's data and the opening
   scene, the wizard's phone, the claim and the editor's preview.
4. Editor: shuffle, featured part, still, own video.
5. Reels help: the shot lists, link import for Instagram and TikTok,
   in-browser recording (each its own small step after the scene ships).

## Open questions

- Which effects read best per kind of night (a fixed mapping, or Claude's
  call each time)? Tune with a handful of real flyers.

## Update (Oct 11, 2026): the flyer trailer, built with Remotion

Two findings set the direction:

- What sells Big Love's opening is **the edit, not the motion**: a 10-second
  multi-shot short (wide, close-up, detail, walk). A Kling multi-shot test
  from the flyer had the right feel but costs per event; flat and depth
  loops of one still image don't.
- One flyer already holds several shots. Cut into them like an editor
  (a face, the figure, a detail), with a camera move per shot, punch-in cuts
  with a flash, light leaks, embers, grain and grade, ending on the whole
  flyer crisp, and it reads as a trailer at no cost per event.

Built with Remotion 4.0.526 (pinned) and its official agent skill
(`.claude/skills/remotion-best-practices`, read before adding):
`src/remotion/FlyerTrailer.tsx`, played on the link with `@remotion/player`.

- **License:** Remotion's free license covers individuals and companies of
  up to 3 people; above that, embedding the Player counts as an automation
  ($0.01 per render, $100 a month minimum). Showlnk uses the free license
  (decided Oct 11, 2026); revisit when the team grows past 3.
- **Sharpness rule:** a shot's box is at least a third of the flyer's width
  and close to 9:16, and the composition is 720×1280, so no shot is
  enlarged past the flyer's own detail.
- **Compatibility:** only CSS-based cuts (push-cut) and the light-leak
  effect; the HTML-in-canvas transitions (film burn, zoom blur) aren't
  supported on many phones yet.
- **Next:** Claude picks the shots and moves when it reads the flyer (boxes
  checked on the server); the trailer becomes the opening scene's backdrop;
  the link's title waits for the poster shot to pass; an MP4 export for
  Instagram Stories and TikTok.

## Shipped (Oct 11, 2026): the opening in the wizard

The flyer's own words won (Oct 11): the opening cuts through the flyer with
its own lines set over the shots, then settles under the link's title.

- **Claude writes it** in the same call that drafts the reels
  (`src/lib/server/funnel-draft.ts`, no extra cost): 3 or 4 shots on the
  flyer's artwork, clear of its lettering, each with a camera move and maybe
  a line from the flyer (a presenter credit as an eyebrow, then selling
  lines), plus the hold. Never invented words.
- **Every value is checked** (`src/lib/opening.ts`): boxes inside the flyer
  and at least 28% of its width (35% for the hold) so nothing is enlarged
  past its detail, moves and placements from fixed lists, lines short plain
  text. A recipe coming back from a browser must already be exactly clean.
- **Stored on the flyer backdrop**: `{ kind: "image", fit: "poster",
  opening }`. A link without one, or a phone that can't play it, keeps the
  still flyer. Free for everyone.
- **Played by** `src/components/OpeningBackdrop.tsx` with Remotion's Player
  (loaded only on links that have an opening): the cut once, the whole
  flyer, then the hold, looping. The title, tagline and buttons come up as
  the hold begins; a tap skips straight there; visitors who ask for less
  motion get the hold, still. The composition takes the screen's own shape.
- **The hold** is softened (a slight blur and dimming) under a strong scrim,
  so whatever the flyer prints there never fights the link's own words.

Set aside along the way: the flat and depth-map scenes (and the
Transformers.js dependency they needed), the paid video models, and the
club and hype trailer styles.
