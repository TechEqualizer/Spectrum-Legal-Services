# End-to-end tests

Real-browser tests for the funnel links and the admin, run against
stand-ins for Supabase and the Claude API, so nothing touches real services
or costs anything.

```sh
npm run test:e2e                  # build, then every suite (about 7 minutes)
npm run test:e2e -- draft path    # only these suites
npm run test:e2e -- --no-build    # reuse the last test build
```

The runner (`run.mjs`) starts the mocks, builds the app pointed at them,
starts it on port 3002, signs in a test admin, and runs each suite with a
fresh mock state. It prints one line per suite and exits non-zero if any
check fails. Each suite's full output, plus screenshots, goes to
`tests/e2e/.out` (not committed).

Ports 3002, 54321 (mock Supabase) and 54400 (mock Claude) must be free.
Building replaces the app's `.next` folder with a test build, so run
`npm run build` again before `npm start` for real.

## What's here

- `suites/`: one script per area. Each prints `PASS  name` or `FAIL  name`
  per check.
  - `client-link`: Big Love's live link, `/f/masquerade`.
  - `sell`, `fold`, `hero`, `yt-hero`, `events`, `one-date`, `emphasis`:
    the funnel link a visitor sees.
  - `medspa`, `link`: the medspa and JLF links.
  - The rest: the admin (dates, flyer import, the "Draft my funnel" draft,
    look and style, opening screen, studio and path strip, publishing,
    saving, media).
- `browser.mjs`: Playwright's `chromium` for the suites, plus waits.
  `settle(page, ms)` returns as soon as the page is quiet (no requests in
  flight, no `setTimeout` of up to 1s pending, in any frame), and never
  later than `ms`, so use it instead of `page.waitForTimeout`. It doesn't
  wait for CSS animations (the event pages always run some); a check about
  one calls `animationsDone(page, ms)` first. `SETTLE_DEBUG=1` logs each
  settle that ran out of time and what was still busy.
- `mocks/supabase.mjs`: auth, the publications table and storage, kept in
  memory. Test accounts: `tester@example.com` / `tester-pass-1` (signed in
  for the suites) and `owner@example.com` (first sign-in flow). Control
  routes: `/__state`, `/__reset`, `/__log`, `/__ttl?s=`.
- `mocks/claude.mjs`: answers flyer reads (`POST /__mode` with `multi`,
  `single`, `none` or `refusal`) and funnel drafts. `/__last` returns the
  last request, so suites can check the model, schema and prompt.
- `fixtures/`: a photo, two short videos, a sample flyer and a text file
  (for the wrong-file-type message).

The admin suites use Big Love Productions, and the visitor suites use the
Golden Hour sample at `/f/events`. The admin suites run in Detroit time
(`America/Detroit`), so the Oct 31, 8 PM event shows on the right day.
