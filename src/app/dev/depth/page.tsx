import { notFound } from "next/navigation";
import DepthCheck from "./DepthCheck";

// A development tool, never served in production: makes a flyer's depth map in
// the browser (src/lib/depth-map.ts), for scripts/make-depth.mjs to save and
// review.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DepthCheck />;
}
