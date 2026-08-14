"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DEMO_FACILITY_PHRASE,
  DEMO_PATIENT_PHRASE,
  parseOperationalText,
  type StructuredUpdate,
} from "@/lib/intake/parser";
import { useMockStore } from "@/lib/mock/mockStore";
import { useMemo, useRef, useState } from "react";

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceIntake() {
  const { facilities, patients, applyStructuredUpdate } = useMockStore();
  const [channel, setChannel] = useState<"facility" | "patient">("facility");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState(facilities[0]?.facilityId ?? "");
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const mediaRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: BlobPart[];
  } | null>(null);

  const parsed: StructuredUpdate | null = useMemo(() => {
    if (!transcript.trim()) return null;
    return parseOperationalText(transcript);
  }, [transcript]);

  async function transcribeBlob(blob: Blob) {
    const file = new File([blob], "reporte.webm", {
      type: blob.type || "audio/webm",
    });
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/transcribe", { method: "POST", body });
    if (response.status === 501) return null;
    if (!response.ok) throw new Error("stt_failed");
    const data = (await response.json()) as { text?: string };
    return data.text?.trim() ?? "";
  }

  function startWebSpeech() {
    const Ctor = getRecognition();
    if (!Ctor) {
      setSpeechError(
        "No hay transcripción disponible. Usa una frase de demo o escribe el reporte.",
      );
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "es-CL";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      setTranscript(event.results[0]?.[0]?.transcript ?? "");
    };
    recognition.onerror = (event) => {
      setSpeechError(`Captura de voz no disponible (${event.error}). Usa el fallback.`);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    setSpeechError(null);
    setListening(true);
    recognition.start();
  }

  async function startListening() {
    setSpeechError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setTranscribing(true);
        try {
          const text = await transcribeBlob(blob);
          if (text) {
            setTranscript(text);
            return;
          }
          startWebSpeech();
        } catch {
          setSpeechError("Whisper no respondió. Prueba Web Speech o una frase de demo.");
          startWebSpeech();
        } finally {
          setTranscribing(false);
        }
      };
      mediaRef.current = { recorder, stream, chunks };
      recorder.start();
      setListening(true);
    } catch {
      startWebSpeech();
    }
  }

  function stopListening() {
    const current = mediaRef.current;
    if (current) {
      if (current.recorder.state !== "inactive") current.recorder.stop();
      setListening(false);
      return;
    }
    setListening(false);
  }

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
      <section className="rounded-xl border border-white/10 bg-[var(--panel)] p-4">
        <h2 className="text-sm font-semibold">Captura de voz (Whisper + fallback)</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          La transcripción no cambia el tablero sola: un coordinador debe
          verificar el objeto estructurado.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={listening ? stopListening : startListening}
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
          <p className="mt-3 text-xs text-amber-300">{speechError}</p>
        ) : null}
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Texto libre
        </label>
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={5}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none ring-teal-400/40 focus:ring-2"
          placeholder="Ej. Quedan cuatro horas de generador, no tenemos agua en el centro norte y el acceso está cortado"
        />
      </section>

      <section className="rounded-xl border border-white/10 bg-[var(--panel)] p-4">
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
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm"
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
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm"
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
          <pre className="max-h-56 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-teal-100">
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
          <p className="mt-3 text-sm text-emerald-300">{feedback}</p>
        ) : (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Sin confirmación humana no se modifica el estado operacional.
          </p>
        )}
      </section>
    </div>
  );
}
