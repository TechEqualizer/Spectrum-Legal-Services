---
target: step-3 screens
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/Spectrum-Legal-Services/src/admin/components/Events.tsx"
target_fingerprint: "sha256:53ebe82aaacf773f8f4bfd69917da9fff61d8d17610bbefcff93a3602f43afb5"
target_path: /home/user/Spectrum-Legal-Services/src/admin/components/Events.tsx
timestamp: 2026-10-04T03-08-17Z
slug: src-admin-components-events-tsx
---
# Critique: step-3 screens (Events, New event sheet, bio-link chooser, Share bio link)
Method: dual-agent. Score 26/40 (Acceptable).
Heuristics: 1=3, 2=2, 3=3, 4=2, 5=2, 6=3, 7=2, 8=3, 9=3, 10=3.
Detector: 0 findings in Events.tsx, OrganizerEvents.tsx, Links.tsx. Browser on /admin/events: overused-font (app-wide Montserrat), 3x text-occlusion in the account menu (likely a hidden popover).
## Priority issues
- [P1] Chooser cards drop ?src / utm, so bio-link attribution is lost (OrganizerEvents.tsx:44; page.tsx passes no searchParams). harden
- [P1] Fresh event ships invented scarcity "Tickets are limited..." (new-event.ts:52). clarify
- [P1] Organizers can't create events; empty state is a dead end (Events.tsx:41, route.ts). onboard
- [P2] Bio link unlabeled on phones (Events.tsx:151); Share copy still says calls/bookings; teal filled "Copy link" breaks primary rule (Links.tsx:164). clarify/distill
- [P2] Duplicate leaks "(copy)" into the visitor title and prefills a -2 slug that collides on second duplicate; errors not beside the field. harden
## Minor
- "Open now" chip reads as venue status; no "Tonight" state; sold-out not shown on chooser cards.
- Chooser h1 is an 11px eyebrow; organizer name not visible in text.
- Copy (Events) min-h-10 and Share range buttons min-h-9 are under 44px.
- Gray-500 helper text; chooser has no OG image.
