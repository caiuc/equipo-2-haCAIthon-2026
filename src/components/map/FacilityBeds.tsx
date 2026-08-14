"use client";

import { Badge, operationalTone } from "@/components/ui/Badge";
import { BedGrid } from "@/components/map/BedGrid";
import { facilityBeds } from "@/lib/engine/beds";
import { operationalLabel } from "@/lib/labels";
import { useMockStore } from "@/lib/mock/mockStore";

export function FacilityBeds() {
  const { facilities, focusFacility, focusFacilityId } = useMockStore();

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <header className="border-b border-[var(--line)] px-4 py-3">
        <h2 className="text-sm font-semibold">Camas por establecimiento</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Al aprobar un traslado se ocupa una cama libre. Al rechazar, sigue vacía.
        </p>
      </header>
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        {facilities.map((facility) => {
          const { free } = facilityBeds(facility);
          const active = focusFacilityId === facility.facilityId;
          return (
            <button
              key={facility.facilityId}
              type="button"
              onClick={() => focusFacility(facility.facilityId)}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-teal-400/50 bg-teal-400/8"
                  : "border-[var(--line)] bg-[var(--input)] hover:border-slate-300"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{facility.name}</p>
                <Badge tone={operationalTone(facility.operationalStatus)}>
                  {operationalLabel[facility.operationalStatus]}
                </Badge>
              </div>
              <BedGrid facility={facility} compact />
              <p className="mt-1 text-[11px] text-teal-800">
                {free} camas libres de {facility.totalCapacity}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
