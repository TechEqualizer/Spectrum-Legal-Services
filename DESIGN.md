---
name: Event Reels
description: An event's link told as a story of vertical reels, in the organizer's own brand, ending on Tickets.
colors:
  night: "#0E1A2B"
  depth: "#1E3A5F"
  door: "#28719A"
  spotlight: "#6CB4D8"
  house-lights: "#F2F4F7"
  ink: "#2E3440"
  paper: "#FFFFFF"
  hairline: "#E5E7EB"
  hint: "#4B5563"
  warning: "#92400E"
  danger: "#B91C1C"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.25rem, 9vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.05
  headline:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  touch: "44px"
components:
  button-tickets:
    backgroundColor: "{colors.door}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 16px"
  button-watch-glass:
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 20px"
  button-admin-primary:
    backgroundColor: "{colors.night}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 24px"
  button-admin-primary-hover:
    backgroundColor: "{colors.depth}"
  button-admin-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.night}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  sheet:
    backgroundColor: "{colors.house-lights}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "20px"
  chip:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: Event Reels

## Overview

**Creative North Star: "The Velvet Rope"**

An event's link is the entrance to the night. It is dark and cinematic, with
the organizer's brand in the light: their flyer, their colors, their title
typeface. Every screen leads toward one door, Tickets. The visitor never
feels the product, only the event.

The admin is the quiet back office behind the rope. It is refined and
restrained: white cards on soft house lights, plain words, one filled button
per screen, and the brand color used only where it means something. It
borrows the organizer's palette so the back office and the night feel like
one place, but it never competes with the live phone preview, which is the
most colorful thing on any admin screen.

There is no product logo on a visitor's screen and no decoration for its own
sake. Elegance comes from restraint, type and light, not ornament.

**Key Characteristics:**
- Two rooms, one palette: a dark, cinematic visitor link and a light, calm
  admin, both colored by the organizer's five color roles.
- The organizer's brand leads; Event Reels recedes.
- Tickets is the one filled, brand-colored action on every visitor screen.
- Phone first: 44px targets, thumb-reach actions, nothing wider than the
  screen.

## Colors

Five color roles, each replaced by the organizer's own colors (a "look",
often matched to their flyer); the hex values above are the built-in
defaults. The CSS variable names are historical (`--deep-navy` and so on) and
stay as they are; the roles are what matter.

### Primary
- **Night** (`--deep-navy`): the visitor link's background and the admin's
  text and filled buttons. Kept dark enough for white text at 13:1.
- **Door** (`--teal-accent`): the Tickets button and other brand actions. A
  light door color (gold, neon) keeps its color and takes dark words through
  `--on-accent`; a mid one is darkened until white reads at 4.5:1.

### Secondary
- **Depth** (`--royal-blue`): the second dark, for washes and gradients behind
  the visitor scene and the admin's button hover.
- **Spotlight** (`--sky-accent`): small highlights on dark (eyebrows, the
  glow behind a title, active marks), at least 6:1 against Night.

### Neutral
- **House Lights** (`--soft-gray`): the admin's page background and the
  inside of sheets.
