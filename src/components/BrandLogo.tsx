import { Cormorant_Garamond } from "next/font/google";
import Image from "next/image";
import type { FunnelBrand } from "@/data/funnel-types";

// For text wordmarks (businesses without a logo image).
export const wordmarkFont = Cormorant_Garamond({ subsets: ["latin"], weight: ["600"], display: "swap" });

/** A funnel's logo for dark backgrounds: its image, or its name as a wordmark. */
export default function BrandLogo({
  brand,
  size = "md",
  eager = false,
}: {
  brand: FunnelBrand;
  size?: "sm" | "md";
  eager?: boolean;
}) {
  const { logo } = brand;
  if (logo.kind === "image") {
    return (
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className={`max-w-full object-contain object-left ${size === "sm" ? "h-9 w-auto lg:h-11" : "h-12 w-auto"}`}
      />
    );
  }
  return (
    <span className="block max-w-full leading-none" aria-label={brand.name} role="img">
      {/* A long name takes two lines rather than running past the screen or the sidebar. */}
      <span className={`${wordmarkFont.className} block text-balance leading-[0.95] text-white [overflow-wrap:anywhere] ${size === "sm" ? "text-3xl" : "text-4xl"}`}>
        {logo.text}
      </span>
      {logo.tagline && (
        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-accent">
          {logo.tagline}
        </span>
      )}
    </span>
  );
}
