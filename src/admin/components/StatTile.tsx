type StatTileProps = {
  label: string;
  value: string;
  /** Change vs the previous period, as a fraction (0.12 = +12%). */
  delta?: number;
  /** Whether an increase is good news. */
  upIsGood?: boolean;
  periodLabel: string;
};

export default function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  periodLabel,
}: StatTileProps) {
  const good = delta === undefined ? null : delta === 0 ? null : (delta > 0) === upIsGood;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-deep-navy md:text-3xl">
        {value}
      </p>
      {delta !== undefined && (
        <p className="mt-2 flex items-center gap-1 text-xs text-gray-600">
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              good === null
                ? "text-gray-600"
                : good
                  ? "text-green-700"
                  : "text-red-700"
            }`}
          >
            <span aria-hidden="true">{delta > 0 ? "▲" : delta < 0 ? "▼" : "•"}</span>
            {delta > 0 ? "+" : ""}
            {(delta * 100).toFixed(1)}%
          </span>
          <span>vs previous {periodLabel}</span>
        </p>
      )}
    </div>
  );
}