- **Paper** (#FFFFFF): admin cards, fields and outline buttons.
- **Ink** (`--charcoal`): admin body text.
- **Hairline** (gray-200): card borders and row dividers in the admin.
- **Hint** (gray-600): secondary admin text; never lighter on white.
- **Warning** (amber-800 on amber-50) and **Danger** (red-700): "Not
  published", "Needs a ticket link", deletes and errors.

### Named Rules
**The One Door Rule.** On a visitor screen, only Tickets is filled with the
Door color. Watch is glass; everything else is text or outline.

**The Readable Brand Rule.** Organizer colors never ship as typed: every look
passes through `readableColors` so text meets WCAG AA on every screen. Never
bypass it to match a flyer more exactly.

## Typography

**Display Font:** Cormorant Garamond (the classic title face), with Georgia
**Body Font:** Montserrat, with the system sans

**Character:** A display serif with presence for the event's name, and a
clean geometric sans for everything that has to be read fast.

Organizers can swap the title face for one of a short, vetted list: Fashion
serif (Playfair Display), Engraved capitals (Cinzel), Bold condensed (Bebas
Neue) or Modern sans (Syne). Titles only; body text is always Montserrat.

### Hierarchy
- **Display** (600, clamp(2.25rem, 9vw, 3.5rem), 1.05): the event's title on
  the opening scene and in previews; set in the organizer's title face.
- **Headline** (700, 1.25rem, 1.2): admin page and sheet titles.
- **Title** (700, 1rem, 1.3): card titles, reel titles in lists, date names.
- **Body** (400, 0.875rem, 1.6): admin copy and help; visitor taglines run
  larger (1rem to 1.125rem).
- **Label** (700, 0.6875rem, 0.1em tracking, uppercase): eyebrows, section
  labels, chip text, tab labels.

### Named Rules
**The 11px Floor Rule.** No text below 11px anywhere a person reads, on any
screen. The one exception is a miniature preview of a phone screen (the Style
and opening-screen previews), which is a scaled-down picture of the real
screen rather than text to read.

**The One Display Face Rule.** One display face per funnel, chosen by the
organizer. Never mix two display faces on one screen.

## Layout

Phone first, at 390×844. The visitor link is a single full-height column:
the opening scene fills the first screen (title, date card or date circles,
Watch and Tickets, fine print), and reels play full-screen with an action
rail on the right.

The admin is a single column of cards on a phone (16px gutters, a bottom tab
bar with five places). From 1024px a left sidebar replaces the tab bar and can
fold to a 72px icon rail. From 1280px the Reels page becomes the studio: three
columns (story steps, the live phone preview with the path strip under it,
and Design / Results / Settings), filling the window with no page scroll;
each column scrolls on its own.

Spacing follows a 4px rhythm: 8px inside controls, 16px between related
items, 20 to 24px inside cards and sheets.

## Elevation & Depth

Mostly flat. Admin cards sit on House Lights with a hairline border and no
shadow. Shadows mark things that float: sheets and dialogs (a large, soft
shadow over a dimmed backdrop), toasts, menus, and the visitor's Tickets
button, which carries a dark shadow to lift it off the scene. Depth on the
visitor link comes from light, not shadows: gradients and glows in the
organizer's colors, and blurred copies of their imagery.

### Named Rules
**The Float Only Rule.** A shadow means "this is above the page". Cards in
the page never get one.

## Shapes

Gently rounded and consistent: small corners (6px) on chips, fields and
small buttons; 8px on admin buttons and segmented controls; 12px on cards;
16px on sheets and dialogs. Visitor buttons and date circles are fully
round, so the night reads softer and more luxurious than the back office.

## Components

### Buttons
- **Tickets (visitor):** a full pill (56px tall), Door color, words in
  `--on-accent`, 17px semibold, with a gentle shimmer and a dark lift shadow.
  The one filled button on a visitor screen.
- **Watch (visitor):** the same pill as glass: white at 10%, a white 25%
  hairline and a backdrop blur.
- **Admin primary:** Night with white words, 8px corners, 44px tall, bold;
  Depth on hover. One per screen (Publish, Save, Use this style).
- **Admin outline:** Paper with a gray-300 hairline, 6px corners, 40px tall;
  soft gray on hover. For secondary actions (Import flyer, + Add date).
- **Text and danger:** semibold text buttons for tertiary actions; red-700
  for destructive ones, always with Undo afterwards rather than a
  confirmation.

### Chips
- **Style:** 6px corners, 12px semibold text, tinted backgrounds by meaning:
  gray (topic), teal (the main action, a date), navy (a choice), amber
  ("Needs video", "No video yet"), red ("No path leads here").
- **State:** informative only; chips are never buttons.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Paper on House Lights.
- **Shadow Strategy:** none (see Elevation).
- **Border:** Hairline.
- **Internal Padding:** 16px on phones, 20px from 640px.

### Sheets
- Native `<dialog>` sheets with a 16px corner, House Lights inside, a dimmed
  Night backdrop, a close button at top right, and a sticky footer for the
  main action, which is visible without scrolling on a phone.

### Inputs / Fields
- **Style:** Paper, gray-300 hairline, 6px corners, 16px text (no zoom on
  iPhone).
- **Focus:** a 2px Door-colored ring, hairline removed.
- **Error:** the message right under the field, red-700, saying how to fix
  it.

### Navigation
- **Phone:** a bottom tab bar on Night: five places, icon over an 11px label,
  the current one white, the rest gray-400.
- **Desktop:** the same five places in a Night sidebar with the organizer's
  logo, the business picker and the account menu; folds to an icon rail
  whose icons keep their names as tooltips.

### Opening Scene (signature)
The first screen of every link: the organizer's background (video, photo,
flyer as a poster, or a glow in their colors), the event title in the
display face, a one-line tagline, then the date card or date circles and the
Watch / Tickets pair. It fills one phone screen exactly and works with
animations off.

### Live Phone (signature)
In the studio, the funnel runs inside a 390×844 phone frame, scaled to fit,
with the path strip beneath it showing where the visitor is in the story.

## Do's and Don'ts

### Do:
- **Do** take every color from the five roles (`bg-deep-navy`,
  `bg-teal-accent`, `text-on-accent`, ...), so each organizer's look applies
  everywhere.
- **Do** keep one filled button per screen: Tickets on visitor screens, the
  main action in the admin.
- **Do** make touch targets at least 44px and keep the main action on screen
  at 390×844.
- **Do** answer every action where the person is looking: a toast with Undo,
  "Saved", or an error beside the field.
- **Do** honor reduced motion: every animation has a still version that shows
  all the content.

### Don't:
- **Don't** hard-code hex colors in components; use the roles.
- **Don't** add a second filled or Door-colored button to a visitor screen.
- **Don't** put shadows on cards in the page.
- **Don't** show the Event Reels brand on a visitor's screen.
- **Don't** go below 11px text, or lighter than gray-600 for text on white.
