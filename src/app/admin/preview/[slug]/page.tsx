import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import PreviewFrame from "@/admin/components/PreviewFrame";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";
import { getFunnel, organizerOf } from "@/lib/server/funnels";

// The admin's live preview: the real funnel, inside the studio's phone, with
// the editor's unpublished edits sent in by the page around it.
export default async function AdminPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const funnel = await getFunnel(slug);
  if (!funnel || !canPublish(admin, slug, await organizerOf(slug))) notFound();
  return (
    <Suspense>
      <PreviewFrame funnel={funnel} />
    </Suspense>
  );
}
