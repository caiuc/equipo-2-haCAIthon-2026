"use client";

import { Button } from "@/components/ui/Button";
import type { BedStructuredUpdate } from "@/lib/intake/bedParser";
import type { BedOccupancy, ErPatientStatus } from "@/types/beds";
import { useState } from "react";

const PATIENT_OPTIONS: Array<{ value: ErPatientStatus; label: string }> = [
  { value: "CRITICAL", label: "Crítico" },
  { value: "STABLE", label: "Estable" },
  { value: "OBSERVATION", label: "Observación" },
  { value: "WAITING", label: "En espera" },
];

function defaultsFrom(parsed: BedStructuredUpdate | null) {
  return {
    bedNumber: parsed?.bedNumber ?? 1,
    status: parsed?.status ?? "OCCUPIED",
    patientStatus: parsed?.patientStatus ?? "STABLE",
    patientLabel: parsed?.patientLabel ?? "",
    chiefComplaint: parsed?.chiefComplaint ?? "",
    notes: parsed?.transcript ?? "",
  };
}

export function BedAdmissionForm({
  parsed,
  highlight,
  onSaved,
}: {
  parsed: BedStructuredUpdate | null;
  highlight: boolean;
  onSaved: () => void;
}) {
  const initial = defaultsFrom(parsed);
  const [bedNumber, setBedNumber] = useState(initial.bedNumber);
  const [status, setStatus] = useState<BedOccupancy>(initial.status);
  const [patientStatus, setPatientStatus] = useState<ErPatientStatus>(
    initial.patientStatus,
  );
  const [patientLabel, setPatientLabel] = useState(initial.patientLabel);
  const [chiefComplaint, setChiefComplaint] = useState(initial.chiefComplaint);
  const [notes, setNotes] = useState(initial.notes);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    status === "FREE" || (status === "OCCUPIED" && Boolean(patientStatus));

  async function confirm() {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch("/api/beds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedNumber,
          status,
          patientStatus: status === "OCCUPIED" ? patientStatus : null,
          patientLabel: status === "OCCUPIED" ? patientLabel : null,
          chiefComplaint: status === "OCCUPIED" ? chiefComplaint : null,
          notes,
        }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setError(
          data.error === "patient_status_required"
            ? "Si la cama está ocupada, indica el estado del paciente."
            : "No se pudo registrar la ficha.",
        );
        return;
      }
      setFeedback(data.message ?? "Ficha registrada.");
      onSaved();
    } catch {
      setError("Error de red al guardar la cama.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={`rounded-xl border bg-[var(--panel)] p-4 ${
        highlight ? "border-teal-500 ring-2 ring-teal-400/50" : "border-[var(--line)]"
      }`}
    >
      <h2 className="text-sm font-semibold">Ficha de ingreso / estado de cama</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        El parser rellena campos; el médico confirma antes de persistir.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Cama
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
            value={bedNumber}
            onChange={(event) => setBedNumber(Number(event.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Cama {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Ocupación
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as BedOccupancy)}
          >
            <option value="OCCUPIED">Ocupada</option>
            <option value="FREE">Libre</option>
          </select>
        </label>
      </div>

      {status === "OCCUPIED" ? (
        <div className="mt-3 grid gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Estado del paciente
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
              value={patientStatus}
              onChange={(event) =>
                setPatientStatus(event.target.value as ErPatientStatus)
              }
            >
              {PATIENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Etiqueta (anónima)
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
              value={patientLabel}
              onChange={(event) => setPatientLabel(event.target.value)}
              placeholder="Paciente U-005"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Motivo de ingreso
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
              value={chiefComplaint}
              onChange={(event) => setChiefComplaint(event.target.value)}
              placeholder="dolor torácico"
            />
          </label>
        </div>
      ) : null}

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Notas / transcripción
        <textarea
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <Button
        className="mt-4 w-full"
        onClick={() => void confirm()}
        disabled={!canSave || saving}
      >
        {saving ? "Registrando…" : "Confirmar y registrar"}
      </Button>
      {feedback ? <p className="mt-3 text-sm text-emerald-700">{feedback}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
