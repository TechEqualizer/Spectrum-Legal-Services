"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};
// Only where the visitor came from travels on; ?start= belongs to one event.
const CARRIED = /^(src|utm_[a-z]+)$/;

function carried() {
  const from = new URLSearchParams(window.location.search);
  const kept = new URLSearchParams();
  from.forEach((value, key) => {
    if (CARRIED.test(key)) kept.set(key, value);
  });
  return kept.size ? `?${kept}` : "";
}

/**
 * A link to another page of the same story that keeps the visitor's source
 * tag (?src=instagram), so a ticket bought after it still counts for the
 * place that brought them. The page stays static: the tag is read in the
 * browser.
 */
export default function SourceLink({ href, ...props }: React.ComponentProps<typeof Link> & { href: string }) {
  const query = useSyncExternalStore(noSubscribe, carried, () => "");
  return <Link href={`${href}${query}`} {...props} />;
}
