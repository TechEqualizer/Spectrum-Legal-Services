# Plan 11: The admin in light and dark, and an app's calm on desktop

The phone shell (plan 10) made the bottom of the admin feel like an app;
the pages above it still read like a form. This plan makes the whole admin
feel as good: first a dark look alongside the light one (the owner asked
for both), then the desktop shell and page tops built in both.

## What works elsewhere (researched Oct 13, 2026)

- **Apple (Human Interface Guidelines, Dark Mode):** look good in both
  appearances and follow the system setting, including Auto switching while
  the app runs. Apple advises against an app-only appearance setting,
  because people then change two settings and may think the app is broken
  when it ignores theirs. Dark interfaces need their own contrast testing.
- **Material Design:** dark surfaces are dark grey rather than black, raised
  surfaces get lighter, and accent colors are lifted so they still meet
  WCAG AA (4.5:1).
- **Ideogram:** Settings has an Appearance row (Light). Its desktop is calm:
  a light sidebar with a hairline edge, icon and label rows with a soft grey
  pill on the current one, small grey group labels (Create, Pinned, More),
  the account at the top and bottom; collapsed, it is icons with dark
  tooltips. Pages are mostly air: a modest sentence-case title at the top
  left, no header bar; an empty page is a centered picture of its own kind
  of content, a two-line headline, one grey sentence and one black pill
  button; filters are pill tabs.
- **Eventbrite Organizer:** an early version shipped a day/night display
  option for working at the door.

Sources: [Dark Mode (Apple HIG)](https://developer.apple.com/design/human-interface-guidelines/dark-mode),
[Dark interface evaluation criteria (App Store Connect)](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/dark-interface-evaluation-criteria),
[Dark theme (Material Design)](https://m2.material.io/design/color/dark-theme),
[Tone-based surface color in M3 (Material blog)](https://material.io/blog/tone-based-surface-color-m3),
[Eventbrite Organizer for Android (Eventbrite blog)](https://www.eventbrite.com/blog/?p=49549);
Ideogram from the owner's screenshots (phone and desktop).

## Decisions

- **Match device by default**, as Apple asks; **Light** and **Dark** as
  choices in Settings → Appearance (the owner asked for both: organizers
  check in at dark venues). The choice lives in a cookie on that device, so
  the server renders the page in it: no flash of the other look.
- **The dark look is the Velvet Rope night**: a plum-black page (#0b0812),
  cards a step lighter (#17111f), warm cream words (#f4eee4), status colors
  lifted to read on dark. Gold stays the one action color.
- **What doesn't change with the look:** the dark bars (the sidebar, the
  phone's top bar and tab pill), and anything that shows what fans see (the
  flyer and reel thumbnails, the date tiles, the phone previews, the button
  effect samples). Menus and sheets opened from the bars follow the look.

## How it works

Every admin color is a CSS variable (Tailwind 4 reads `--color-*`; the
event's theme sets `--deep-navy` and friends). `.admin-brand` around the
frame keeps each color's light value; `.admin-theme` picks light or dark
for each with `light-dark()`, which follows `color-scheme` (set from the
choice: `light`, `dark`, or `light dark` for Match device). `.keep-light`
pins a part to the light values; `.theme-follow` puts the chosen look back
inside one. A browser without `light-dark()` (before 2024) stays light, and
Settings says so.

**Tested** (`theme` suite): the device's setting is followed; Light and
Dark override it at once and after a reload; the server sends the chosen
look; the bars stay dark; and every visible word on every admin page, the
+ menu and the new reel and new night sheets, at 390 and 1440 wide,
reaches WCAG AA contrast in dark.

## Next, in both looks

1. **Desktop shell, after Ideogram:** a sidebar that follows the look
   (light with a hairline in light), icon and label rows with a soft pill on
   the current page, Create on top, the account at the bottom; collapsed to
   icons with tooltips. Pages lose the header bar and open on a calm
   sentence-case title.
2. **Phone page tops:** no black bar; a big title with the photo as a round
   button; sheets rise from the bottom.
3. **Link page:** reels as tall thumbnails with ⋯ actions.
4. **Results and People:** empty states that ask for one action, and chips.
5. **Settings as grouped rows**, with Team for full admins.
