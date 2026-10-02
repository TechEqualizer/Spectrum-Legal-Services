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
        className={size === "sm" ? "h-9 w-auto lg:h-11" : "h-12 w-auto"}
      />
    );
  }
  return (
    <span className="block leading-none" aria-label={brand.name} role="img">
      <span className={`${wordmarkFont.className} block whitespace-nowrap text-white ${size === "sm" ? "text-3xl" : "text-4xl"}`}>
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
