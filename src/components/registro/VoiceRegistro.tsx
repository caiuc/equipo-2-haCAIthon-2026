"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { publishClinicalConfirmation } from "@shared/publish";
import {
  DEMO_HOSPITAL_ID,
  DEMO_HOSPITALIZATION_PHRASE,
  DEMO_PROFESSIONAL_ID,
  DEMO_UNCERTAINTY_PHRASE,
  EVENT_LABEL,
  type ClinicalStructure,
} from "@shared/clinical";
import { parseClinicalText } from "@shared/clinicalParser";
import { useEffect, useState } from "react";

export function VoiceRegistro() {
  const capture = useVoiceCapture({
    whisperEnabled: true,
    fallbackToWebSpeech: true,
  });
  const [structured, setStructured] = useState<ClinicalStructure | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [phase, setPhase] = useState<"idle" | "live" | "review" | "done">("idle");

  useEffect(() => {
    const text = capture.transcript.trim();
    if (!text) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (cancelled) return;
      setStructuring(true);
      fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      })
        .then(async (response) => {
          if (!response.ok) return parseClinicalText(text);
          return (await response.json()) as ClinicalStructure;
        })
        .catch(() => parseClinicalText(text))
        .then((result) => {
          if (!cancelled) {
            setStructured(result);
            setPhase("review");
          }
        })
        .finally(() => {
          if (!cancelled) setStructuring(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [capture.transcript]);

  async function confirm() {
    if (!structured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback("Falta SUPABASE_URL / SUPABASE_KEY en .env. Pega el SQL y las claves.");
      return;
    }
    try {
      const result = await publishClinicalConfirmation(supabase, {
        hospitalId: DEMO_HOSPITAL_ID,
        professionalId: DEMO_PROFESSIONAL_ID,
        structure: structured,
      });
      setFeedback(result.message);
      setPublished(true);
      setPhase("done");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo publicar");
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[980px] gap-4 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--blue)]">
          Hospital A · Urgencia adultos
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {phase === "idle" && "Mic inactivo"}
          {phase === "live" && "Grabando"}
          {phase === "review" && "IA propone"}
          {phase === "done" && "Publicado en la consola central"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          El audio no se almacena: queda la transcripción y los eventos.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant={capture.listening ? "danger" : "primary"}
            disabled={capture.transcribing}
            onClick={() => {
              if (capture.listening) {
                capture.stopListening();
                return;
              }
              setPublished(false);
              setFeedback(null);
              setPhase("live");
              void capture.startListening();
            }}
          >
            {capture.listening
              ? "Terminar registro"
              : capture.transcribing
                ? "Transcribiendo…"
                : "Activar micrófono"}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setPublished(false);
              capture.setTranscript(DEMO_HOSPITALIZATION_PHRASE);
            }}
          >
            Demo UCI
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setPublished(false);
              capture.setTranscript(DEMO_UNCERTAINTY_PHRASE);
            }}
          >
            Demo incertidumbre
          </Button>
        </div>
        {capture.speechError ? (
          <p className="mt-3 text-xs text-[var(--amber)]">{capture.speechError}</p>
        ) : null}

        <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Transcripción en vivo
        </label>
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-[var(--line)] bg-[var(--wash)] p-3 text-sm"
          value={capture.transcript}
          onChange={(event) => capture.setTranscript(event.target.value)}
          placeholder="Habla o pega el dictado clínico…"
        />
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Extracción estructurada</h2>
          {structuring ? <Badge tone="info">Detectando</Badge> : null}
        </div>
        {!structured ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Aún no hay eventos. Graba o usa una frase de demo.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {structured.events.map((event) => {
              const possible =
                event === "POSSIBLE_ICU_REQUIREMENT" ||
                structured.icu.certainty === "possible" ||
                structured.icu.certainty === "conditional";
              return (
                <li
                  key={event}
                  className="rounded-xl border border-[var(--line)] px-3 py-2"
                >
                  <p className="text-sm font-medium">
                    {possible && event.includes("ICU") ? "⚠ " : "✓ "}
                    {EVENT_LABEL[event]}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {event === "POSSIBLE_ICU_REQUIREMENT"
                      ? "Pendiente de confirmación · no suma a demanda"
                      : structured.relevant_condition ?? "Listo para publicar"}
                  </p>
                </li>
              );
            })}
            <li className="text-xs text-[var(--muted)]">
              {structured.sex === "M" ? "Masc" : structured.sex === "F" ? "Fem" : "Sexo n/d"}
              {structured.age_years ? ` · ${structured.age_years} a` : ""} · {structured.source}
            </li>
          </ul>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => void confirm()} disabled={!structured || published}>
            Confirmar y publicar
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              capture.setTranscript("");
              setStructured(null);
              setPublished(false);
              setPhase("idle");
            }}
          >
            Registrar otro
          </Button>
        </div>
        {feedback ? (
          <p className="mt-3 text-sm text-[var(--green)]">{feedback}</p>
        ) : null}
      </section>
    </div>
  );
}
