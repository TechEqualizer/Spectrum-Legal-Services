import Image from "next/image";

// Big Love Productions' Masquerade on the Runway, as Showlnk tells it: one
// flyer, four reels, each answering what a guest asks before they buy. The
// titles and pictures are theirs, as published on their link; the reels
// with no footage yet are drawn from the flyer, as their link draws them.

const FLYER = "/clients/masquerade/flyer.jpg";

const REELS = [
  {
    act: "Opening scene",
    question: "What is this night?",
    line: "Title, date and Tickets over the flyer: the first look, in the night's own colors and type.",
    title: "Masquerade on the Runway",
    src: FLYER,
    alt: "The Masquerade on the Runway flyer, sharp over a blurred copy of itself",
    poster: true,
  },
  {
    act: "The Night",
    question: "Will this be amazing?",
    line: "Desire: who they get to be that night, cut from the best moments.",
    title: "Haute couture Halloween looks",
    src: "/clients/masquerade/runway.jpg",
    alt: "A model on the runway in a gown under chandeliers",
  },
  {
    act: "Your People",
    question: "Is this for someone like me?",
    line: "Belonging: the crowd, the dress code, the vibe. Real nights only, no invented reviews.",
    title: "Masks on. Secrets revealed.",
    src: "/clients/masquerade/masks-on.jpg",
    alt: "A guest in a black lace masquerade mask",
  },
  {
    act: "Last Call",
    question: "Why buy now?",
    line: "The true reason to act: the date, the last tickets. Never fake scarcity.",
    title: "Limited tickets. Arrive early.",
    src: FLYER,
    alt: "",
    lastCall: true,
  },
] as const;

export default function ReelStrip() {
  return (
    <ol role="list" aria-label="Big Love's four reels" className="sl-reels">
      {REELS.map((r, i) => (
        <li key={r.act} className="sl-reveal sl-reel-item" style={{ "--i": i } as React.CSSProperties}>
          <figure>
            <div className="sl-reel">
              <div className="sl-bars" aria-hidden="true">
                {REELS.map((_, n) => (
                  <span key={n} {...(n <= i ? { "data-on": "" } : {})} />
                ))}
              </div>
              {"poster" in r ? (
                <>
                  <Image src={r.src} alt="" fill sizes="(min-width: 1024px) 260px, 62vw" className="scale-125 object-cover opacity-50 blur-xl" />
                  <Image src={r.src} alt={r.alt} fill sizes="(min-width: 1024px) 260px, 62vw" className="object-contain px-3 pb-24 pt-8" />
                </>
              ) : "lastCall" in r ? (
                <>
                  <Image src={r.src} alt="" fill sizes="(min-width: 1024px) 260px, 62vw" className="scale-125 object-cover opacity-40 blur-md" />
                  <div className="absolute inset-x-0 top-[24%] flex flex-col items-center gap-2 px-3 text-center">
                    <span className="sl-display text-[clamp(2.6rem,9vw,3.6rem)] text-[var(--sl-gold)]">Oct 31</span>
                    <span className="rounded-full bg-[var(--sl-gold)] px-3.5 py-1.5 text-xs font-bold leading-none text-[var(--sl-ink)]">Tickets</span>
                  </div>
                </>
              ) : (
                <Image src={r.src} alt={r.alt} fill sizes="(min-width: 1024px) 260px, 62vw" className="object-cover" />
              )}
              <div className="sl-reel-label">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--sl-gold)]">{r.act}</p>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-white">{r.title}</p>
              </div>
            </div>
            <figcaption className="mt-4">
              <h3 className="sl-display text-[1.65rem] leading-none">&ldquo;{r.question}&rdquo;</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--sl-muted)]">{r.line}</p>
            </figcaption>
          </figure>
        </li>
      ))}
    </ol>
  );
}
