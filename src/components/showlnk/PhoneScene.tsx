"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// The phone the link is drawn for: the scene lays out at this size, then
// scales to the frame.
const W = 390;
const H = 844;

/**
 * Big Love's real link, playing in the hero's phone: its opening scene as a
 * guest sees it, kept up to date with whatever they publish. A link inside
 * another page never counts as a visit (see reel-tracking). The still sits
 * underneath until the link has drawn, so the phone is never blank, and the
 * intro plays again each time the phone comes back into view.
 */
export default function PhoneScene({ src, still, alt }: { src: string; still: string; alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [ready, setReady] = useState(false);
  const [play, setPlay] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(el);
    let away = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Back in view after leaving it: run the scene from the top.
        if (entry.isIntersecting && away) {
          away = false;
          setReady(false);
          setPlay((n) => n + 1);
        } else if (!entry.isIntersecting) away = true;
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="relative overflow-hidden" style={{ aspectRatio: `${W} / ${H}` }}>
      <Image src={still} alt={alt} width={780} height={1688} sizes="(min-width: 1024px) 320px, 78vw" className="absolute inset-0 h-full w-full" />
      {scale > 0 && (
        <iframe
          key={play}
          src={src}
          title="Big Love Productions' link"
          aria-hidden="true"
          tabIndex={-1}
          loading="lazy"
          // Give the scene a beat to draw its first frame before it covers the still.
          onLoad={() => setTimeout(() => setReady(true), 250)}
          className="sl-phone-live pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width: W, height: H, transform: `scale(${scale})`, opacity: ready ? 1 : 0 }}
        />
      )}
    </div>
  );
}
