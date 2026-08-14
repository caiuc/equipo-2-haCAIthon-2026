import { isMatchable } from "@/lib/engine/continuity";
import type { FacilityStatus } from "@/types";

export type BedCell = "free" | "occupied" | "blocked";

export function facilityBeds(facility: FacilityStatus): {
  cells: BedCell[];
  free: number;
  occupied: number;
  blocked: number;
} {
  const occupied = Math.max(
    0,
    facility.totalCapacity - facility.availableCapacity,
  );
  const usable = isMatchable(facility);
  const free = usable ? facility.availableCapacity : 0;
  const blocked = usable ? 0 : facility.availableCapacity;
  const cells: BedCell[] = [
    ...Array.from({ length: occupied }, () => "occupied" as const),
    ...Array.from({ length: free }, () => "free" as const),
    ...Array.from({ length: blocked }, () => "blocked" as const),
  ];
  while (cells.length < facility.totalCapacity) cells.push("blocked");
  return {
    cells: cells.slice(0, facility.totalCapacity),
    free,
    occupied,
    blocked,
  };
}
