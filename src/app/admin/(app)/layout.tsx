import { redirect } from "next/navigation";
import { AdminBusinessesProvider, AdminFrame } from "@/admin/AdminBusiness";
import AdminNav from "@/admin/components/AdminNav";
import { AdminSessionProvider } from "@/admin/session";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { listEventFunnels } from "@/lib/server/funnels";

// Everything under /admin except the sign-in page. The admin is checked with
// Supabase on every visit; Supabase's row-level security guards each write.
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  // Organizers' events this admin may edit (the demos are built in).
  const eventFunnels = (await listEventFunnels()).filter(({ funnel }) => canPublish(admin, funnel.slug)).map(({ funnel }) => funnel);
  return (
    <AdminSessionProvider
      session={{ email: admin.email, slugs: admin.slugs, mustChangePassword: admin.mustChangePassword }}
    >
      <AdminBusinessesProvider eventFunnels={eventFunnels}>
        <AdminFrame nav={<AdminNav />}>{children}</AdminFrame>
      </AdminBusinessesProvider>
    </AdminSessionProvider>
  );
}
