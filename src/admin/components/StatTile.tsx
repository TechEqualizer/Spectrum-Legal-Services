type StatTileProps = {
  label: string;
  value: string;
  /** Change vs the previous period, as a fraction (0.12 = +12%). */
  delta?: number;
  /** Whether an increase is good news. */
  upIsGood?: boolean;
  periodLabel: string;
  /** A short line under the number, such as a running total. */
  note?: string;
};

export default function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  periodLabel,
  note,
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
      {note && <p className="mt-1 text-xs text-gray-600">{note}</p>}
    </div>
  );
}

/** Stat tiles in rows: up to five side by side on a wide screen; on a phone, an odd last one fills its row. */
export function TileGrid({ children }: { children: React.ReactNode[] }) {
  const n = children.length;
  const cols = n >= 6 ? "lg:grid-cols-3" : n === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 gap-3 md:gap-4 ${cols}`}>
      {children.map((tile, i) => (
        <div key={i} className={`[&>*]:h-full ${n % 2 && i === n - 1 ? "col-span-2 lg:col-span-1" : ""}`}>
          {tile}
        </div>
      ))}
    </div>
  );
}
