// The admin's small inline icons, drawn in the same stroke as the nav icons.

const base = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", "aria-hidden": true } as const;

/** A check, for "Copied", "Added" and other done states. */
export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`inline-block flex-shrink-0 ${className}`} {...base}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** A plus, for "New event", "Add reel" and other adds. */
export function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`inline-block flex-shrink-0 ${className}`} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
