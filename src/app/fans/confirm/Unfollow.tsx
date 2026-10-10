"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// "Unfollow" on the confirmation page, for a fan who changes their mind:
// the page then shows that they no longer follow.

export default function Unfollow({ organizer, name }: { organizer: string; name: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function leave() {
    setState("busy");
    const res = await fetch("/api/fans/unfollow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizer }),
    }).catch(() => null);
    if (res?.ok) router.refresh();
    else setState("error");
  }

  return (
    <span className="flex flex-col">
      <button
        type="button"
        onClick={leave}
        disabled={state === "busy"}
        className="min-h-12 text-left font-semibold text-[var(--sl-muted)] underline underline-offset-4 hover:text-[var(--sl-text)] disabled:opacity-40"
      >
        Unfollow
        <span className="sr-only"> {name}</span>
      </button>
      {state === "error" && (
        <span role="alert" className="text-sm text-[var(--sl-muted)]">
          Couldn&apos;t unfollow. Try again.
        </span>
      )}
    </span>
  );
}
