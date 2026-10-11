import Link from "next/link";
import { START_CORE_HREF } from "@/admin/plan";

/** Beside a feature that's part of the fans add-on, for an organizer without it: what it needs, and where to add it. */
export default function CoreNote({ id, text }: { id?: string; text: string }) {
  return (
    <p id={id} className="mt-3 rounded-md bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      <span className="font-semibold">Part of the Fans add-on.</span> {text}{" "}
      <Link href={START_CORE_HREF} className="font-semibold underline underline-offset-2">
        Add Fans
      </Link>
    </p>
  );
}
