"use client";

import { useEffect, useRef } from "react";

type Source = { source: string; visitors: number; tickets: number };

const DURATION = 1400;
const STAGGER = 140;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * "Ticket clicks by source", as the organizer would see it: when the board
 * scrolls into view the bars grow and the counts run up, row by row. The
 * server renders the final numbers, so the board reads the same without
 * JavaScript or with reduced motion.
 */
export default function SourcesBoard({ sources }: { sources: Source[] }) {
  const ref = useRef<HTMLElement>(null);
  const most = Math.max(...sources.map((s) => s.visitors));

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only replay when the board is still below the fold; never blank a board someone is reading.
    if (el.getBoundingClientRect().top < innerHeight) return;
    const rows = [...el.querySelectorAll<HTMLElement>("tbody tr")];
    // Each row's bar and counts, drawn at p (0 to 1) of their final values.
    const draw = (i: number, p: number) => {
      const row = rows[i];
      const [bar, visitors, tickets] = ["[data-bar]", "[data-visitors]", "[data-tickets]"].map((q) => row.querySelector<HTMLElement>(q)!);
      bar.style.transform = `scaleX(${p})`;
      visitors.textContent = `${Math.round(sources[i].visitors * p)} visitors`;
      tickets.textContent = `${Math.round(sources[i].tickets * p)} tickets`;
    };
    sources.forEach((_, i) => draw(i, 0));
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = sources.map((_, i) => Math.min(1, Math.max(0, (now - start - i * STAGGER) / DURATION)));
          t.forEach((ti, i) => draw(i, ease(ti)));
          if (t.some((ti) => ti < 1)) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [sources]);

  return (
    <figure ref={ref} className="rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-night)] p-5 sm:p-7">
      <figcaption className="text-sm font-bold">Ticket clicks by source</figcaption>
      <table className="mt-5 w-full text-left text-sm">
        <thead className="sr-only">
          <tr>
            <th>Source</th>
            <th>Visitors</th>
            <th>Ticket clicks</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.source} className="border-t border-[var(--sl-line)] first:border-t-0">
              <td className="py-3 pr-3">
                <span className="block font-semibold">{s.source}</span>
                <span className="mt-2 block h-1.5 rounded-full bg-[var(--sl-line)]" aria-hidden="true">
                  <span data-bar className="block h-full origin-left rounded-full bg-[var(--sl-gold)]" style={{ width: `${(s.visitors / most) * 100}%` }} />
                </span>
              </td>
              <td data-visitors className="py-3 pr-3 text-right tabular-nums text-[var(--sl-muted)]">{s.visitors} visitors</td>
              <td data-tickets className="py-3 text-right font-bold tabular-nums text-[var(--sl-gold)]">{s.tickets} tickets</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
