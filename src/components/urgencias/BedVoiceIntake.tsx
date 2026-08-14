"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DEMO_BED_ADMIT_PHRASE,
  DEMO_BED_FREE_PHRASE,
  parseBedIntakeText,
} from "@/lib/intake/bedParser";

export function BedVoiceIntake({
  whisperEnabled,
  highlight,
  transcript,
  onTranscript,
  listening,
  transcribing,
  speechError,
  onStart,
  onStop,
}: {
  whisperEnabled: boolean;
  highlight: boolean;
  transcript: string;
  onTranscript: (value: string) => void;
  listening: boolean;
  transcribing: boolean;
  speechError: string | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const parsed = transcript.trim() ? parseBedIntakeText(transcript) : null;

  return (
    <section
      className={`rounded-xl border bg-[var(--panel)] p-4 ${
        highlight ? "border-teal-500 ring-2 ring-teal-400/50" : "border-[var(--line)]"
      }`}
    >
      <h2 className="text-sm font-semibold">Captura de voz (Whisper)</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Activa Whisper, graba el reporte y verifica la ficha antes de enviar.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={listening ? onStop : onStart}
          variant={listening ? "danger" : "primary"}
          disabled={transcribing || (!whisperEnabled && !listening)}
        >
          {listening
            ? "Detener captura"
            : transcribing
              ? "Transcribiendo…"
              : "Grabar con Whisper"}
        </Button>
        <Button variant="quiet" onClick={() => onTranscript(DEMO_BED_ADMIT_PHRASE)}>
          Frase ingreso
        </Button>
        <Button variant="quiet" onClick={() => onTranscript(DEMO_BED_FREE_PHRASE)}>
          Frase alta
        </Button>
      </div>
      {speechError ? (
        <p className="mt-3 text-xs text-amber-700">{speechError}</p>
      ) : null}
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Transcripción
      </label>
      <textarea
        value={transcript}
        onChange={(event) => onTranscript(event.target.value)}
        rows={5}
        className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] p-3 text-sm outline-none ring-teal-400/40 focus:ring-2"
        placeholder={DEMO_BED_ADMIT_PHRASE}
      />
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Parser (pendiente de verificación)
          </p>
          {parsed ? <Badge tone="warn">{parsed.confidence}</Badge> : null}
        </div>
        <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--input)] p-3 font-mono text-[11px] leading-relaxed">
          {parsed
            ? JSON.stringify(
                {
                  bedNumber: parsed.bedNumber,
                  status: parsed.status,
                  patientStatus: parsed.patientStatus,
                  patientLabel: parsed.patientLabel,
                  chiefComplaint: parsed.chiefComplaint,
                },
                null,
                2,
              )
            : "Esperando texto…"}
        </pre>
      </div>
    </section>
  );
}
