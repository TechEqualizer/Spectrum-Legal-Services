import Link from "next/link";
import { START_CORE_HREF } from "@/admin/plan";

/** Beside a feature that's part of Core, for an organizer on Free: what it needs, and where to start it. */
export default function CoreNote({ id, text }: { id?: string; text: string }) {
  return (
    <p id={id} className="mt-3 rounded-md bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      <span className="font-semibold">Part of Core.</span> {text}{" "}
      <Link href={START_CORE_HREF} className="font-semibold underline underline-offset-2">
        Start Core
      </Link>
    </p>
  );
}
