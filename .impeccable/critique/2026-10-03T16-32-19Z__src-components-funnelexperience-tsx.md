---
target: event funnel opening screen (/f/events)
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/Spectrum-Legal-Services/src/components/FunnelExperience.tsx"
target_fingerprint: "sha256:5084cfb96153f34b7f0a57ce7a6405e556d43743708930fc0a755257659763ba"
target_path: /home/user/Spectrum-Legal-Services/src/components/FunnelExperience.tsx
timestamp: 2026-10-03T16-32-19Z
slug: src-components-funnelexperience-tsx
---
# Critique: event opening screen (/f/events)
Method: dual-agent (A: design review · B: detector + browser)
Score: 21/32 (heuristics 7 and 10 n/a; Persuade surface). Good-minus (66%, Acceptable band).

## Heuristics
1 Status 3 · 2 Real world 3 · 3 Control 3 · 4 Consistency 2 · 5 Error prevention 2 · 6 Recognition 3 · 7 n/a · 8 Minimalist 3 · 9 Recovery 2 · 10 n/a

## Priority issues
- [P1] Tickets is the secondary action even when the next date is tomorrow (ticketsFirst only in single-date mode, FunnelExperience.tsx:86; shimmer on Watch). Fix: apply the <48h / few-left rule in multi-date mode; shimmer follows the primary. Command: /impeccable layout
- [P1] "Get tickets" never says which date or price it buys. Fix: "Tickets · Sun, Oct 4" plus a "From $25 · 21+" line. Command: /impeccable clarify
- [P1] Sold-out date sits second and its reel's Tickets silently sells another Sunday; no waitlist action. Fix: sold-out circles after buyable ones, dimmed; waitlist as the action in that reel. Command: /impeccable harden
- [P2] Too many paths on one screen (4 circles + 2 buttons + swipe-up) and repeated copy (byline vs tagline, eyebrow vs circle 1). Command: /impeccable distill
- [P2] Sample reels all open "Video coming soon" after "Sneak peek inside". Command: /impeccable polish

## Detector (10-11 findings at 390/1440)
Real: 10px footer and chip sublabels (undersized text), duplicate date in circle aria-label (FunnelExperience.tsx:141). Likely false positives: marquee (CTA shimmer), buried-raster (film grain), all-caps eyebrow, overused-font (Montserrat is UI; display is Cormorant).

## Personas
Jordan: no price, 21+ only in 10px, Recap circle looks like a 5th date. Riley: sold-out circle sells another date; screen reader hears date twice. Casey: shimmer pulls thumb to Watch not Tickets; swipe-up clashes with home gesture; tickets open a new tab from Instagram's browser.
