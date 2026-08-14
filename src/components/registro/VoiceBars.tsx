export function VoiceBars({
  bars,
  active,
}: {
  bars: number[];
  active: boolean;
}) {
  const display = bars.length ? bars : Array.from({ length: 22 }, () => 0.1);
  return (
    <div
      className="flex h-[72px] items-end justify-center gap-[3px]"
      aria-hidden
    >
      {display.map((value, index) => (
        <span
          key={index}
          className="w-[5px] rounded-full bg-[var(--green)] transition-[height] duration-75"
          style={{
            height: `${Math.max(10, (active ? value : 0.1) * 100)}%`,
            opacity: active ? 0.95 : 0.28,
          }}
        />
      ))}
    </div>
  );
}

export function LiveChipRow({
  chips,
}: {
  chips: Array<{ id: string; label: string; tone: "ok" | "warn" }>;
}) {
  if (!chips.length) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Detectando mientras habla…
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            chip.tone === "warn"
              ? "border-[var(--amber)]/30 bg-[var(--amber-soft)] text-[var(--amber)]"
              : "border-[var(--green)]/25 bg-[var(--green-soft)] text-[var(--green)]"
          }`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
