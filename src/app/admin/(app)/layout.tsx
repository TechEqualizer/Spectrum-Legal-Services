import { redirect } from "next/navigation";
import { AdminFrame } from "@/admin/AdminBusiness";
import AdminNav from "@/admin/components/AdminNav";
import { AdminSessionProvider } from "@/admin/session";
import { getAdmin } from "@/lib/server/admin-auth";

// Everything under /admin except the sign-in page. The admin is checked with
// Supabase on every visit; Supabase's row-level security guards each write.
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <AdminSessionProvider
      session={{ email: admin.email, slugs: admin.slugs, mustChangePassword: admin.mustChangePassword }}
    >
      <AdminFrame nav={<AdminNav />}>{children}</AdminFrame>
    </AdminSessionProvider>
  );
}
