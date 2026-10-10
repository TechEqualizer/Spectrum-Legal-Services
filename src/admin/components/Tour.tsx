"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { endTour, goToStep, startTour, TOUR_STEPS, tourSeen, useTourStep } from "@/admin/tour";

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8; // Space around the lit-up element.
const GAP = 12; // Between the light and the card.
const EDGE = 16; // Screen margin.

/** The first element with this data-tour name that is actually on screen. */
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

const same = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

/** Where the card goes: below, above, right or left of the light, whichever fits first. */
function place(r: Box | null, card: { width: number; height: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
  if (!r) return { top: clamp((vh - card.height) / 2, EDGE, vh - card.height - EDGE), left: (vw - card.width) / 2 };
  const x = clamp(r.left + r.width / 2 - card.width / 2, EDGE, vw - card.width - EDGE);
  const y = clamp(r.top, EDGE, vh - card.height - EDGE);
  const below = r.top + r.height + PAD + GAP;
  const above = r.top - PAD - GAP - card.height;
  const right = r.left + r.width + PAD + GAP;
  const left = r.left - PAD - GAP - card.width;
  const options = [
    { ok: below + card.height <= vh - EDGE, top: below, left: x },
    { ok: above >= EDGE, top: above, left: x },
    { ok: right + card.width <= vw - EDGE, top: y, left: right },
    { ok: left >= EDGE, top: y, left },
  ];
  // A tall element (a whole column): beside it reads better than under it.
  if (r.height > vh / 2) options.push(...options.splice(0, 2));
  const fit = options.find((o) => o.ok);
  return fit ?? { top: vh - card.height - EDGE, left: x };
}

/**
 * The guided tour: dims the admin, lights up one real element at a time and
 * explains it in a small card with Back, Next and Skip, moving between pages
 * as it goes. Starts by itself the first time a client lands on Home, and
 * again from the account menu ("Take the tour") or a link with ?tour=1.
 */
export default function Tour({ canStart }: { canStart: boolean }) {
  const n = useTourStep();
  const pathname = usePathname();
  const router = useRouter();
  const id = useId();
  const [target, setTarget] = useState<{ step: number; el: HTMLElement | null } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [cardSize, setCardSize] = useState({ width: 352, height: 200 });
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = n === null ? null : TOUR_STEPS[n];

  // First visit to Home (or a link with ?tour=1): start. Not just after
  // claiming a link (?welcome=): the welcome comes first, and offers the tour.
  useEffect(() => {
    if (!canStart) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tour") === "1") {
      url.searchParams.delete("tour");
      window.history.replaceState(window.history.state, "", url);
      startTour();
    } else if (pathname === "/admin/home" && !tourSeen() && !url.searchParams.has("welcome")) {
      startTour();
    }
    // Once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStart]);

  // On the step's page: find its element (pages can take a moment to show it), else go there.
  useEffect(() => {
    if (n === null || !step) return;
    if (pathname !== step.path) {
      router.push(step.path);
      return;
    }
    if (!step.target) {
      setTarget({ step: n, el: null });
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = Date.now();
    let timer = 0;
    const look = () => {
      const el = findTarget(step.target!);
      if (el || Date.now() - started > 3000) {
        // A tall section shows its top (its heading), the rest are centered.
        const tall = el ? el.getBoundingClientRect().height > window.innerHeight * 0.4 : false;
        el?.scrollIntoView({ block: tall ? "start" : "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
        setTarget({ step: n, el });
      } else timer = window.setTimeout(look, 100);
    };
    look();
    return () => window.clearTimeout(timer);
  }, [n, step, pathname, router]);

  const ready = target !== null && target.step === n && step !== null && pathname === step.path;
  const el = ready ? target.el : null;

  // Follow the element as the page scrolls or resizes.
  useEffect(() => {
    if (!el) {
      setBox(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const b = { top: r.top, left: r.left, width: r.width, height: r.height };
      setBox((prev) => (same(prev, b) ? prev : b));
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [el]);

  // The card's size, to place it (its text changes with each step).
  const open = n !== null;
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const measure = () => {
      const { offsetWidth: width, offsetHeight: height } = el;
      setCardSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [open]);

  // Each step: focus Next, so Enter moves on and a screen reader reads the card.
  useEffect(() => {
    if (ready) next.current?.focus({ preventScroll: true });
  }, [ready, n]);

  // Escape skips; arrows move; Tab stays in the card.
  useEffect(() => {
    if (n === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        endTour();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (n < TOUR_STEPS.length - 1) goToStep(n + 1);
        else endTour();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (n > 0) goToStep(n - 1);
      } else if (e.key === "Tab" && card.current) {
        const items = [...card.current.querySelectorAll<HTMLElement>("button")];
        const i = items.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [n]);

  if (n === null || !step) return null;

  const last = n === TOUR_STEPS.length - 1;
  const lit = ready && box;
  const pos = ready ? place(lit ? box : null, cardSize) : null;

  return (
    <div className="fixed inset-0 z-[100]" data-testid="tour">
      {/* Clicks outside the card do nothing while the tour is on. */}
      <div className={`absolute inset-0 ${lit ? "" : "bg-deep-navy/60"}`} aria-hidden="true" />
      {lit && (
        <div
          aria-hidden="true"
          data-testid="tour-light"
          className="pointer-events-none fixed rounded-xl ring-2 ring-teal-accent"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgb(11 18 38 / 0.6)",
          }}
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className={`fixed w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 text-charcoal shadow-2xl ring-1 ring-black/10 ${pos ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }}
      >
        {/* New each step (and once it's placed), so each card fades in. */}
        <div key={`${n}-${pos ? "on" : "off"}`} className="animate-tour-in">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
            {n === 0 ? "Quick tour" : `Step ${n} of ${TOUR_STEPS.length - 1}`}
          </p>
          <h2 id={`${id}-title`} className="mt-1 text-lg font-bold leading-snug text-deep-navy">
            {step.title}
          </h2>
          <p id={`${id}-body`} className="mt-1.5 text-sm leading-relaxed text-gray-700">
            {step.body}
          </p>
          <div className="mt-4 flex items-center gap-1" aria-hidden="true">
            {TOUR_STEPS.slice(1).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${i + 1 === n ? "w-4 bg-deep-navy" : i + 1 < n ? "w-1.5 bg-deep-navy/50" : "w-1.5 bg-gray-300"}`} />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            {!last && (
              <button type="button" onClick={endTour} className="mr-auto min-h-11 rounded-lg px-2 text-sm font-semibold text-gray-600 hover:text-deep-navy">
                {n === 0 ? "Not now" : "Skip tour"}
              </button>
            )}
            {last && <span className="mr-auto" />}
            {n > 0 && (
              <button
                type="button"
                onClick={() => goToStep(n - 1)}
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
              >
                Back
              </button>
            )}
            <button
              ref={next}
              type="button"
              onClick={() => (last ? endTour() : goToStep(n + 1))}
              className="min-h-11 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue"
            >
              {n === 0 ? "Start the tour" : last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
