# Plan 7: The opening as a video for Stories

Organizers already post their flyer to Instagram Stories and TikTok. The
opening scene (plan 6) is a better teaser than the still flyer, so they can
download it as a video and post it, with the link sticker pointing at their
Showlnk link.

## What works elsewhere (researched Oct 11, 2026)

- **Instagram's own sharing**: a third-party app can hand Instagram a video
  as the Story background; the person adds stickers and posts. On the web,
  the phone's share sheet does the same job (Instagram, Save Video).
- **Stories specs**: 1080×1920 (9:16), MP4 with H.264, 30 fps; up to 60
  seconds plays as one card. Instagram's own bars cover about the top 250
  and the bottom 340 pixels, so words stay between them.
- **Ticketing apps** (Posh, DICE, Partiful) offer share-to-Story images; we
  found no public detail of a video export, so a moving teaser is a step
  past what organizers get from them.

Sources: [Sharing to Stories (Meta for Developers)](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories),
[Instagram Story specs (videobgremover)](https://videobgremover.com/blog/ig-story-specs),
[Instagram Story dimensions 2026 (admakeai)](https://admakeai.com/blog/instagram-story-dimensions-2026),
[Instagram Stories sizes (postfa.st)](https://postfa.st/sizes/instagram/stories/2025).
The pixel figures for the bars differ between guides; we keep a margin
past the largest (384 pixels at the bottom).

## Decisions (Oct 11, 2026)

- **Made in the browser**, with Remotion's web renderer
  (`@remotion/web-renderer` 4.0.526, read before installing, with
  `mediabunny` and its encoders): free per event, no render server, ready
  in about a minute on a phone or laptop. Each render sends Remotion one
  usage ping (`remotion.pro`, our site's address and whether it worked; no
  user or event data); Showlnk is on Remotion's free license (a company of
  up to three people). The owner chose this over a render server (no ping,
  but a cost and minutes per video).
- **Silent.** Organizers add music from Instagram's or TikTok's library when
  they post (the owner's choice); our own sound effects can come later.
- **H.264 only**, since Instagram may refuse other codecs. A browser that
  can't encode it (rare: some Linux builds) is told to use Chrome or Safari.

## What it is

- The opening as on the link, then a 3.5-second end card instead of the
  looping hold: the title in the look's font, the next date ("Sat, Oct 31 ·
  8 PM"), and "Tickets: showlnk.com/f/<event>" in the highlight color, all
  clear of Instagram's bars. About 10 to 13 seconds.
- In the Design tab's Opening section, **For Stories and TikTok**: Make the
  video (a progress bar, Cancel), then **Share video** on a phone (the share
  sheet: Instagram, TikTok, Save Video) or **Save video** on a computer. A
  second tap, because a phone opens its share sheet only straight after a
  tap. Changing the cut, the mood or the look makes a ready video stale.

## Drawing it the same way twice

The web renderer draws the scene itself (it doesn't photograph the page),
and doesn't draw everything a browser does. From a test render of Book
Signing:

- the hook's letters were an SVG mask with the flyer inside: drawn empty.
  They're now real text with an edge in the highlight color (better on a
  dark flyer too). On the link the flyer shows through them
  (`background-clip: text`); the renderer draws only the edge of such
  text, so in the video they're solid white;
- the hold's blur and dimming were on a wrapper: skipped. They're now on
  the flyer itself;
- blend modes (the sparks, the flash, the bloom, the light leak's screen)
  aren't drawn as blends; they read close enough as plain layers.

## Steps

1. Read and install the renderer; a test render (done; this sandbox's
   Chromium has no H.264, so it made VP8 here: real phones and desktops
   have H.264).
2. The end card, the drawable hook and hold, `src/lib/story-export.ts`, and
   the Design tab section (this change).
3. On a real phone: make and post one (the owner), and time it.
4. Later, maybe: our own sound, a square version for the feed, the same
   button on the Share page.
