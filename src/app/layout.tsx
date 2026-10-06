import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { site } from "@/config/site";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Showlnk's defaults; the home page, funnel links and the admin set their own.
export const metadata: Metadata = {
  title: "Showlnk",
  description: "Your event flyer, as one link of vertical reels that sells the night.",
  openGraph: { siteName: "Showlnk", type: "website", locale: "en_US" },
  // While the site is a preview, it stays out of search results.
  robots: site.demoMode ? { index: false, follow: false } : { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`scroll-smooth ${montserrat.variable}`}>
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
