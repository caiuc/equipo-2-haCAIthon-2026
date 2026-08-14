"use client";

import { flashApproved, slideRowIn } from "@/lib/animations/transitions";
import {
  buildActionQueue,
  suggestedActionCopy,
} from "@/lib/engine/continuity";
import { actionLabel, assignmentStatusLabel, needTypeLabel } from "@/lib/labels";
import { useMockStore } from "@/lib/mock/mockStore";
import { assignmentTone, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEffect, useMemo, useRef } from "react";

export function ActionQueue() {
  const {
    patients,
    facilities,
    assignments,
    approveAssignment,
    rejectAssignment,
  } = useMockStore();
  const rows = useMemo(
    () => buildActionQueue(patients, facilities, assignments),
    [patients, facilities, assignments],
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Cola de acciones</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Aprobar ocupa una cama. Rechazar la deja libre.
          </p>
        </div>
        <Badge tone="info">
          {rows.filter((row) => row.assignment.status === "PROPOSED").length}{" "}
          pendientes
        </Badge>
      </header>
      <div className="overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[var(--panel)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Caso</th>
              <th className="px-3 py-2 font-medium">Motivo</th>
              <th className="px-3 py-2 font-medium">Acción sugerida</th>
              <th className="px-3 py-2 font-medium">Responsable</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <QueueRowView
                key={row.assignment.id}
                row={row}
                onApprove={() => approveAssignment(row.assignment.id)}
                onReject={() => rejectAssignment(row.assignment.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QueueRowView({
  row,
  onApprove,
  onReject,
}: {
  row: ReturnType<typeof buildActionQueue>[number];
  onApprove: () => void;
  onReject: () => void;
}) {
  const ref = useRef<HTMLTableRowElement>(null);
  const previousStatus = useRef(row.assignment.status);

  useEffect(() => {
    if (!ref.current) return;
    slideRowIn(ref.current);
  }, [row.assignment.id]);

  useEffect(() => {
    if (!ref.current) return;
    if (
      previousStatus.current === "PROPOSED" &&
      row.assignment.status === "APPROVED"
    ) {
      flashApproved(ref.current);
    }
    previousStatus.current = row.assignment.status;
  }, [row.assignment.status]);

  const patient = row.patient;
  const actionCopy = suggestedActionCopy(
    row.assignment.actionType,
    row.facility,
    row.alternatives,
  );

  return (
    <tr
      ref={ref}
      className={`border-t border-[var(--line)] ${row.isCritical ? "bg-red-500/5" : ""}`}
    >
      <td className="px-4 py-3 align-top">
        <p className="font-mono text-sm font-semibold">
          {patient?.anonymousCode ?? "—"}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {patient
            ? needTypeLabel[patient.needType]
            : actionLabel[row.assignment.actionType]}
          {patient ? ` · ${patient.currentZone}` : ""}
        </p>
      </td>
      <td className="max-w-[220px] px-3 py-3 align-top text-[13px] leading-snug text-[var(--text)]">
        {row.alertReason}
      </td>
      <td className="max-w-[240px] px-3 py-3 align-top text-[13px] leading-snug">
        {actionCopy}
      </td>
      <td className="px-3 py-3 align-top text-[13px]">
        {row.assignment.responsibleTeam}
      </td>
      <td className="px-3 py-3 align-top">
        <Badge tone={assignmentTone(row.assignment.status)}>
          {assignmentStatusLabel[row.assignment.status]}
        </Badge>
      </td>
      <td className="px-3 py-3 align-top">
        {row.assignment.status === "PROPOSED" ? (
          <div className="flex flex-col gap-1.5">
            <Button
              onClick={onApprove}
              className="whitespace-nowrap px-2.5 py-1.5 text-xs"
            >
              Aprobar
            </Button>
            <Button
              variant="ghost"
              onClick={onReject}
              className="whitespace-nowrap px-2.5 py-1.5 text-xs text-red-700"
            >
              Rechazar
            </Button>
          </div>
        ) : row.assignment.status === "REJECTED" ? (
          <span className="text-xs text-red-700">Sin reserva</span>
        ) : (
          <span className="text-xs text-emerald-700">Con responsable</span>
        )}
      </td>
    </tr>
  );
}
