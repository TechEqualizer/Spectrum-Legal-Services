import { Bebas_Neue, Cinzel, Playfair_Display, Syne } from "next/font/google";
import { wordmarkFont } from "@/components/BrandLogo";
import type { LookFont } from "@/lib/look";

// The title typefaces a look can use. Each loads only on pages that show it.
const editorial = Playfair_Display({ subsets: ["latin"], weight: ["700"], display: "swap", preload: false });
const regal = Cinzel({ subsets: ["latin"], weight: ["600"], display: "swap", preload: false });
const bold = Bebas_Neue({ subsets: ["latin"], weight: ["400"], display: "swap", preload: false });
const modern = Syne({ subsets: ["latin"], weight: ["700"], display: "swap", preload: false });

const CLASSES: Record<LookFont, string> = {
  classic: wordmarkFont.className,
  editorial: editorial.className,
  regal: `${regal.className} tracking-wide`,
  bold: `${bold.className} tracking-wide`,
  modern: `${modern.className} tracking-tight`,
};

/** The class for a title in this typeface (the classic serif by default). */
export const titleFontClass = (font?: LookFont) => CLASSES[font ?? "classic"];
