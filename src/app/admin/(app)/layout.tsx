import { redirect } from "next/navigation";
import { AdminBusinessesProvider, AdminFrame } from "@/admin/AdminBusiness";
import AdminNav from "@/admin/components/AdminNav";
import { AdminSessionProvider } from "@/admin/session";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { applyPublication } from "@/lib/publication";
import { listEventFunnels, listOrganizers } from "@/lib/server/funnels";
import { getPublication } from "@/lib/server/publications";

// Everything under /admin except the sign-in page. The admin is checked with
// Supabase on every visit; Supabase's row-level security guards each write.
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  // Organizers' events this admin may edit (the demos are built in), as built and as visitors see them.
  const [rows, organizers] = await Promise.all([listEventFunnels(), listOrganizers()]);
  const names = new Map(organizers.map((o) => [o.slug, o.name]));
  const events = await Promise.all(
    rows
      .filter(({ funnel, organizer }) => canPublish(admin, funnel.slug, organizer))
      .map(async ({ funnel, organizer }) => ({
        funnel,
        live: applyPublication(funnel, (await getPublication(funnel.slug))?.publication),
        organizer: { slug: organizer, name: names.get(organizer) ?? funnel.brand.name },
      }))
  );
  return (
    <AdminSessionProvider
      session={{ email: admin.email, ...admin.profile, slugs: admin.slugs, organizers: admin.organizers, mustChangePassword: admin.mustChangePassword }}
    >
      <AdminBusinessesProvider events={events}>
        <AdminFrame nav={<AdminNav />}>{children}</AdminFrame>
      </AdminBusinessesProvider>
    </AdminSessionProvider>
  );
}
