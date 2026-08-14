"use client";

import { ClinicalFormCard } from "@/components/records/ClinicalFormCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { RecordDetailView } from "@shared/recordDetail";

export function RecordDetailBody({
  detail,
}: {
  detail: RecordDetailView;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">
            Paciente {detail.form.name ?? detail.form.patient}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {detail.form.sex} · {detail.form.age}
            {detail.createdAt
              ? ` · ${new Date(detail.createdAt).toLocaleString("es-CL")}`
              : ""}
          </p>
        </div>
        <Badge
          tone={
            detail.form.criticalityKey === "high"
              ? "bad"
              : detail.form.criticalityKey === "medium"
                ? "warn"
                : "ok"
          }
        >
          Criticidad {detail.form.criticality}
        </Badge>
      </div>

      {!detail.hasSnapshot ? (
        <p className="rounded-xl bg-[var(--amber-soft)] px-3 py-2 text-xs text-[var(--amber)]">
          Este registro no tiene snapshot del formulario. Se reconstruye desde
          el dictado y los eventos publicados.
        </p>
      ) : null}

      {detail.criticalEvents.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--red)]">
            Casos críticos
          </p>
          <ul className="mt-2 space-y-1">
            {detail.criticalEvents.map((item) => (
              <li
                key={item.kind}
                className="rounded-xl border border-[var(--red)]/20 bg-[var(--red-soft)] px-3 py-2 text-sm text-[var(--red)]"
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Sin casos críticos.</p>
      )}

      <ClinicalFormCard value={detail.structure} readOnly />
    </div>
  );
}

export function RecordDetailModal({
  detail,
  onClose,
}: {
  detail: RecordDetailView;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[0_24px_80px_rgba(15,27,45,0.18)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[0.16em]">FICHA</p>
          <Button variant="quiet" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <RecordDetailBody detail={detail} />
      </div>
    </div>
  );
}
