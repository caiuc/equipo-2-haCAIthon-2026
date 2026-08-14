"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import {
  DEMO_FACILITY_PHRASE,
  DEMO_PATIENT_PHRASE,
  parseOperationalText,
  type StructuredUpdate,
} from "@/lib/intake/parser";
import { useMockStore } from "@/lib/mock/mockStore";
import { useMemo, useState } from "react";

export function VoiceIntake() {
  const { facilities, patients, applyStructuredUpdate } = useMockStore();
  const [channel, setChannel] = useState<"facility" | "patient">("facility");
  const [facilityId, setFacilityId] = useState(facilities[0]?.facilityId ?? "");
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    transcript,
    setTranscript,
    listening,
    transcribing,
    speechError,
    startListening,
    stopListening,
  } = useVoiceCapture({
    whisperEnabled: true,
    fallbackToWebSpeech: true,
  });

  const parsed: StructuredUpdate | null = useMemo(() => {
    if (!transcript.trim()) return null;
    return parseOperationalText(transcript);
  }, [transcript]);

  function confirm() {
    if (!parsed) return;
    const result = applyStructuredUpdate(
      { ...parsed, target: channel },
      channel === "facility" ? facilityId : undefined,
      channel === "patient" ? patientId : undefined,
    );
    setFeedback(result.message);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="text-sm font-semibold">Captura de voz (Whisper + fallback)</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          La transcripción no cambia el tablero sola: un coordinador debe
          verificar el objeto estructurado.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={listening ? stopListening : () => void startListening()}
            variant={listening ? "danger" : "primary"}
            disabled={transcribing}
          >
            {listening ? "Detener captura" : transcribing ? "Transcribiendo…" : "Grabar reporte"}
          </Button>
          <Button
            variant="quiet"
            onClick={() =>
              setTranscript(
                channel === "facility" ? DEMO_FACILITY_PHRASE : DEMO_PATIENT_PHRASE,
              )
            }
          >
            Usar frase de demo
          </Button>
        </div>
        {speechError ? (
          <p className="mt-3 text-xs text-amber-700">{speechError}</p>
        ) : null}
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Texto libre
        </label>
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={5}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-3 text-sm outline-none ring-teal-400/40 focus:ring-2"
          placeholder="Ej. Quedan cuatro horas de generador, no tenemos agua en el centro norte y el acceso está cortado"
        />
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex gap-2">
          <Button
            variant={channel === "facility" ? "primary" : "quiet"}
            onClick={() => setChannel("facility")}
          >
            Establecimiento
          </Button>
          <Button
            variant={channel === "patient" ? "primary" : "quiet"}
            onClick={() => setChannel("patient")}
          >
            Paciente / cuidador
          </Button>
        </div>

        {channel === "facility" ? (
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Destino
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
            >
              {facilities.map((facility) => (
                <option key={facility.facilityId} value={facility.facilityId}>
                  {facility.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Caso
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-2 text-sm"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.anonymousCode} · {patient.currentZone}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Parser mock (pendiente de verificación)
            </p>
            {parsed ? <Badge tone="warn">{parsed.confidence}</Badge> : null}
          </div>
          <pre className="max-h-56 overflow-auto rounded-lg bg-[var(--input)] p-3 font-mono text-[11px] leading-relaxed text-teal-900">
            {parsed
              ? JSON.stringify(
                  {
                    power_status: parsed.power_status,
                    backup_hours: parsed.backup_hours,
                    water_status: parsed.water_status,
                    access_status: parsed.access_status,
                    need_type: parsed.need_type,
                    mobility: parsed.mobility,
                    facility: parsed.facilityNameHint,
                    case: parsed.patientCodeHint,
                    confidence: parsed.confidence,
                  },
                  null,
                  2,
                )
              : "Esperando texto…"}
          </pre>
        </div>

        <Button className="mt-4 w-full" onClick={confirm} disabled={!parsed}>
          Verificar y enviar al tablero
        </Button>
        {feedback ? (
          <p className="mt-3 text-sm text-emerald-700">{feedback}</p>
        ) : (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Sin confirmación humana no se modifica el estado operacional.
          </p>
        )}
      </section>
    </div>
  );
}
