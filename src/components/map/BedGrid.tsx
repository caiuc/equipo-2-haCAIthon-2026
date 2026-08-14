"use client";

import { facilityBeds, type BedCell } from "@/lib/engine/beds";
import type { FacilityStatus } from "@/types";

const cellClass: Record<BedCell, string> = {
  free: "bg-teal-400 shadow-[0_0_8px_rgba(46,230,214,0.45)]",
  occupied: "bg-slate-500",
  blocked: "bg-red-400/80",
};

export function BedGrid({
  facility,
  compact = false,
}: {
  facility: FacilityStatus;
  compact?: boolean;
}) {
  const { cells, free, occupied, blocked } = facilityBeds(facility);
  const size = compact ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <div>
      <div
        className={`grid gap-1 ${compact ? "grid-cols-8" : "grid-cols-6 sm:grid-cols-8"}`}
      >
        {cells.map((cell, index) => (
          <span
            key={`${facility.facilityId}-${index}`}
            title={
              cell === "free"
                ? "Cama libre"
                : cell === "occupied"
                  ? "Cama ocupada"
                  : "Cama no usable"
            }
            className={`${size} rounded-[3px] ${cellClass[cell]}`}
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
        {free} libres · {occupied} ocupadas
        {blocked > 0 ? ` · ${blocked} bloqueadas` : ""}
      </p>
    </div>
  );
}
