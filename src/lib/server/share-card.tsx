/* eslint-disable @next/next/no-img-element -- ImageResponse draws plain <img> tags, not next/image */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import type { Funnel, Reel } from "@/data/funnel-types";
import { eventWhen } from "@/lib/event-time";
import { eventOf, isOver, upcomingEvents } from "@/lib/events";
import type { LookFont } from "@/lib/look";
import { sceneMediaOf, thumbnailOf } from "@/lib/media";

// The card people see when a link is pasted into a post, text or DM: the
// event's own art in the middle with a play button (it's a video, not a web
// page), the title on one side, the date and whether tickets are left on the
// other. A link that opens on a reel (?start=) shows that reel's frame.
//
// Everything that matters sits in the middle: Facebook's Android app crops
// the card's sides.

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };
const W = SHARE_CARD_SIZE.width;
const H = SHARE_CARD_SIZE.height;

/** The reel a ?start= link opens on, if it's one of this funnel's. */
export function sharedReel(funnel: Funnel, reelId: string | undefined): Reel | undefined {
  return reelId ? funnel.reels.find((r) => r.id === reelId) : undefined;
}

/** The night the card is about: the reel's own while it's coming up, else the next one. */
function nightOf(funnel: Funnel, reel: Reel | undefined, now: number) {
  const own = reel ? eventOf(funnel, reel) : undefined;
  if (own && !isOver(own, now)) return own;
  return upcomingEvents(funnel, now)[0];
}

/** "Detroit" from "1600 East Grand Blvd, Detroit". */
const cityOf = (venue: string | undefined) => venue?.split(",").at(-1)?.trim() || undefined;

/** Where the night stands, in a word or two, and whether it's urgent. */
function standing(funnel: Funnel, reel: Reel | undefined, now: number): { text: string; hot: boolean } | null {
  if (!funnel.events?.length) return null;
  const night = nightOf(funnel, reel, now);
  if (!night) return { text: "Thanks for coming", hot: false };
  if (night.status === "sold_out") return { text: "Sold out", hot: false };
  if (night.status === "few_left") return { text: "Few tickets left", hot: true };
  return { text: "Tickets on sale", hot: false };
}

