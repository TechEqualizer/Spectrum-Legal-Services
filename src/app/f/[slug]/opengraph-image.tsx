import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { isConcept } from "@/config/site";
import { funnels } from "@/data/funnels";
import { applyPublication } from "@/lib/publication";
import { resolveLink } from "@/lib/server/links";

// The preview card people see when a funnel link is pasted into a text, DM
// or post. One per funnel: built-in ones at build time, organizers'
// events (from the database) on first request.

export const alt = "Short videos, then book or call";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return funnels.map((funnel) => ({ slug: funnel.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const target = await resolveLink((await params).slug);
  if (!target) notFound();
  // An organizer's permanent link previews the night it shows (or the soonest one).
  const funnel = target.kind === "event" ? applyPublication(target.funnel, target.publication) : target.events[0].funnel;
  const { brand } = funnel;
  const dark = brand.theme?.["--deep-navy"] ?? "#0E1A2B";
  const mid = brand.theme?.["--royal-blue"] ?? "#1E3A5F";
  const accent = brand.theme?.["--sky-accent"] ?? "#6CB4D8";
  const logo =
    brand.logo.kind !== "image"
      ? null
      : brand.logo.src.startsWith("/")
        ? `data:image/png;base64,${(await readFile(join(process.cwd(), "public", brand.logo.src))).toString("base64")}`
        : brand.logo.src;
  const tagline = funnel.sample?.preparedFor
    ? `Prepared for ${funnel.sample.preparedFor}`
    : funnel.sample
      ? "Sample funnel"
      : isConcept(funnel)
        ? "Concept preview"
        : (brand.phone?.display ?? "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(135deg, ${dark} 0%, ${mid} 100%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {logo && brand.logo.kind === "image" ? (
          <img src={logo} width={264} height={(264 * brand.logo.height) / brand.logo.width} alt="" />
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ fontSize: 72, fontFamily: "serif" }}>
              {brand.logo.kind === "wordmark" ? brand.logo.text : brand.name}
            </span>
            {brand.logo.kind === "wordmark" && brand.logo.tagline && (
              <span style={{ fontSize: 26, color: accent, letterSpacing: 8 }}>
                {brand.logo.tagline.toUpperCase()}
              </span>
            )}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: accent, letterSpacing: 2 }}>
            {funnel.cover.heading.toUpperCase()}
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>
            {brand.copy.shareText}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#d1d5db" }}>
          <span>
            Watch, then {funnel.primaryCta === "tickets" ? "get tickets" : funnel.primaryCta === "book" ? "book" : "call"} in one tap
          </span>
          <span>{tagline}</span>
        </div>
      </div>
    ),
    size
  );
}
