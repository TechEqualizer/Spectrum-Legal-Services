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

## First principles

1. **Never animate the words.** Video models warp printed text, and the
   flyer's text is the event's facts. So the loop is made from the flyer's
   artwork and mood, not its lettering; the title, date and button stay our
   own crisp type on top, as they are now.
2. **Motion that loops, not a clip that restarts.** 3 to 5 seconds, the
   same frame at both ends: drifting smoke, light sweeping, a slow push,
   glitter, a crowd's glow. Calm enough that the title reads.
3. **Instant first, better shortly after.** The wizard never waits on a
   model. The scene moves at once with what we have today (the flyer with
   a slow push, haze and light in its colors); when the loop is ready it
   fades in, with a small "Your opening scene is ready" moment.
4. **Cheap enough to give away.** About $0.25 to $0.75 per event. A few
   tries per event, then it's theirs to keep or replace with their own
   video.

## The flow

1. **Flyer step (exists).** Claude reads the flyer. New: it also writes a
   one-line motion brief from the artwork, e.g. "slow push through violet
   smoke, gold glitter falling, masks catching light", and says where the
   artwork is (a crop box that avoids the lettering).
2. **Reels step (exists).** The phone preview plays the instant scene. In
   the background the server sends the cropped artwork and the brief to the
   video model with looping on, at 9:16, 5 seconds, no sound.
3. **When it's ready** (usually within a minute or two), the preview swaps
   to the loop. If the organizer leaves first, it's waiting on their link
   after they claim.
4. **Claim (exists).** The loop is stored with the flyer in `reel-media`
   and set as the opening scene's backdrop (`kind: "video"`, which the
   scene already plays muted, looping, and still for reduced motion).
5. **Later, in Reels → Design:** "Make another" (a new take, same flyer,
   up to 3 per event), "Use the flyer, still" and "Upload my own video".

Guard rails: one generation per flyer upload and at most 3 per event, tied
to the invite (the wizard is invite-only), so a draft can't run up a bill.
If the model fails or times out, the instant scene simply stays.

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

1. Pick the model and get its API key into Vercel (`VIDEO_API_KEY`).
   Generate a few loops by hand from real flyers (Big Love's, Book
   Signing's) to pick the model and the prompt.
2. Server: `/api/start/scene` starts a generation, then polls for it and
   stores the result. A mock video server for tests, like the Claude and
   Stripe mocks.
3. Wizard: the background generation, the swap-in, and "ready" moment.
4. Claim: carry the loop into the link (as the flyer is carried now).
5. Editor: "Make another", "Use the flyer, still", "Upload my own video".
6. Reels help: the shot lists, link import for Instagram and TikTok,
   in-browser recording (each its own small step after the scene ships).

## Open questions

- Which model: Veo 3.1 Lite (cheapest), Luma Ray 2 (built-in loop) or
  Kling (best motion)? Decide after step 1's test loops.
- Is the generated loop part of Free, or a Core feature (Free keeps the
  instant scene)?
