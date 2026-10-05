import { redirect } from "next/navigation";

// The old Paths map: the path strip under the studio's phone shows every
// path now, so old links land there.
export default function AdminFunnelPage() {
  redirect("/admin");
}
