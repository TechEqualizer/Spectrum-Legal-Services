---
name: simple-navigation
description: Keep every screen of this app simple to navigate. Use when adding or changing a page, menu, dialog, button or form, in the admin (/admin) or on a funnel link (/f/...), and when someone says a screen is confusing, cluttered or hard to find things on.
---

# Simple navigation

Where things go and how people move between them. For how screens look and
behave (layout, type, controls, motion), also follow `ui-ux-design`.

People use this app on a phone, between other things. Every screen should
answer three questions at a glance: **Where am I? What can I do here? Did it
work?** If a screen needs explaining, simplify the screen.

## The rules

1. **One main action per screen.** Give it the one filled, colored button.
   Everything else is an outline button, a link or an icon.
2. **Most-used first.** Put what people come to do at the top. Settings and
   rarely used options go below it, folded away (`<details>`) until needed.
3. **Six places, at most.** The admin menu has six items or fewer (Home,
   Events, Reels, Leads, Results, Share; Settings sits apart). On a
   phone they sit in a bottom tab bar, always visible within thumb reach:
   never a hidden menu, never a row that scrolls sideways.
4. **Show where you are.** The current tab is highlighted and marked
   `aria-current="page"`. Page titles match the menu label word for word.
5. **Plain words.** Label things with the words a business owner uses
   ("Leads", "Share", "Results"), not ours ("funnel map", "entry trigger").
   Short labels: one or two words in menus, a verb on buttons ("Save reel").
6. **Every action answers.** Saving shows "Saved" where the person is
   looking. Errors appear next to the field, in words that say how to fix it.
   Never fail silently.
7. **Don't make people finish twice.** If something they typed or pasted is
   clearly valid (a link, a phone number), use it. Don't require a second
   "Use" or "Apply" tap before Save counts it.
8. **Undo over "Are you sure?".** Make actions easy to reverse (Reset,
   Restore) instead of stacking confirmations.
9. **Fit the phone.** 44px touch targets, nothing wider than the screen, and
   the main action visible without scrolling on a 390×844 screen. Plan for
   long names and large text (phones' text size setting): names truncate or
   wrap, rows wrap instead of squeezing, grids use `grid-cols-1` with
   `min-w-0` children. The phone top bar is one row: the event (tap to
   switch) on the left, Core and the account on the right, and nothing in it
   may push the others off screen. The `phone` e2e suite checks every admin
   page this way; add new pages to it.
10. **Pop-ups close themselves.** A menu or pop-over closes when people
    click or tap outside it, press Escape (focus returns to its button),
    tab out of it, pick an item, or go to another page. Nothing stays open
    behind the next thing they do. For a `<details>` menu, use
    `useDismiss()` and `closeMenu()` from
    `src/admin/components/ui/use-dismiss.ts`. (Folded sections inside a page,
    like Funnel settings, are not pop-ups: they stay open while in use.)

## Before you finish

Open the changed screen at 390×844 and at 1440×900 and check:

- [ ] Can you tell where you are and what the main action is in 3 seconds?
- [ ] Is the main action on screen without scrolling (on the phone)?
- [ ] Does every button and save give visible feedback?
- [ ] Are all menu items visible on the phone with no sideways scroll?
- [ ] Does every menu close on an outside click, Escape and a page change?
- [ ] Would a business owner understand every label without asking?

If a box isn't ticked, fix the screen before adding anything else to it.
