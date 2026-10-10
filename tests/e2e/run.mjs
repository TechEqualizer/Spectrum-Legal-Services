// End-to-end tests: builds the app against stand-ins for Supabase, the
// Claude API and Eventbrite (tests/e2e/mocks), starts it on port 3002, signs in a test
// admin, and runs each suite in a real browser (Playwright's Chromium).
//
//   npm run test:e2e                  every suite
//   npm run test:e2e -- draft path    only these suites
//   npm run test:e2e -- --no-build    reuse the last test build
//
// Suites print one "PASS  name" or "FAIL  name" line per check. Screenshots
// and the sign-in state go to tests/e2e/.out (not committed).

import { spawn } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const out = join(here, ".out");
const APP = "http://localhost:3002";
const SUPABASE = "http://localhost:54321";
const CLAUDE = "http://localhost:54400";
const EVENTBRITE = "http://localhost:54600";
const RESEND = "http://localhost:54700";

const args = process.argv.slice(2);
const build = !args.includes("--no-build");
const all = readdirSync(join(here, "suites")).filter((f) => f.endsWith(".mjs")).map((f) => f.replace(/\.mjs$/, "")).sort();
const asked = args.filter((a) => !a.startsWith("--"));
const unknown = asked.filter((s) => !all.includes(s));
if (unknown.length) {
  console.error(`Unknown suite: ${unknown.join(", ")}. Suites: ${all.join(", ")}`);
  process.exit(2);
}
const suites = asked.length ? asked : all;

// The app reads these: Supabase and Claude go to the mocks, never the real services.
const env = {
  ...process.env,
  SUPABASE_URL: SUPABASE,
  SUPABASE_PUBLISHABLE_KEY: "test",
  ANTHROPIC_API_KEY: "test-key",
  ANTHROPIC_BASE_URL: CLAUDE,
  NEXT_TELEMETRY_DISABLED: "1",
};
for (const key of ["RESEND_API_KEY", "LEAD_NOTIFY_EMAIL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "EVENTBRITE_CLIENT_ID", "EVENTBRITE_CLIENT_SECRET", "EVENTBRITE_TOKEN_KEY", "EVENTBRITE_OAUTH_BASE", "EVENTBRITE_API_BASE", "RESEND_API_BASE", "FAN_COOKIE_SECRET", "FAN_FROM_EMAIL", "SHOWLNK_POSTAL_ADDRESS", "SHOWLNK_CONTACT_EMAIL", "FOLLOW_ORGANIZERS"]) delete env[key];
// The mock's own secret key, for Send login (Settings → Accounts) only.
env.SUPABASE_SECRET_KEY = "test-secret";
// Eventbrite goes to its mock: OAuth and the API, with a test app and token key.
env.EVENTBRITE_CLIENT_ID = "test-eb-client";
env.EVENTBRITE_CLIENT_SECRET = "test-eb-secret";
env.EVENTBRITE_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
env.EVENTBRITE_OAUTH_BASE = EVENTBRITE;
// Fans: sign-in emails go to the mock Resend, which keeps them for the suites.
env.RESEND_API_KEY = "test-resend";
env.RESEND_API_BASE = RESEND;
env.FAN_COOKIE_SECRET = "test-fan-cookie-secret";
env.SHOWLNK_POSTAL_ADDRESS = "1 Test Street, Detroit, MI 48201";
// Follow is on only for the fan suites' own test organizers: Big Love's (and
// Golden Hour's) links keep "Updates" and "Text me", as in production for now.
env.FOLLOW_ORGANIZERS = "gh-follow,gh-reels";
// The calendar every process in the run sees (shift-time.cjs), so tests
// written around Big Love's Oct 31 night don't depend on today's date.
// E2E_NOW sets another moment, e.g. to try a run after the night.
const TEST_NOW = process.env.E2E_NOW ?? "2026-10-07T16:00:00Z";
env.E2E_TIME_OFFSET_MS = String(Date.parse(TEST_NOW) - Date.now());
env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ""} --require ${join(here, "shift-time.cjs")}`.trim();
// The suites themselves keep the real clock: Playwright works out cookie
// expiry times there, and the browser keeps cookies by the real clock.
// Pages are shifted inside the browser instead (browser.mjs).
const suiteEnv = { ...env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "" };
env.EVENTBRITE_API_BASE = `${EVENTBRITE}/v3`;

const children = [];
const start = (cmd, cmdArgs, opts = {}) => {
  const child = spawn(cmd, cmdArgs, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"], detached: true, ...opts });
  children.push(child);
  return child;
};
const stopAll = () => {
  for (const c of children) {
    try {
      process.kill(-c.pid);
    } catch {}
  }
};
process.on("exit", stopAll);
process.on("SIGINT", () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));

const run = (cmd, cmdArgs, opts = {}) =>
  new Promise((done) => {
    const child = spawn(cmd, cmdArgs, { cwd: root, env, ...opts });
    let output = "";
    child.stdout?.on("data", (d) => (output += d));
    child.stderr?.on("data", (d) => (output += d));
    child.on("close", (code) => done({ code, output }));
  });

async function waitFor(url, what, ms = 60000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await fetch(url).then(() => true, () => false)) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`${what} didn't start (${url})`);
}

