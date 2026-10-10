import type { Metadata } from "next";
import StartPreview from "@/components/start/StartPreview";

// The phone inside the sign-up wizard (/start): the wizard sends it the
// draft link to show. Nothing to see on its own.
export const metadata: Metadata = { title: "Preview · Showlnk", robots: { index: false, follow: false } };

export default function StartPreviewPage() {
  return <StartPreview />;
}
