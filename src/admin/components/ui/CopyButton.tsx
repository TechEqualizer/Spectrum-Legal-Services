"use client";

import { useState } from "react";
import { CheckIcon } from "@/admin/components/ui/icons";

/**
 * Copies text and says so for two seconds, out loud too. If the clipboard is
 * blocked, nothing happens: the text is on screen to copy by hand.
 */
export default function CopyButton({
  text,
  label = "Copy",
  announce = "Copied",
  className,
  onCopy,
}: {
  text: string;
  /** Also on a blocked clipboard: the link is still going somewhere. */
  onCopy?: () => void;
  label?: string;
  /** What a screen reader hears once it's copied. */
  announce?: string;
  className: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    onCopy?.();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked.
    }
  };
  return (
    <>
      <button type="button" onClick={copy} className={`inline-flex items-center justify-center gap-1.5 ${className}`}>
        {copied ? (
          <>
            Copied <CheckIcon />
          </>
        ) : (
          label
        )}
      </button>
      <span role="status" className="sr-only">{copied ? announce : ""}</span>
    </>
  );
}