// Something already on these ports (an earlier run, a dev server) would answer instead.
for (const [url, what] of [[APP, "port 3002"], [SUPABASE, "port 54321"], [CLAUDE, "port 54400"], [EVENTBRITE, "port 54600"], [RESEND, "port 54700"], ["http://localhost:3003", "port 3003"]]) {
  if (await fetch(url).then(() => true, () => false)) {
    console.error(`Something is already running on ${what}. Stop it, then run the tests again.`);
    process.exit(2);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, "fixtures"), out, { recursive: true });

console.log("Starting the mock Supabase, Claude, Eventbrite and Resend servers...");
start("node", [join(here, "mocks/supabase.mjs")]);
start("node", [join(here, "mocks/claude.mjs")]);
start("node", [join(here, "mocks/eventbrite.mjs")]);
start("node", [join(here, "mocks/resend.mjs")]);
await waitFor(`${SUPABASE}/__state`, "Mock Supabase");
await waitFor(`${CLAUDE}/__last`, "Mock Claude");
await waitFor(`${EVENTBRITE}/__state`, "Mock Eventbrite");
await waitFor(`${RESEND}/__emails`, "Mock Resend");

// The app's data cache from an earlier run would serve that run's events
// and publications, so every run starts without it (built or not).
rmSync(join(root, ".next/cache/fetch-cache"), { recursive: true, force: true });

if (build) {
  console.log("Building the app against the mocks...");
  // Turbopack's build cache has served a stale stylesheet after CSS edits.
  rmSync(join(root, ".next/cache/turbopack"), { recursive: true, force: true });
  const b = await run("npx", ["next", "build"], { stdio: ["ignore", "pipe", "pipe"] });
  if (b.code !== 0) {
    console.error(b.output);
    process.exit(1);
  }
}

console.log("Starting the app on port 3002...");
const app = start("npx", ["next", "start", "-p", "3002"]);
let appLog = "";
app.stdout.on("data", (d) => (appLog += d));
app.stderr.on("data", (d) => (appLog += d));
await waitFor(APP, "The app");

const auth = await run("node", [join(here, "auth.mjs"), out], { env: suiteEnv });
if (!/login 200/.test(auth.output)) {
  console.error("Test sign-in failed:\n" + auth.output);
  process.exit(1);
}

const results = [];
for (const suite of suites) {
  // Each suite starts from nothing published, with the Claude mock answering several dates.
  await fetch(`${SUPABASE}/__reset`, { method: "POST" });
  await fetch(`${CLAUDE}/__mode`, { method: "POST", body: "multi" });
  await fetch(`${EVENTBRITE}/__reset`, { method: "POST" });
  await fetch(`${RESEND}/__reset`, { method: "POST" });
  const started = Date.now();
  const r = await run("node", [join(here, "suites", `${suite}.mjs`), out], { cwd: out, env: suiteEnv });
  const lines = r.output.split("\n");
  const pass = lines.filter((l) => l.startsWith("PASS")).length;
  const fails = lines.filter((l) => l.startsWith("FAIL"));
  const crashed = r.code !== 0;
  results.push({ suite, pass, fail: fails.length, crashed });
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`${crashed || fails.length ? "✗" : "✓"} ${suite.padEnd(14)} ${pass} passed${fails.length ? `, ${fails.length} failed` : ""}${crashed ? ", crashed" : ""} (${secs}s)`);
  for (const f of fails) console.log(`    ${f}`);
  if (crashed) console.log(r.output.split("\n").slice(-15).map((l) => `    ${l}`).join("\n"));
  writeFileSync(join(out, `${suite}.log`), r.output);
}

const passed = results.reduce((n, r) => n + r.pass, 0);
const failed = results.reduce((n, r) => n + r.fail, 0);
const crashed = results.filter((r) => r.crashed).map((r) => r.suite);
console.log(`\n${passed} checks passed, ${failed} failed${crashed.length ? `; crashed: ${crashed.join(", ")}` : ""}. Logs and screenshots: tests/e2e/.out`);
if (failed || crashed.length) writeFileSync(join(out, "app.log"), appLog);
// Exiting stops the app and the mocks (their open pipes would keep this running).
process.exit(failed || crashed.length ? 1 : 0);
