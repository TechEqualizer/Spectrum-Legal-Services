import { Big_Shoulders } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "@/admin/components/LoginForm";
import "@/components/showlnk/showlnk.css";

export const metadata = { title: "Sign in | Showlnk" };

const show = Big_Shoulders({ subsets: ["latin"], variable: "--font-show", axes: ["opsz"], display: "swap" });

// Sign-in, set in the home page's night: a stage-lit brand panel beside the
// form on desktop, the form alone on phones.
export default function LoginPage() {
  return (
    <div className={`sl ${show.variable} grid min-h-dvh font-sans lg:grid-cols-[1.1fr_1fr]`}>
      <aside className="sl-wash relative hidden overflow-hidden border-r border-[var(--sl-line)] bg-[var(--sl-night-2)] lg:block" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="sl-display text-[clamp(3rem,5vw,4.75rem)]">
            Your night,
            <br />
            <span className="text-[var(--sl-gold)]">already selling.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-[var(--sl-muted)]">One flyer. One link. Every ticket traced to the post that sold it.</p>
        </div>
      </aside>

      <main id="main-content" className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" aria-label="Showlnk home" className="self-start text-[2rem] leading-none">
          <span className="sl-display normal-case tracking-normal">
            show<span className="text-[var(--sl-gold)]">lnk</span>
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          {/* ?next= is read in the browser, so this page stays static. */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
