# Plan 10: The admin on a phone feels like an app

Organizers run their nights from their phones, often one-handed in a dark
venue. Their loop is **post something → see what sold → post again**, a few
times a day in the week before a night. The admin should put that loop under
the thumb: a few places to go, and one button for what they do.

## What works elsewhere (researched Oct 13, 2026)

- **Ideogram's mobile site** (the owner's screenshots): a floating, fully
  rounded tab pill in from the edges with the content scrolling under it;
  a separate **+** beside it that turns into ✕ and raises a menu; almost no
  top chrome; settings as grouped iOS-style lists; filter chips; actions as
  translucent pills on the content itself.
- **Bottom navigation guidance**: 3 to 5 tabs, tabs are places and the main
  action gets its own distinct button; targets at least 48px.
- **Icon labels**: Nielsen Norman Group's guidance is that icons need text
  labels unless their meaning is universal (home, search, print). Ours
  (People, Results) aren't.
- **Eventbrite Organizer app**: switching between events is a menu at the
  top, not a tab; most organizers run one event at a time.

Sources: [Bottom tab bar best practices (UX Planet)](https://uxplanet.org/bottom-tab-bar-design-best-practices-ef3ee71de0fc),
[Bottom tab bar design (Babich)](https://babich.biz/blog/bottom-tab-bar-design/),
[Do icons need labels? (uxdesign.cc, on NN/g)](https://uxdesign.cc/do-icons-need-labels-6cb4f4282c00),
[Eventbrite Organizer app help](https://www.eventbrite.com/support/articleredirect?anum=5870).

## Where we differ from Ideogram

- **Labels stay.** Ideogram's icons are ones everyone knows; ours aren't.
- **Dark, not light glass.** A light bar glares in a dark room and fights the
  Velvet Rope palette; the pill is deep navy glass, active tab in white.
- **The + is for posting, not making.** Ideogram is a creation tool; our most
  valuable action is putting the night in front of people, so posting is
  first in the menu, not buried in the Design sheet.

## What PR 1 ships

**Four places**, the same on a phone (the pill) and on desktop (the sidebar):

| Tab | Answers | Was |
|---|---|---|
| Tonight | How's my next night doing? | Home; Events sits under it ("All your nights ›") |
| Link | What do fans see? | Reels |
| People | Who's coming back? | Leads (Fans joins it later) |
| Results | What's selling? | Overview; the Share page (`/admin/links`) sits under it |

Old addresses keep working; each lights up the tab it belongs to.

**The gold + (Create on desktop)**, ordered by how often each is used:

1. **Post to your story**: the story video from the opening, made at once,
   then the phone's share sheet. If there's no opening yet, it says so and
   opens the link.
2. **Copy your link**: the organizer's `/f/<organizer>` link, "Link copied"
   in place.
3. **A link for one place**: the Share page's link builder, scrolled into
   view (`/admin/links#place`).
4. **Add a video**: the reel editor, open on a new reel (`/admin?add=1`).
5. **New night**: the new-event sheet, open (`/admin/events?new=1`); shown
   only to organizers who run their own events.

On a phone the + sits beside the pill and its menu rises from it; on
desktop it's the first thing in the sidebar and the menu opens beside it.
It closes on Escape, a tap outside, or a page change.

Everything that sits at the bottom (the reel studio's publish bar, toasts,
the page's last row) clears the pill and the phone's safe area.

## How we'll judge it

- Taps from opening the admin to a story posted: about 6 before, 2 after.
- How often organizers post.
- Whether the Fans add-on sells more once it sits in People.

## Next

- **PR 2**: refine Post to your story (share sheet straight away where the
  phone allows it).
- **PR 3**: Settings as grouped lists (profile header, "Plan · Not live ›"),
  chips (Leads | Fans; 7 · 30 · 90 days), and edit / ⋯ on each reel's
  thumbnail.
