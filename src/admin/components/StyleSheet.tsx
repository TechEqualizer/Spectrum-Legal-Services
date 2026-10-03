"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { HeroMediaEdit } from "@/admin/drafts";
import { wordmarkFont } from "@/components/BrandLogo";
import { titleFontClass } from "@/components/lookFonts";
import type { Funnel, FunnelTheme, ReelMedia } from "@/data/funnel-types";
import {
  composeColors,
  LOOK_FONT_IDS,
  LOOK_FONTS,
  LOOK_ROLES,
  onAccent,
  shuffleColors,
  wasAdjusted,
  type Look,
  type LookColors,
  type LookFont,
} from "@/lib/look";
import { thumbnailOf } from "@/lib/media";

/** What goes behind the opening screen's words. */
type Backdrop = "keep" | "poster" | "blur" | "glow";

const ROLE_ROWS = [
  { role: "--deep-navy", label: "Background", pick: "background" },
  { role: "--teal-accent", label: "Buttons", pick: "button" },
  { role: "--sky-accent", label: "Highlights", pick: "highlight" },
] as const;

/** The funnel's own colors, as a full set (missing ones from the app's defaults). */
function builtInColors(funnel: Funnel): LookColors {
  const t: FunnelTheme = funnel.brand.theme ?? {};
  return {
    "--deep-navy": t["--deep-navy"] ?? "#0E1A2B",
    "--royal-blue": t["--royal-blue"] ?? "#1E3A5F",
    "--teal-accent": t["--teal-accent"] ?? "#28719A",
    "--sky-accent": t["--sky-accent"] ?? "#6CB4D8",
    "--soft-gray": t["--soft-gray"] ?? "#F2F4F7",
  };
}

const sameColors = (a: LookColors, b: LookColors) => LOOK_ROLES.every((r) => a[r].toUpperCase() === b[r].toUpperCase());

/**
 * Style: the opening screen's colors, title typeface and background, with a
 * live preview. Start from a suggestion made from the flyer, remix with the
 * flyer's own colors, or go back to the original. Nothing changes until Done.
 */
