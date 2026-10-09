// Test runs only: every process in a run (the app, its build, the mocks and
// the suites) sees the same calendar, so tests written around Big Love's
// Oct 31 night pass whatever today's real date is. run.mjs loads this with
// NODE_OPTIONS and sets E2E_TIME_OFFSET_MS; browser.mjs does the same in
// every page. Time still moves: "now" is the real clock plus a fixed offset.

const offset = Number(process.env.E2E_TIME_OFFSET_MS || 0);

if (offset) {
  const RealDate = Date;
  const now = () => RealDate.now() + offset;
  function ShiftedDate(...args) {
    // Called without new, Date() returns the current time as a string.
    if (!new.target) return new RealDate(now()).toString();
    return args.length ? new RealDate(...args) : new RealDate(now());
  }
  Object.setPrototypeOf(ShiftedDate, RealDate);
  ShiftedDate.prototype = RealDate.prototype;
  ShiftedDate.now = now;
  // Own properties too: some code copies Date's own properties, not its prototype chain.
  ShiftedDate.parse = RealDate.parse;
  ShiftedDate.UTC = RealDate.UTC;
  globalThis.Date = ShiftedDate;
}
