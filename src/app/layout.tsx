import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Spectrum Legal Services | Trusted Legal Representation",
  description:
    "Spectrum Legal Services delivers clarity, protection, and reliable results. Experienced attorneys specializing in Family Law, Criminal Defense, Business Law, Estate Planning, Immigration, and Civil Litigation.",
  keywords: [
    "attorney",
    "lawyer",
    "legal services",
    "family law",
    "criminal defense",
    "business law",
    "estate planning",
    "immigration law",
    "civil litigation",
  ],
  authors: [{ name: "Spectrum Legal Services" }],
  openGraph: {
    title: "Spectrum Legal Services | Trusted Legal Representation",
    description:
      "Spectrum Legal Services delivers clarity, protection, and reliable results for individuals and businesses.",
    type: "website",
    locale: "en_US",
    siteName: "Spectrum Legal Services",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