/** The words under the card: the date, the place, where tickets stand, then what it is. */
export function shareMetadata(funnel: Funnel, reel?: Reel, now = Date.now()): Metadata {
  const night = nightOf(funnel, reel, now);
  const facts = [
    night ? eventWhen(night) : undefined,
    cityOf(night?.venue),
    standing(funnel, reel, now)?.text,
  ].filter(Boolean);
  const about = reel ? reel.summary : `${funnel.cover.heading} ${funnel.cover.intro}`.trim();
  const description = [facts.join(" · "), about].filter(Boolean).join(". ");
  const title = reel
    ? `${reel.title} | ${funnel.brand.seriesLabel}`
    : `${funnel.brand.seriesLabel} | ${funnel.brand.name}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: funnel.brand.name },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** The art: the reel's own frame, else the opening scene's, else the first reel's that has one. */
function artOf(funnel: Funnel, reel: Reel | undefined): string | undefined {
  const inOrder = [reel, ...funnel.reels].filter((r): r is Reel => Boolean(r));
  return (
    (reel ? thumbnailOf(reel.media) : undefined) ??
    thumbnailOf(sceneMediaOf(funnel)) ??
    inOrder.map((r) => thumbnailOf(r.media)).find(Boolean)
  );
}

async function fetchBytes(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith("/")) return await readFile(join(process.cwd(), "public", src));
    const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

type Sharp = typeof import("sharp").default;
let sharpModule: Promise<Sharp | null> | undefined;
const loadSharp = () => (sharpModule ??= import("sharp").then((m) => m.default, () => null));

const dataUrl = (bytes: Buffer, type: string) => `data:${type};base64,${bytes.toString("base64")}`;

/** The art cut to a portrait (between 9:16 and 4:5) at the card's height, and a blurred, dark copy for behind it. */
async function prepareArt(src: string | undefined) {
  if (!src) return null;
  const bytes = await fetchBytes(src);
  if (!bytes) return null;
  const sharp = await loadSharp();
  if (!sharp) {
    // No image tools: a JPEG or PNG still works as it is, untrimmed.
    const type = bytes[0] === 0xff ? "image/jpeg" : bytes[0] === 0x89 ? "image/png" : null;
    return type ? { art: dataUrl(bytes, type), width: Math.round(H * 0.6), backdrop: null } : null;
  }
  try {
    const meta = await sharp(bytes).metadata();
    const aspect = meta.width && meta.height ? meta.width / meta.height : 9 / 16;
    const width = Math.round(H * Math.min(0.8, Math.max(9 / 16, aspect)));
    const [art, backdrop] = await Promise.all([
      sharp(bytes).rotate().resize(width, H, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer(),
      sharp(bytes).rotate().resize(120, 63, { fit: "cover" }).blur(6).modulate({ brightness: 0.6, saturation: 1.3 }).jpeg({ quality: 70 }).toBuffer(),
    ]);
    return { art: dataUrl(art, "image/jpeg"), width, backdrop: dataUrl(backdrop, "image/jpeg") };
  } catch {
    return null;
  }
}

// The same typefaces as the link's title (src/components/lookFonts.ts), as TTF for the card.
const FONT_FAMILIES: Record<LookFont | "wordmark" | "sans" | "sansBold", string> = {
  classic: "Cormorant Garamond:wght@600",
  editorial: "Playfair Display:wght@700",
  regal: "Cinzel:wght@600",
  bold: "Bebas Neue",
  modern: "Syne:wght@700",
  wordmark: "Cormorant Garamond:wght@600",
  sans: "Inter:wght@500",
  sansBold: "Inter:wght@800",
};
const fonts = new Map<string, Promise<ArrayBuffer | null>>();
function loadFont(family: string) {
  let font = fonts.get(family);
  if (!font) {
    font = (async () => {
      try {
        const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}`, { signal: AbortSignal.timeout(3000) }).then((r) => r.text());
        const url = /src: url\((.+?)\) format\('truetype'\)/.exec(css)?.[1];
        if (!url) return null;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return res.ok ? await res.arrayBuffer() : null;
      } catch {
        return null;
      }
    })();
    fonts.set(family, font);
    // A failure is tried again next time rather than remembered.
    font.then((f) => {
      if (!f) fonts.delete(family);
    });
  }
  return font;
}

