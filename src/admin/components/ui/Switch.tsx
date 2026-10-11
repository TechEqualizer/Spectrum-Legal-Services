/**
 * An on/off switch: the familiar 48×28 track, inside a 56×44 tap area (Apple's
 * 44pt minimum), so a thumb never misses it. Named by the label it sits beside
 * (`labelledBy`).
 */
export default function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
  disabled,
  className = "",
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group -my-2 -mr-1 inline-flex h-11 w-14 flex-shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-teal-accent ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors motion-reduce:transition-none ${checked ? "bg-teal-accent" : "bg-gray-300"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </button>
  );
}
