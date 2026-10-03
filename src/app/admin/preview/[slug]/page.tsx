import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import PreviewFrame from "@/admin/components/PreviewFrame";
import { getFunnelBySlug } from "@/data/funnels";
import { canPublish, getAdmin } from "@/lib/server/admin-auth";

// The admin's live preview: the real funnel, inside the studio's phone, with
// the editor's unpublished edits sent in by the page around it.
export default async function AdminPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (!getFunnelBySlug(slug) || !canPublish(admin, slug)) notFound();
  return (
    <Suspense>
      <PreviewFrame slug={slug} />
    </Suspense>
  );
}
