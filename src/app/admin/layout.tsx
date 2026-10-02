import type { Metadata } from "next";
import { AdminFrame } from "@/admin/AdminBusiness";
import AdminNav from "@/admin/components/AdminNav";

export const metadata: Metadata = {
  title: "Reel Funnel Admin (Preview)",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminFrame nav={<AdminNav />}>{children}</AdminFrame>;
}
