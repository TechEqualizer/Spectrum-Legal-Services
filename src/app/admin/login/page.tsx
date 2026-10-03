import { Suspense } from "react";
import LoginForm from "@/admin/components/LoginForm";

export const metadata = { title: "Sign in | Reel Funnel Admin" };

export default function LoginPage() {
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-soft-gray px-4 py-10 text-charcoal">
      {/* ?next= is read in the browser, so this page stays static. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
