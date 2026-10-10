"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { shrink } from "@/lib/flyer-file";
import ReelsStep from "@/components/start/ReelsStep";
import type { StartState } from "@/components/start/StartPreview";
import type { FunnelDraft } from "@/lib/funnel-draft";
import { draftLink, nightName, ROLES, type StartDraft } from "@/lib/start-draft";
import type { ImportedDate } from "@/lib/server/flyer-import";
import type { Look } from "@/lib/look";

// The phone the link is drawn for: the preview lays out at this size, then scales to the frame.
const W = 390;
const H = 844;

const STEPS = ["Your flyer", "Your reels", "Your link"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "Sat, Oct 31 · 8 PM", from the flyer's own date and time. */
function when(d: ImportedDate) {
  const [y, m, day] = d.date.split("-").map(Number);
  const date = new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (!d.time) return date;
  const [h, min] = d.time.split(":").map(Number);
  const time = new Date(2000, 0, 1, h, min).toLocaleTimeString(undefined, { hour: "numeric", minute: min ? "2-digit" : undefined });
  return `${date} · ${time}`;
}

/** Each JSON line of a streamed answer, as it arrives. */
async function eachLine(res: Response, onLine: (line: Record<string, unknown>) => void) {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = done ? "" : lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onLine(JSON.parse(line));
      } catch {
        // A cut-off line: whatever came before it still counts.
      }
    }
    if (done) return;
  }
}

// The draft lives in this browser (localStorage) until the link is claimed:
// a small store over it, so the page reads it without a flash and every
// change saves.
const storageKey = (code: string) => `showlnk-start-${code.slice(0, 12)}`;
const listeners = new Set<() => void>();
let memory: Record<string, string> = {};
function readRaw(key: string): string {
  try {
    return localStorage.getItem(key) ?? memory[key] ?? "{}";
  } catch {
    return memory[key] ?? "{}";
  }
}
function writeRaw(key: string, value: string) {
  memory = { ...memory, [key]: value };
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked: the draft lives for this visit only.
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const parse = (raw: string | null): StartDraft | null => {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as StartDraft;
  } catch {
    return {};
  }
};

/**
 * The sign-up wizard (docs/plans/05-signup.md). Three steps, the phone
 * beside them playing the link as it's made. Step 1 here: the flyer and
 * what they run. The draft stays in this browser until the link is claimed.
 */
