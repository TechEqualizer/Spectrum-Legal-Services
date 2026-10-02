import type { Metadata } from "next";
import AdminNav from "@/admin/components/AdminNav";

export const metadata: Metadata = {
  title: "Reel Funnel Admin (Preview)",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-soft-gray text-charcoal lg:flex">
      <AdminNav />
      <div className="min-w-0 flex-1">
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 md:px-8 md:text-left">
          <strong>Preview with sample data.</strong> Nothing here is real visitor
          or client data, and changes aren&apos;t saved. Real data appears once
          the admin has a login.
        </p>
        <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
