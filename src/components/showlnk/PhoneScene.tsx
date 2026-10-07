"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// The phone the link is drawn for: the scene lays out at this size, then
// scales to the frame.
const W = 390;
const H = 844;
// The opening scene's own fade-in, so the still holds until it has drawn.
const SCENE_FADE = 1400;
// How long the phone must be out of view before its intro plays again.
const REPLAY_AFTER = 20_000;

/**
 * Big Love's real link, playing in the hero's phone: its opening scene as a
 * guest sees it, kept up to date with whatever they publish. A link inside
 * another page never counts as a visit (see reel-tracking). The still sits
 * underneath until the link has drawn (and stays if it can't), so the phone
 * is never blank, and the intro plays again when the phone comes back after
 * a while away.
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
    let leftAt = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Back in view after a while away: run the scene from the top. A quick
        // scroll past doesn't restart it, so it never flickers mid-read.
        if (!entry.isIntersecting) leftAt = Date.now();
        else if (leftAt && Date.now() - leftAt > REPLAY_AFTER) {
          leftAt = 0;
          setReady(false);
          setPlay((n) => n + 1);
        }
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
      <Image src={still} alt={alt} width={780} height={1688} sizes="(min-width: 1024px) 320px, 78vw" loading="eager" className="absolute inset-0 h-full w-full" />
      {scale > 0 && (
        <iframe
          key={play}
          src={src}
          title="Big Love Productions' link"
          aria-hidden="true"
          tabIndex={-1}
          loading="lazy"
          // Cover the still only once the scene has faded in, and never with an
          // error page: if the link didn't load, the still stays.
          onLoad={(e) => {
            const doc = e.currentTarget.contentDocument;
            if (!doc || /not found|error/i.test(doc.title) || !doc.querySelector("main")) return;
            setTimeout(() => setReady(true), SCENE_FADE);
          }}
          className="sl-phone-live pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width: W, height: H, transform: `scale(${scale})`, opacity: ready ? 1 : 0 }}
        />
      )}
    </div>
  );
}