export async function shareCard(funnel: Funnel, reel?: Reel, now = Date.now()) {
  const { brand } = funnel;
  const dark = brand.theme?.["--deep-navy"] ?? "#0E1A2B";
  const mid = brand.theme?.["--royal-blue"] ?? "#1E3A5F";
  const accent = brand.theme?.["--sky-accent"] ?? "#6CB4D8";
  const titleFont = funnel.cover.titleFont ?? "classic";
  const [art, titleTtf, wordmarkTtf, sansTtf, sansBoldTtf] = await Promise.all([
    prepareArt(artOf(funnel, reel)),
    loadFont(FONT_FAMILIES[titleFont]),
    loadFont(FONT_FAMILIES.wordmark),
    loadFont(FONT_FAMILIES.sans),
    loadFont(FONT_FAMILIES.sansBold),
  ]);
  const night = nightOf(funnel, reel, now);
  const stand = standing(funnel, reel, now);
  const city = cityOf(night?.venue);
  const verb = funnel.primaryCta === "tickets" ? "get tickets" : funnel.primaryCta === "book" ? "book" : "call";
  const logoSrc = brand.logo.kind === "image" ? brand.logo.src : undefined;
  const logoBytes = logoSrc ? await fetchBytes(logoSrc) : null;
  const logo = logoSrc && logoBytes ? dataUrl(logoBytes, logoSrc.endsWith(".svg") ? "image/svg+xml" : "image/png") : null;
  const title = reel?.title ?? brand.seriesLabel;
  const artWidth = art?.width ?? 0;
  // The two sides of the art, each kept clear of the edges Facebook crops.
  const side = (W - artWidth) / 2;
  const caps = titleFont === "regal" || titleFont === "bold";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", color: "white", fontFamily: "Sans", background: `linear-gradient(135deg, ${dark} 0%, ${mid} 100%)` }}>
        {art?.backdrop && <img src={art.backdrop} width={W} height={H} alt="" style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }} />}

        {/* Left: who and what. */}
        <div style={{ position: "absolute", top: 0, left: 0, width: art ? side : W, height: H, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: art ? "flex-end" : "center", textAlign: art ? "right" : "center", padding: art ? "0 44px 0 96px" : "0 140px" }}>
          {logo && brand.logo.kind === "image" ? (
            <img src={logo} width={190} height={(190 * brand.logo.height) / brand.logo.width} alt="" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: art ? "flex-end" : "center" }}>
              <span style={{ fontFamily: wordmarkTtf ? "Wordmark" : "serif", fontSize: 44, lineHeight: 1 }}>{brand.logo.kind === "wordmark" ? brand.logo.text : brand.name}</span>
              {brand.logo.kind === "wordmark" && brand.logo.tagline && (
                <span style={{ fontSize: 15, letterSpacing: 6, color: accent, marginTop: 8 }}>{brand.logo.tagline.toUpperCase()}</span>
              )}
            </div>
          )}
          <div style={{ marginTop: 34, fontFamily: titleTtf ? "Title" : "serif", fontSize: caps ? (title.length > 20 ? 36 : 44) : title.length > 34 ? 38 : 48, lineHeight: 1.08, textTransform: caps ? "uppercase" : "none", letterSpacing: caps ? 1 : 0 }}>
            {title}
          </div>
          {!art && night && (
            <div style={{ marginTop: 28, fontSize: 30, fontWeight: 800, color: accent }}>{[eventWhen(night), city].filter(Boolean).join(" · ").toUpperCase()}</div>
          )}
        </div>

        {/* Middle: the art, with a play button: tap to watch. */}
        {art && (
          <div style={{ position: "absolute", top: 0, left: side, width: artWidth, height: H, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 80px rgba(0,0,0,0.6)" }}>
            <img src={art.art} width={artWidth} height={H} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
            <div style={{ width: 132, height: 132, borderRadius: 66, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
              <svg width="60" height="60" viewBox="0 0 24 24" style={{ marginLeft: 8 }}>
                <path d="M7 4.5v15l12.5-7.5z" fill={dark} />
              </svg>
            </div>
          </div>
        )}

        {/* Right: when, and whether there are tickets. */}
        {art && (
          <div style={{ position: "absolute", top: 0, right: 0, width: side, height: H, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "0 96px 0 44px" }}>
            {night ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 22, letterSpacing: 4, color: accent, fontWeight: 800 }}>{eventWhen(night, false).split(",")[0].toUpperCase()}</div>
                <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.05, marginTop: 6 }}>{eventWhen(night, false).split(",").slice(1).join(",").trim()}</div>
                <div style={{ fontSize: 26, color: "#e5e7eb", marginTop: 8 }}>{[eventWhen(night).split(" · ")[1], city].filter(Boolean).join(" · ")}</div>
              </div>
            ) : (
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{brand.name}</div>
            )}
            {stand && (
              <div style={{ marginTop: 26, display: "flex", padding: "10px 20px", borderRadius: 999, fontSize: 22, fontWeight: 800, background: stand.hot ? "#F59E0B" : accent, color: stand.hot ? "#1a1203" : dark }}>
                {stand.text}
              </div>
            )}
            <div style={{ marginTop: 22, fontSize: 21, color: "#d1d5db" }}>{`Watch, then ${verb} in one tap`}</div>
          </div>
        )}
      </div>
    ),
    {
      ...SHARE_CARD_SIZE,
      fonts: [
        ...(sansTtf ? [{ name: "Sans", data: sansTtf, weight: 500 as const, style: "normal" as const }] : []),
        ...(sansBoldTtf ? [{ name: "Sans", data: sansBoldTtf, weight: 800 as const, style: "normal" as const }] : []),
        ...(titleTtf ? [{ name: "Title", data: titleTtf, style: "normal" as const }] : []),
        ...(wordmarkTtf ? [{ name: "Wordmark", data: wordmarkTtf, style: "normal" as const }] : []),
      ],
    }
  );
}
