---
target: Showlnk landing page
total_score: 24
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/Spectrum-Legal-Services/src/app/page.tsx"
target_fingerprint: "sha256:1860948bc5a49927460f99ee5c0d4e78fd54b39f6bfda4e2fcbce5ff9208e504"
target_path: /home/user/Spectrum-Legal-Services/src/app/page.tsx
timestamp: 2026-10-07T12-08-58Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Success shows only in the stub used; second stub and mobile Dock still ask to join |
| 2 | Match system / real world | 3 | Promoter language lands; "experiences" vague; board caption "Ticket clicks" vs "61 tickets" column |
| 3 | User control and freedom | 3 | Dock always jumps to the top stub |
| 4 | Consistency and standards | 3 | Consistent CTA; landing palette not in DESIGN.md |
| 5 | Error prevention | 3 | Instagram required but label doesn't say why/required |
| 6 | Recognition rather than recall | 3 | Clear labels |
| 7 | Flexibility and efficiency | n/a | Single-action marketing page |
| 8 | Aesthetic and minimalist design | 3 | Strong desktop hero; mobile first screen is type only |
| 9 | Error recovery | 3 | Plain errors; no duplicate-signup message |
| 10 | Help and documentation | n/a | Waitlist page |
| Total | | 24/32 | Good |

## Design specificity
Authored in voice and key objects (ticket-stub form, lineup/last call language, poster type, real Big Love phone); skeleton is a standard SaaS waitlist. Biggest miss: the product (vertical video reels) is never shown; lineup is four text rows; ReelFan unused.
Detector: CLI 25 advisory (16 color, 6 radius, 3 font-size) — drift vs DESIGN.md, which doesn't document the landing's .sl palette (mostly false positives). Browser: placeholder contrast 4.3:1 (real), oversized-h1 (intentional), radial glow x2 (intentional), dark-glow (false positive), Montserrat 70% (brand). No overflow at 390; logo link 115x32 tap target; phone iframe covers its still even on a 404.

## Priority issues
- [P1] Reels never shown -> show four 9:16 reel frames from Big Love's real content in the lineup (bolder/overdrive)
- [P1] Mobile first screen has no product; phone lands after the form (adapt)
- [P1] Board caption says clicks, column says tickets; now true as sales via Eventbrite -> caption "Tickets sold by source" (clarify)
- [P2] "Who makes the video?" unanswered -> one honest how-it-works line (clarify)
- [P2] Phone can look broken (replay reload, covers still on error); success state not shared across stubs/Dock (harden)

## Persona red flags
Detroit promoter on IG in-app browser: slogan-only first screen, unclear who makes video, Instagram asked with no upfront reason, Big Love proof buried in a 12px caption. First-timer: no next step after joining. Stress tester: can join twice; dock jumps to top.

## Minor
Placeholder contrast 4.3:1; logo tap target 32px tall; Big Love's showcase makes "Sneak peek" the filled button over "Get tickets"; footer line "Reels that sell the night" is the clearest product line; dead ReelFan CSS ships; DESIGN.md lacks the landing world.
