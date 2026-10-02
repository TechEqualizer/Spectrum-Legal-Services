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

const title = site.demoMode
  ? `${site.name} | Personal Injury Attorneys (Concept Preview)`
  : `${site.name} | Personal Injury Attorneys in Southern California`;
const description = `${site.name} represents people hurt in car, truck, motorcycle, and rideshare accidents across Southern California, with offices in Downey, ${site.otherOffices.join(", ")}.`;

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "personal injury lawyer",
    "car accident attorney",
    "truck accident lawyer",
    "motorcycle accident lawyer",
    "Uber accident lawyer",
    "Downey personal injury",
  ],
  authors: [{ name: site.name }],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_US",
    siteName: site.name,
  },
  // The concept preview must not show up in search results as the firm's site.
  robots: site.demoMode
    ? { index: false, follow: false }
    : { index: true, follow: true },
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