export default function Wizard({ invite, readsLeft: initialReads }: { invite: string; readsLeft: number }) {
  const id = useId();
  const key = storageKey(invite);
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  // Null until the browser has read the saved draft (and on the server).
  const saved = useMemo(() => parse(raw), [raw]);
  const draft: StartDraft = saved ?? {};
  const loaded = saved !== null;
  const [step, setStep] = useState(0);
  const [reading, setReading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [readsLeft, setReadsLeft] = useState(initialReads);
  const [dragging, setDragging] = useState(false);
  // The reels are being written (after the flyer is read, in the same answer).
  const [drafting, setDrafting] = useState(false);
  // Start the phone over, at a reel when given.
  const [replay, setReplay] = useState<{ n: number; reelId?: string }>({ n: 0 });
  const show = (reel?: string) => setReplay((r) => ({ n: r.n + 1, reelId: reel }));
  const attempt = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  // Every change saves, so coming back to the invite carries on where they left off.
  const update = useCallback((change: Partial<StartDraft>) => writeRaw(key, JSON.stringify({ ...parse(readRaw(key)), ...change })), [key]);

  const read = async (file: File) => {
    setError("");
    if (!/^image\//.test(file.type) && file.type !== "application/pdf") return setError("Use a photo of the flyer (JPG or PNG) or a PDF.");
    if (readsLeft <= 0) return setError("This invite has read 5 flyers, its limit. Ask Showlnk if you need more.");
    let sent: { type: string; data: string };
    try {
      sent = await shrink(file);
    } catch (e) {
      return setError(e instanceof Error ? e.message : "That file can't be read.");
    }
    const picture = sent.type === "application/pdf" ? undefined : `data:${sent.type};base64,${sent.data}`;
    setReading(picture ?? "");
    // Small screens: bring the phone into view, where the night appears.
    if (window.matchMedia("(max-width: 1023px)").matches) phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const mine = ++attempt.current;
    setDrafting(false);
    const res = await fetch("/api/start/flyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite, type: sent.type, data: sent.data, today: today() }),
    }).catch(() => null);
    if (!res?.ok) {
      setReading(null);
      const out = (await res?.json().catch(() => null)) as { error?: string } | null;
      return setError(out?.error ?? "Couldn't reach Showlnk. Check your connection and try again.");
    }
    // First what the flyer says, then (a while later) the reels drafted from it.
    let answered = false;
    await eachLine(res, (line) => {
      if (mine !== attempt.current) return; // A newer flyer took over.
      if (typeof line.error === "string") {
        answered = true;
        setReading(null);
        return setError(line.error);
      }
      const read = line.read as { dates?: ImportedDate[]; look?: Look } | undefined;
      if (read?.dates) {
        answered = true;
        setReading(null);
        setReadsLeft((n) => n - 1);
        if (!read.dates.length) return setError("We couldn't find a date on that flyer. Try a clearer photo, or the one with the date on it.");
        update({ flyer: picture, dates: read.dates, look: read.look, reels: undefined, reelsFailed: undefined });
        return setDrafting(true);
      }
      if (line.draft) {
        setDrafting(false);
        return update({ reels: line.draft as FunnelDraft, reelsFailed: undefined });
      }
      if (typeof line.draftError === "string") {
        setDrafting(false);
        update({ reelsFailed: true });
      }
    }).catch(() => {});
    if (mine !== attempt.current) return;
    setDrafting(false);
    if (!answered) {
      setReading(null);
      setError("Couldn't reach Showlnk. Check your connection and try again.");
    }
  };

  const found = draft.dates?.[0];
  const canContinue = Boolean(found && draft.role);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16 lg:pt-10">
      <div className="min-w-0">
        <ol aria-label="Steps" className="grid grid-cols-3 gap-2">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <span className={`block h-1.5 rounded-full ${i <= step ? "bg-[var(--sl-gold)]" : "bg-[var(--sl-line)]"}`} />
              <span className={`mt-2 block text-xs font-semibold ${i === step ? "text-[var(--sl-text)]" : "text-[var(--sl-muted)]"}`}>{label}</span>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <section aria-labelledby={`${id}-title`} className="mt-10">
            <p className="text-sm font-semibold text-[var(--sl-gold)]">Step 1 of 3</p>
            <h1 id={`${id}-title`} className="sl-display mt-2 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.92]">
              Drop your flyer.
            </h1>
            <p className="mt-4 max-w-[34rem] text-lg text-[var(--sl-text)]/80">
              We&apos;ll read it and build your night&apos;s link, live, on the phone <span className="lg:hidden">below</span>
              <span className="hidden lg:inline">beside you</span>. No account yet.
            </p>

            <fieldset className="mt-9">
              <legend className="text-sm font-semibold text-[var(--sl-text)]">What do you run?</legend>
              <div role="radiogroup" aria-label="What do you run?" className="mt-3 flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={draft.role === r}
                    onClick={() => update({ role: r })}
                    className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${
                      draft.role === r
                        ? "border-[var(--sl-gold)] bg-[var(--sl-gold)] text-[var(--sl-ink)]"
                        : "border-[var(--sl-line)] text-[var(--sl-text)] hover:border-[var(--sl-gold)]/70"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-8">
              <input
                ref={fileRef}
                id={`${id}-file`}
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) read(file);
                }}
              />
              {reading !== null ? (
                <div role="status" className="flex items-center gap-4 rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night-2)] p-5">
                  <span aria-hidden="true" className="start-spinner size-6 shrink-0 rounded-full border-2 border-[var(--sl-gold)]/30 border-t-[var(--sl-gold)]" />
                  <div>
                    <p className="font-semibold text-[var(--sl-text)]">Reading your flyer…</p>
                    <p className="text-sm text-[var(--sl-muted)]">The name, the date, the venue, and your colors.</p>
                  </div>
                </div>
              ) : found ? (
                <div className="rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night-2)] p-5 sm:p-6">
                  <p className="text-sm font-semibold text-[var(--sl-gold)]">From your flyer</p>
                  <p className="sl-display mt-2 text-3xl leading-none">{found.name || "Your night"}</p>
                  <dl className="mt-4 grid gap-1.5 text-[var(--sl-text)]/85">
                    <div className="flex gap-2">
                      <dt className="sr-only">When</dt>
                      <dd>{when(found)}</dd>
                    </div>
                    {found.venue && (
                      <div className="flex gap-2">
                        <dt className="sr-only">Where</dt>
                        <dd>{found.venue}</dd>
                      </div>
                    )}
                    {found.price && (
                      <div className="flex gap-2">
                        <dt className="sr-only">Price</dt>
                        <dd>{found.price}</dd>
                      </div>
                    )}
                  </dl>
                  {(draft.dates?.length ?? 0) > 1 && (
                    <p className="mt-2 text-sm text-[var(--sl-muted)]">And {draft.dates!.length - 1} more {draft.dates!.length === 2 ? "date" : "dates"} from the flyer.</p>
                  )}
                  <p className="mt-4 text-sm text-[var(--sl-muted)]">Anything off? You can change it all once your link is yours.</p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-3 min-h-11 text-sm font-semibold text-[var(--sl-gold)] underline underline-offset-4"
                  >
                    Use a different flyer
                  </button>
                </div>
              ) : (
                <label
                  htmlFor={`${id}-file`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) read(file);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
                    dragging ? "border-[var(--sl-gold)] bg-[var(--sl-gold)]/10" : "border-[var(--sl-gold)]/45 hover:border-[var(--sl-gold)] hover:bg-[var(--sl-gold)]/5"
                  }`}
                >
                  <span className="inline-flex min-h-12 items-center rounded-full bg-[var(--sl-gold)] px-7 text-base font-bold text-[var(--sl-ink)]">Choose your flyer</span>
                  <span className="mt-3 text-sm text-[var(--sl-muted)]">or drop it here · a photo or a PDF</span>
                </label>
              )}
              {error && (
                <p role="alert" className="mt-3 text-sm font-semibold text-[#ff9b8a]">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep(1)}
                className="inline-flex min-h-12 items-center rounded-full bg-[var(--sl-gold)] px-8 text-base font-bold text-[var(--sl-ink)] hover:bg-[var(--sl-gold-deep)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
              {!canContinue && loaded && (
                <p className="text-sm text-[var(--sl-muted)]">{!found ? "Add your flyer to continue." : "Pick what you run to continue."}</p>
              )}
            </div>
          </section>
        ) : step === 1 ? (
          <ReelsStep
            draft={draft}
            drafting={drafting}
            onChange={(reels) => update({ reels })}
            onShow={(reel) => {
              show(reel);
              if (window.matchMedia("(max-width: 1023px)").matches) phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        ) : (
          <section aria-labelledby={`${id}-claim`} className="mt-10">
            <p className="text-sm font-semibold text-[var(--sl-gold)]">Step 3 of 3</p>
            <h1 id={`${id}-claim`} className="sl-display mt-2 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.92]">
              Claim your link.
            </h1>
            <p className="mt-4 max-w-[34rem] text-lg text-[var(--sl-text)]/80">
              Your link for {nightName(draft)}, with your email and a password. This part is on its way.
            </p>
            <button type="button" onClick={() => setStep(1)} className="mt-8 min-h-11 text-sm font-semibold text-[var(--sl-gold)] underline underline-offset-4">
              Back to your reels
            </button>
          </section>
        )}
      </div>

      <div ref={phoneRef} className="mx-auto w-full max-w-[300px] lg:sticky lg:top-8 lg:max-w-none lg:self-start">
        <Phone draft={draft} reading={reading} core={step > 0} replay={replay} />
        <p className="mt-4 text-center text-sm text-[var(--sl-muted)]">
          {found ? "Your link, as fans will see it. Tap around." : "Your link, live. It fills in from your flyer."}
        </p>
      </div>
    </div>
  );
}

/** The phone: the real link player in a frame, sent the draft whenever it changes. While a flyer is read, the flyer itself, being scanned. */
function Phone({
  draft,
  reading,
  core,
  replay,
}: {
  draft: StartDraft;
  reading: string | null;
  /** Past step 1: the drafted reels and Core's features. */
  core: boolean;
  /** Bumped to start the phone over, at a reel when given. */
  replay: { n: number; reelId?: string };
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(el);
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "start:ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => {
      ro.disconnect();
      window.removeEventListener("message", onMessage);
    };
  }, []);

  // A new flyer, look, set of reels or step starts the link over, so the change is seen; typed words change in place.
  const scene = [draft.flyer?.length, JSON.stringify(draft.look), JSON.stringify(draft.dates), core && Boolean(draft.reels), core].join("|");
  const shown = useRef({ scene: "", n: 0 });

  useEffect(() => {
    if (!ready) return;
    const again = shown.current.scene !== scene || shown.current.n !== replay.n;
    const startReelId = shown.current.n !== replay.n ? replay.reelId : undefined;
    shown.current = { scene, n: replay.n };
    const message: StartState = {
      type: "start:state",
      ...draftLink(draft, { core }),
      ...(core ? { follow: { organizer: "your-night", name: nightName(draft) } } : {}),
      replay: again,
      ...(startReelId ? { startReelId } : {}),
    };
    frame.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [ready, draft, core, scene, replay]);

  return (
    <div className="sl-phone">
      <div className="sl-phone-screen">
        <div ref={box} className="relative overflow-hidden" style={{ aspectRatio: `${W} / ${H - 30}` }}>
          {scale > 0 && (
            <iframe
              ref={frame}
              src="/start/preview"
              title="Your link, as fans will see it"
              tabIndex={-1}
              className="absolute left-0 top-0 origin-top-left border-0"
              style={{ width: W, height: H - 30, transform: `scale(${scale})` }}
            />
          )}
          {reading !== null && (
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#0b0710]">
              {reading ? (
                // eslint-disable-next-line @next/next/no-img-element -- the flyer just chosen, as a data URL
                <img src={reading} alt="" className="absolute inset-0 h-full w-full object-contain" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(232_190_90/0.18),transparent_60%)]" />
              )}
              <div className="start-scan absolute inset-x-0 h-24" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

