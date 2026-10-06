import Image from "next/image";

// The four things a flyer becomes, fanned like reels in a hand: the opening
// scene and the three core reels. Built from a real Showlnk event (Big Love
// Productions' Masquerade on the Runway); one reel "plays" at a time.

const REELS = [
  { label: "Opening scene", line: "What people see first", src: "/clients/masquerade/flyer.jpg", alt: "The Masquerade on the Runway flyer as the opening scene" },
  { label: "The Night", line: "Will this be amazing?", src: "/clients/masquerade/runway.jpg", alt: "A model on the runway in a gown under chandeliers" },
  { label: "Your People", line: "Is this for someone like me?", src: "/clients/masquerade/masks-on.jpg", alt: "A guest in a black lace masquerade mask" },
] as const;

export default function ReelFan({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      <div className="sl-fan" role="img" aria-label="One flyer, four reels: the opening scene, The Night, Your People and Last Call">
        {REELS.map((r, i) => (
          <div key={r.label} className="sl-card" aria-hidden="true">
            <Bars on={i} />
            <Image src={r.src} alt="" fill sizes="(min-width: 1024px) 200px, 30vw" className="object-cover" priority={i === 0} />
            <Label title={r.label} line={r.line} />
          </div>
        ))}
        {/* Last Call: words over the night, from true facts only. */}
        <div className="sl-card" aria-hidden="true">
          <Bars on={3} />
          <Image src="/clients/masquerade/flyer.jpg" alt="" fill sizes="(min-width: 1024px) 200px, 30vw" className="scale-125 object-cover opacity-40 blur-md" />
          {/* The true deadline: the night itself. */}
          <div className="absolute inset-x-0 top-[22%] flex flex-col items-center gap-1.5 px-2 text-center">
            <span className="sl-display text-[clamp(1.9rem,5vw,3.4rem)] text-[var(--sl-gold)]">Oct 31</span>
            <span className="whitespace-nowrap rounded-full bg-[var(--sl-gold)] px-2.5 py-1 text-[11px] font-bold leading-none text-[var(--sl-ink)]">Tickets</span>
          </div>
          <Label title="Last Call" line="Why buy now?" />
        </div>
      </div>
      <figcaption className="mt-1 text-center text-xs text-[var(--sl-muted)] lg:mt-0">
        Made from Big Love Productions&apos; flyer for Masquerade on the Runway.
      </figcaption>
    </figure>
  );
}

function Bars({ on }: { on: number }) {
  return (
    <div className="sl-bars">
      {[0, 1, 2, 3].map((n) => (
        <span key={n} {...(n <= on ? { "data-on": "" } : {})} />
      ))}
    </div>
  );
}

function Label({ title, line }: { title: string; line: string }) {
  return (
    <div className="sl-card-label">
      <p className="sl-display text-[clamp(0.95rem,1.9vw,1.4rem)] leading-none text-white">{title}</p>
      <p className="mt-1 text-[11px] font-medium leading-tight text-[var(--sl-text)]/85">{line}</p>
    </div>
  );
}
