---
name: ui-ux-design
description: Design screens to the standard of Apple's Human Interface Guidelines and Google's Material Design 3. Use when designing or changing any screen, editor, form, sheet, list, button or animation in this app (admin or funnel links), and when someone asks for something to look or feel more polished, premium, native or "like Apple/Google". Pair with simple-navigation.
---

# UI and UX design (Apple HIG + Material 3)

This distills what Apple's Human Interface Guidelines and Google's Material
Design 3 agree on, applied to this app. Where they differ, pick the one that
reads simpler on a phone. `simple-navigation` covers where things go; this
covers how they look, feel and behave.

## Principles

- **Clarity.** Content first, chrome last. Text is legible at every size,
  icons are obvious, and decoration never competes with the task.
- **Deference.** The UI frames the business's content (their videos, their
  words) and gets out of the way: quiet surfaces, one accent color.
- **Depth and continuity.** Layers explain hierarchy: sheets slide over the
  page they came from, and the page stays visible behind them. Motion shows
  where things come from and go to.
- **Direct manipulation.** Edit things where people see them: tap the
  preview or the row to edit it, rather than hunting for an Edit page.
- **Personal and expressive (Material 3).** Color and type come from the
  brand (`--teal-accent`, `--deep-navy`...), never generic blue.

## Layout

- **8pt grid.** Spacing in multiples of 4 and 8 (Tailwind 1, 2, 3, 4, 6, 8).
  Screen margins 16 to 20px on phones.
- **Grouped lists for settings and editors** (iOS inset grouped / M3
  lists): a white rounded card per group, a small gray label above it, rows
  at least 44px tall with the label on the left and the value or control on
  the right, separated by hairlines.
- **Sheets for editing one thing.** On phones a sheet fills the screen
  (or rises from the bottom); on desktop a centered dialog up to about
  40rem. A sheet has a title, Cancel on one side, and one confirm action
  ("Save") that stays visible.
- **Show a live preview** next to anything that changes what visitors
  see, updating as people type.

## Type

- One family for UI text, at most one display face (the brand wordmark).
- A short scale, used consistently: large title (page), title (card or
  sheet), body (15 to 17px), caption (12 to 13px). Never below 11px.
- Sentence case for labels and buttons ("Add date", not "ADD DATE"). Keep
  uppercase for tiny eyebrow labels only.

## Color and surfaces

- Neutral surfaces (white cards on a soft gray page), one accent for the
  primary action and selection. Destructive actions are red text, not red
  buttons.
- Text contrast at least 4.5:1 (3:1 for large text). Never use color alone
  to show state: pair it with text or an icon.
- States for every control: default, pressed, focused (visible ring),
  disabled (40% opacity) and, where it applies, selected.

## Controls

- **Touch targets** at least 44×44pt (Apple) / 48×48dp (Material).
- **Buttons**: one filled primary per view; outlined or text for the rest.
  Labels are verbs.
- **Segmented controls** for 2 to 4 mutually exclusive options (status,
  mode). **Switches** for on/off. **Native date and time pickers**
  (`<input type="date">`, `type="time"`) on phones, never free text.
- **Text fields**: label always visible above the field, helpful
  placeholder, the right keyboard (`inputMode`, `type="url"`, `type="tel"`),
  and inline validation in words that say how to fix it.

## Feedback and motion

- Every action answers within 100ms: pressed state, then a result ("Saved"
  snackbar/toast near the bottom, 2 to 4 seconds).
- **Undo over confirmation** for deletes: delete at once, offer Undo in the
  toast. Confirm only what can't be undone.
- Motion is quick and purposeful: 150 to 250ms for small changes, about
  300ms for sheets, ease-out entering and ease-in leaving. Respect
  `prefers-reduced-motion`.
- Empty states say what goes here and offer the action ("No dates yet.
  Add your next event.").

## Accessibility

- Every control has a name; icons-only buttons get `aria-label`.
- Dialogs trap focus, close on Escape, and return focus.
- Works at 200% text size and with VoiceOver/TalkBack order matching the
  visual order.

## Review checklist

Before finishing, look at the screen at 390×844 and 1440×900:

- [ ] Is the one primary action obvious, and are the rest visibly secondary?
- [ ] Is spacing on the 4/8 grid, with grouped cards for settings?
- [ ] Are labels sentence case, plain and verbs on buttons?
- [ ] Do edits show in a preview, and does every action give feedback?
- [ ] Are deletes undoable, and are touch targets at least 44px?
- [ ] Do focus, pressed and disabled states all look right?
