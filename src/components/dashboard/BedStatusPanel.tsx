"use client";

import { Badge } from "@/components/ui/Badge";
import { useBeds } from "@/hooks/useBeds";
import type { EmergencyBed, ErPatientStatus } from "@/types/beds";
import Link from "next/link";

const statusTone: Record<ErPatientStatus, "ok" | "warn" | "bad" | "info"> = {
  STABLE: "ok",
  OBSERVATION: "info",
  WAITING: "warn",
  CRITICAL: "bad",
};

const statusLabel: Record<ErPatientStatus, string> = {
  STABLE: "Estable",
  OBSERVATION: "Observación",
  WAITING: "En espera",
  CRITICAL: "Crítico",
};

function BedCard({ bed }: { bed: EmergencyBed }) {
  const occupied = bed.status === "OCCUPIED";
  const critical = bed.patientStatus === "CRITICAL";
  return (
    <article
      className={`rounded-lg border p-3 ${
        critical
          ? "border-red-400/50 bg-[color-mix(in_oklab,var(--bad)_12%,transparent)]"
          : occupied
            ? "border-amber-400/40 bg-[color-mix(in_oklab,var(--warn)_12%,transparent)]"
            : "border-emerald-400/40 bg-[color-mix(in_oklab,var(--ok)_12%,transparent)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Cama {bed.bedNumber}</p>
        <Badge tone={critical ? "bad" : occupied ? "warn" : "ok"}>
          {occupied ? "Ocupada" : "Libre"}
        </Badge>
      </div>
      {occupied ? (
        <>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {bed.patientLabel ?? "Paciente"}
          </p>
          {bed.patientStatus ? (
            <p className="mt-1">
              <Badge tone={statusTone[bed.patientStatus]}>
                {statusLabel[bed.patientStatus]}
              </Badge>
            </p>
          ) : null}
          {bed.chiefComplaint ? (
            <p className="mt-2 line-clamp-2 text-xs">{bed.chiefComplaint}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs text-[var(--muted)]">Disponible</p>
      )}
    </article>
  );
}

export function BedStatusPanel() {
  const { beds, isLoading, error } = useBeds();

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Urgencias · 8 camas</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Estado persistido en SQLite local. Se actualiza desde voz en
            Urgencias.
          </p>
        </div>
        <Link
          href="/urgencias"
          className="text-xs font-semibold text-teal-800 hover:underline"
        >
          Abrir ficha
        </Link>
      </header>
      {error ? (
        <p className="px-4 py-3 text-sm text-red-600">{error}</p>
      ) : isLoading && beds.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[var(--muted)]">Cargando camas…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
          {beds.map((bed) => (
            <BedCard key={bed.bedNumber} bed={bed} />
          ))}
        </div>
      )}
    </section>
  );
}
