"use client";

import { useEffect, useState } from "react";

/** Phones: "Get on the list" stays in thumb reach until a stub is on screen. */
export default function Dock() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const stubs = [...document.querySelectorAll("form.sl-stub")];
    if (!stubs.length) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      setHidden(seen.size > 0);
    }, { threshold: 0.25 });
    stubs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  return (
    <div
      className="sl-dock fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] lg:hidden"
      {...(hidden ? { "data-hidden": "" } : {})}
    >
      <a
        href="#join"
        tabIndex={hidden ? -1 : undefined}
        className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-[var(--sl-gold)] text-[17px] font-extrabold text-[var(--sl-ink)] shadow-[0_16px_32px_-8px_rgb(0_0_0/0.8)]"
      >
        Get on the list
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </div>
  );
}
