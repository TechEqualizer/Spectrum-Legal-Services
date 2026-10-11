# The UI floor (Oct 11, 2026)

How Showlnk should feel, and the floor every screen is held to. The
`ui-sweep` end-to-end suite measures that floor on every main screen, sheet
and dialog. It checks at a phone size (390×844, touch) and a desktop size
(1440×900, mouse), and CI fails when a screen falls below it.

## What Apple and Google do

Apple's Human Interface Guidelines and Google's Material Design 3 differ in
look but agree on how a product should feel.

- **One system, used everywhere.** The same type scale, spacing rhythm,
  corners, colors and controls on every screen. Then a person learns the
  product once. Here that system is DESIGN.md: the Velvet Rope tokens, 4px
  spacing, 12px cards and one filled button per screen.
- **Clarity first.** Content leads and chrome recedes. Text is legible at
  every size, and color is never the only signal. The two companies frame
  it differently (Apple's clarity, deference and depth; Material's
  emphasis and hierarchy), but the result is the same: the next step is
  obvious.
- **Generous targets.** Apple's minimum hit target is 44×44pt and
  Material's is 48×48dp. The visible control can be smaller as long as the
  tappable area isn't. Our switch is a 48×28 track inside a 56×44 tap area.
- **Contrast.** WCAG AA asks for 4.5:1 for text (3:1 for large text), and
  both platforms build on it. Brand colors adapt to stay readable: a
  light accent such as Big Love's gold works as a button, but as words on
  white it is darkened (`--accent-ink`).
- **Immediate, honest feedback.** Every action answers at once with a
  pressed state, then the result, and undo wherever possible. Destructive
  actions that can't be undone ask first.
- **Motion that explains.** Short, purposeful transitions (150 to 300ms)
  show where things come from and go, and respect reduced motion.
- **Native controls when they fit**, so the phone's own pickers, menus and
  keyboards appear. When styling a native control, style its popup too:
  the event switcher's options were once white on white.

## The measured floor (`tests/e2e/suites/ui-sweep.mjs`)

- **Overflow:** nothing wider than the screen.
- **Contrast:** text at 4.5:1, or 3:1 when large (24px, or 18.66px bold).
  This is measured against the solid color behind the text. Text over
  photos and video is checked by eye.
- **Text size:** never below 11px. Miniature previews of a phone screen are
  excepted.
- **Targets:** 44×44px on a phone and 24×24px with a mouse (WCAG 2.2,
  2.5.8). Links inside a sentence are exempt.
- **Names:** every control has an accessible name, and every image has alt
  text (empty when it's decoration).
- **Native menus:** every option and group label is readable on the
  menu's white popup.

The suite runs across the landing page, `/start`, sign-in, the legal pages,
two live links and every admin page. It also opens the reel editor, the date
sheet and New event. Screenshots of each go to `tests/e2e/.out/` for the
human pass that numbers can't replace: hierarchy, rhythm and whether it
feels calm.

## Fixed in this pass

- The event switcher: options inside each client's group were white on
  the white popup.
- Organizer accents used as words on white cards (date chips, "· live", the
  Welcome label, Show in the password field) fell to 2.66:1 with a gold
  accent. They now use `--accent-ink`, the accent darkened to 4.5:1.
- Phone targets under 44px:
  - the 40px outline buttons (Edit and others);
  - the date sheet's 42px fields;
  - the media picker's Upload and Paste a link (32px) and Remove media
    (16px);
  - the on/off switches (28px);
  - the landing page's Terms link (43px wide).

Sources: [Apple's Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/),
[Material Design 3](https://m3.material.io/),
[Touch target size (Android accessibility help)](https://support.google.com/accessibility/android/answer/7101858?hl=en-GB),
[WCAG 2.5.8 Target Size (Minimum) (DAISY)](https://kb.daisy.org/publishing/docs/wcag/target-size-minimum.html),
[Target size rule (Deque axe)](https://dequeuniversity.com/rules/axe/4.8/target-size),
[Target Size and 2.5.5 (Adrian Roselli)](https://adrianroselli.com/2019/06/target-size-and-2-5-5.html).
The 44pt and 48dp figures are confirmed across these sources; check the
platform pages for the current wording.

## Reels studio review (Oct 11, 2026)

Two independent passes ran: a design critique of the studio at phone,
laptop and wide sizes, and the detector plus a code scan. The studio scored
23/40 on Nielsen's heuristics. The craft was sound: the measured floor
passed and the detector found nothing real. The gaps were in the model and
the high-stakes moments.

Fixed (the P1s):

- **One event, one story.**
  - An event's link has one set of reels. There are no funnel tabs, no
    "New funnel" and no audience rules.
  - Settings is now "Your link": copy and open it, and where ticket links
    live.
  - The reel editor speaks Tickets:
    - the "Tickets button" builds up, stays quiet or is lit from the start;
    - the end card is Tickets;
    - there is no Call/Book choice and no "What happened?" option.
  - A new reel no longer defaults to a leftover legal topic. The in-code
    demos keep their several funnels.
- **Undo for what's destructive.**
  - Remove reel and Discard get a toast with Undo.
  - Taking published edits down asks first.
  - The phone's publish bar has Undo.
- **Publish with care.**
  - Publish opens a sheet listing what changes ("1 reel edited", "The
    opening's background") before Publish now.
  - Afterwards the link shows, with Copy link, View live and Share. When
    the link isn't live yet, it says it's saved and private.
  - With nothing to publish, the header says "Published" with the time,
    not a gray disabled button.

Still open (P2):

- The reel list doesn't show each reel's role (The Night, Your People,
  Last Call), and it has too many chips.
- The reel dialog is long, and its Save isn't sticky.
- There are six ways to add a reel.
- The 1024–1279px gap: the studio needs 1280px.
- Drafts live per browser, so the agency's edits and the organizer's never
  meet.