export default function StyleSheet({
  funnel,
  title,
  look,
  media,
  onDone,
  onClose,
}: {
  /** The funnel as built in: its own colors, logo and dates. */
  funnel: Funnel;
  /** The opening screen's title, as it reads now. */
  title: string;
  look: Look | undefined;
  /** What's behind the opening screen now. */
  media: ReelMedia | undefined;
  onDone: (look: Look | undefined, media: HeroMediaEdit) => void;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);

  const original = useMemo(() => builtInColors(funnel), [funnel]);
  const flyer = look?.flyer || (media?.kind === "image" && media.fit ? media.src : undefined);
  const suggestions = look?.suggestions ?? [];
  const palette = look?.palette?.length ? look.palette : [...new Set(Object.values(look?.colors ?? original))];

  // The sheet's own copy: undefined colors means the original look.
  const [colors, setColors] = useState<LookColors | undefined>(look?.colors);
  const [font, setFont] = useState<LookFont>(look?.font ?? "classic");
  const [backdrop, setBackdrop] = useState<Backdrop>(
    media?.kind === "image" && media.fit ? media.fit : media ? "keep" : flyer ? "glow" : "keep"
  );
  const [open, setOpen] = useState<(typeof ROLE_ROWS)[number]["pick"] | null>(null);
  // What the admin picked for each role, to say when it was adjusted for readability.
  const [picked, setPicked] = useState<Partial<Record<string, string>>>({});
  const [shuffles, setShuffles] = useState(0);

  const shown = colors ?? original;
  const isOriginal = !colors && font === "classic";
  const selected = isOriginal
    ? "original"
    : suggestions.findIndex((s) => colors && sameColors(s.colors, colors) && s.font === font);

  const pick = (role: (typeof ROLE_ROWS)[number], hex: string) => {
    const next = { background: shown["--deep-navy"], button: shown["--teal-accent"], highlight: shown["--sky-accent"], [role.pick]: hex };
    setColors(composeColors(next, shown));
    setPicked((p) => ({ ...p, [role.role]: hex }));
  };

  const done = () => {
    const nextLook: Look | undefined = isOriginal
      ? undefined
      : {
          ...(look ?? {}),
          colors: shown,
          font,
          ...(flyer ? { flyer } : {}),
        };
    const nextMedia: HeroMediaEdit =
      backdrop === "keep" ? (media ?? null) : backdrop === "glow" ? null : { kind: "image", src: flyer!, fit: backdrop };
    onDone(nextLook, nextMedia);
  };

  const backdrops: { id: Backdrop; label: string; disabled?: boolean }[] = [
    ...(media && !(media.kind === "image" && media.fit) ? [{ id: "keep" as const, label: media.kind === "image" ? "Photo" : "Video" }] : []),
    { id: "poster", label: "Flyer", disabled: !flyer },
    { id: "blur", label: "Blurred", disabled: !flyer },
    { id: "glow", label: "Glow" },
  ];
  const previewMedia: ReelMedia | undefined =
    backdrop === "keep" ? media : backdrop === "glow" || !flyer ? undefined : { kind: "image", src: flyer, fit: backdrop };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60 sm:h-auto sm:max-h-[92dvh] sm:w-[min(52rem,calc(100vw-2rem))] sm:rounded-2xl"
    >
      {/* Title bar: Cancel, title, Done, always in reach. */}
      <div className="sticky top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-200 bg-soft-gray/90 px-2 py-1.5 backdrop-blur">
        <button type="button" onClick={() => ref.current?.close()} className="min-h-11 justify-self-start rounded-lg px-3 text-[15px] font-semibold text-deep-navy hover:bg-white">
          Cancel
        </button>
        <h2 id={`${id}-title`} className="text-[17px] font-bold text-deep-navy">Style</h2>
        <button type="button" onClick={done} className="min-h-11 justify-self-end rounded-lg bg-deep-navy px-5 text-[15px] font-bold text-white hover:bg-royal-blue">
          Done
        </button>
      </div>

      <div className="flex flex-col gap-6 px-4 pb-8 pt-4 sm:flex-row sm:px-6">
        {/* The preview stays in view while the controls scroll. */}
        <div className="sticky top-[60px] z-10 -mx-4 flex justify-center bg-soft-gray/95 px-4 pb-3 backdrop-blur sm:static sm:mx-0 sm:block sm:self-start sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
          <StylePreview funnel={funnel} title={title} colors={shown} font={font} media={previewMedia} />
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          {(suggestions.length > 0 || look) && (
            <Group label="Suggested">
              <div role="radiogroup" aria-label="Suggested styles" className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {suggestions.map((s, i) => (
                  <SuggestionCard
                    key={s.label}
                    label={s.label}
                    colors={s.colors}
                    font={s.font}
                    selected={selected === i}
                    onSelect={() => {
                      setColors(s.colors);
                      setFont(s.font);
                      setPicked({});
                    }}
                  />
                ))}
                <SuggestionCard
                  label="Original"
                  colors={original}
                  font="classic"
                  selected={selected === "original"}
                  onSelect={() => {
                    setColors(undefined);
                    setFont("classic");
                    setPicked({});
                  }}
                />
              </div>
            </Group>
          )}

          <Group
            label="Colors"
            action={
              look?.palette?.length ? (
                <button
                  type="button"
                  onClick={() => {
                    const n = shuffles + 1;
                    setShuffles(n);
                    setColors(shuffleColors(look.palette!, shown, n));
                    setPicked({});
                  }}
                  className="-my-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold normal-case tracking-normal text-deep-navy hover:bg-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                  Shuffle
                </button>
              ) : undefined
            }
          >
            <ul role="list" className="divide-y divide-gray-100 rounded-xl bg-white">
              {ROLE_ROWS.map((row) => {
                const value = shown[row.role];
                const adjusted = picked[row.role] && wasAdjusted(picked[row.role]!, value);
                const expanded = open === row.pick;
                return (
                  <li key={row.role}>
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : row.pick)}
                      aria-expanded={expanded}
                      className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left"
                    >
                      <span className="text-[15px] font-semibold text-deep-navy">{row.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full ring-1 ring-black/10" style={{ background: value }} />
                        <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9l-7 7-7-7" /></svg>
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4">
                        <div role="radiogroup" aria-label={`${row.label} color`} className="flex flex-wrap gap-2">
                          {palette.map((hex) => {
                            const on = (picked[row.role] ?? value).toUpperCase() === hex.toUpperCase();
                            return (
                              <button
                                key={hex}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                aria-label={hex}
                                onClick={() => pick(row, hex)}
                                className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-black/10 transition ${on ? "ring-[3px] ring-deep-navy ring-offset-2" : "hover:scale-105"}`}
                                style={{ background: hex }}
                              >
                                {on && <Check color={readableOn(hex)} />}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {adjusted ? "Adjusted slightly so words stay readable." : look?.palette ? "Colors from your flyer." : "Import a flyer to pick from its colors."}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Group>

          <Group label="Title">
            <div role="radiogroup" aria-label="Title typeface" className="divide-y divide-gray-100 rounded-xl bg-white">
              {LOOK_FONT_IDS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={font === f}
                  onClick={() => setFont(f)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
                >
                  <span className={`${titleFontClass(f)} min-w-0 flex-1 truncate text-2xl leading-tight text-deep-navy`}>{title}</span>
                  <span className="flex-shrink-0 text-xs text-gray-500">{LOOK_FONTS[f].label}</span>
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${font === f ? "bg-deep-navy" : "ring-1 ring-gray-300"}`}>
                    {font === f && <Check color="#fff" />}
                  </span>
                </button>
              ))}
            </div>
          </Group>

          <Group label="Background">
            <div role="radiogroup" aria-label="Background" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-200/70 p-1">
              {backdrops.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={backdrop === b.id}
                  disabled={b.disabled}
                  onClick={() => setBackdrop(b.id)}
                  className={`min-h-10 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${backdrop === b.id ? "bg-white text-deep-navy shadow-sm" : "text-gray-600 hover:text-deep-navy"}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 px-1 text-xs text-gray-500">
              {!flyer
                ? "Import a flyer to put it behind your title."
                : backdrop === "poster"
                  ? "Your flyer above the title, over a soft blur of itself."
                  : backdrop === "blur"
                    ? "Just your flyer’s colors, blurred, so the title stands alone."
                    : backdrop === "glow"
                      ? "A moving glow in your colors."
                      : "Your current background."}
            </p>
          </Group>
        </div>
      </div>
    </dialog>
  );
}

function Group({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const readableOn = (hex: string) => (onAccent({ "--teal-accent": hex } as LookColors) === "#FFFFFF" ? "#fff" : "#111");

function Check({ color }: { color: string }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

/** A tile for one ready-made style: its background, an "Aa" in its type, and its button color. */
function SuggestionCard({ label, colors, font, selected, onSelect }: { label: string; colors: LookColors; font: LookFont; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="flex w-24 flex-shrink-0 flex-col items-center gap-1.5">
      <span
        className={`relative flex h-28 w-24 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl transition ${selected ? "ring-[3px] ring-deep-navy ring-offset-2 ring-offset-soft-gray" : "ring-1 ring-black/10"}`}
        style={{ background: `radial-gradient(circle at 50% 30%, ${colors["--royal-blue"]}, ${colors["--deep-navy"]} 75%)` }}
      >
        <span className={`${titleFontClass(font)} text-3xl leading-none text-white`}>Aa</span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors["--sky-accent"] }} />
        <span className="h-4 w-14 rounded-full" style={{ background: colors["--teal-accent"] }} />
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <Check color="#111" />
          </span>
        )}
      </span>
      <span className={`text-xs ${selected ? "font-bold text-deep-navy" : "font-semibold text-gray-600"}`}>{label}</span>
    </button>
  );
}

/** The opening screen, small: logo, background, eyebrow, title, date circles and both buttons, in these colors. */
export function StylePreview({
  funnel,
  title,
  colors,
  font,
  media,
}: {
  funnel: Funnel;
  title: string;
  colors: LookColors;
  font: LookFont;
  media: ReelMedia | undefined;
}) {
  // The next three dates, as the circles visitors see.
  const [now] = useState(() => Date.now());
  const days = (funnel.events ?? [])
    .map((e) => new Date(e.startsAt))
    .filter((d) => d.getTime() > now)
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, 3);
  const theme = { ...colors, "--on-accent": onAccent(colors) } as React.CSSProperties;
  const still = thumbnailOf(media);
  return (
    <div
      aria-label="Preview of your opening screen"
      role="img"
      style={theme}
      className="relative aspect-[9/16] w-40 overflow-hidden rounded-[1.4rem] bg-deep-navy shadow-xl ring-4 ring-black/80 transition-colors duration-300 sm:w-60"
    >
      {media?.kind === "image" && media.fit ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer */}
          <img src={media.src} alt="" className={`absolute inset-0 h-full w-full scale-125 object-cover ${media.fit === "blur" ? "blur-xl brightness-[0.6]" : "blur-md brightness-[0.55]"} saturate-150`} />
          {media.fit === "poster" && (
            // eslint-disable-next-line @next/next/no-img-element -- the uploaded flyer
            <img src={media.src} alt="" className="absolute inset-x-0 top-[13%] mx-auto h-[36%] w-auto max-w-[80%] rounded object-contain [mask-image:linear-gradient(to_bottom,black_75%,transparent)]" />
          )}
        </>
      ) : still ? (
        // eslint-disable-next-line @next/next/no-img-element -- any file or link the admin adds
        <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover brightness-75" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,var(--sky-accent),var(--teal-accent)_28%,var(--royal-blue)_52%,transparent_75%)] opacity-80" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-deep-navy from-30% via-deep-navy/80 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3 sm:px-4 sm:pt-4">
        <span className={`${wordmarkFont.className} text-[13px] text-white sm:text-base`}>{funnel.brand.logo.kind === "wordmark" ? funnel.brand.logo.text : funnel.brand.name}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 sm:px-4 sm:pb-4">
        <p className="text-[6px] font-semibold uppercase tracking-[0.2em] text-sky-accent sm:text-[8px]">Next up · Sat</p>
        <p className={`${titleFontClass(font)} mt-1 line-clamp-2 text-[17px] leading-[0.95] text-white sm:text-[26px]`}>{title}</p>
        {days.length > 0 && (
          <div className="mt-2 flex gap-1.5 sm:mt-3 sm:gap-2">
            {days.map((d, i) => (
              <span key={i} className="rounded-full bg-[conic-gradient(from_200deg,var(--sky-accent),var(--teal-accent),var(--sky-accent))] p-[1.5px]">
                <span className="flex h-6 w-6 flex-col items-center justify-center rounded-full bg-deep-navy text-[5px] leading-none text-white sm:h-9 sm:w-9 sm:text-[7px]">
                  <span className="text-sky-accent">{d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</span>
                  <span className="mt-px text-[8px] font-bold sm:text-[11px]">{d.getDate()}</span>
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-1.5 sm:mt-3">
          <span className="flex h-6 flex-1 items-center justify-center rounded-full bg-teal-accent text-[7px] font-semibold text-on-accent sm:h-8 sm:text-[10px]">Sneak peek</span>
          <span className="flex h-6 items-center justify-center rounded-full border border-white/25 bg-white/10 px-2 text-[7px] font-semibold text-white sm:h-8 sm:px-3 sm:text-[10px]">Tickets</span>
        </div>
      </div>
    </div>
  );
}
