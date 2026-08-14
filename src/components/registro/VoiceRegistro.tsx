"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  LoaderCircle,
  Mic,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
} from "lucide-react";
import { publishClinicalConfirmation } from "@shared/publish";
import {
  DEMO_HOSPITAL_ID,
  DEMO_HOSPITALIZATION_PHRASE,
  DEMO_PROFESSIONAL_ID,
  DEMO_UNCERTAINTY_PHRASE,
  EVENT_LABEL,
  type ClinicalStructure,
  type IcuCertainty,
  withDerivedEvents,
} from "@shared/clinical";
import { parseClinicalText } from "@shared/clinicalParser";
import { useEffect, useMemo, useRef, useState } from "react";

const PHASE_COPY = {
  idle: {
    title: "Nuevo registro clínico",
    helper: "Activa el micrófono para comenzar un dictado deliberado.",
    tone: "neutral" as const,
    label: "Listo",
  },
  requesting_permission: {
    title: "Solicitando acceso al micrófono",
    helper: "Acepta el permiso del navegador para iniciar la captura.",
    tone: "info" as const,
    label: "Conectando",
  },
  listening: {
    title: "Escuchando reporte clínico",
    helper: "La transcripción y la ficha se actualizan mientras hablas.",
    tone: "bad" as const,
    label: "Grabando",
  },
  stopping: {
    title: "Cerrando la grabación",
    helper: "Estamos preparando el audio para su transcripción final.",
    tone: "warn" as const,
    label: "Procesando",
  },
  transcribing: {
    title: "Whisper está consolidando el texto",
    helper: "Conservamos la versión en vivo hasta recibir la corrección final.",
    tone: "info" as const,
    label: "Transcribiendo",
  },
  review: {
    title: "Registro listo para revisión",
    helper: "Corrige la transcripción o la ficha antes de confirmar.",
    tone: "ok" as const,
    label: "Revisar",
  },
  error: {
    title: "El registro necesita atención",
    helper: "Puedes reintentar o escribir el reporte manualmente.",
    tone: "warn" as const,
    label: "Atención",
  },
};

export function VoiceRegistro() {
  const capture = useVoiceCapture({
    whisperEnabled: true,
    fallbackToWebSpeech: true,
  });
  const [structured, setStructured] = useState<ClinicalStructure | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [edited, setEdited] = useState(false);
  const requestSequence = useRef(0);
  const phaseCopy = PHASE_COPY[capture.phase];

  useEffect(() => {
    const text = capture.transcript.trim();
    const requestId = ++requestSequence.current;
    if (!text) {
      const emptyHandle = window.setTimeout(() => {
        setStructured(null);
        setStructuring(false);
      }, 0);
      return () => window.clearTimeout(emptyHandle);
    }

    const local = parseClinicalText(text);
    const localHandle = window.setTimeout(() => setStructured(local), 0);

    if (capture.phase !== "review") {
      return () => window.clearTimeout(localHandle);
    }
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setStructuring(true);
      try {
        const response = await fetch("/api/structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text }),
          signal: controller.signal,
        });
        const result = response.ok
          ? ((await response.json()) as ClinicalStructure)
          : local;
        if (requestId === requestSequence.current) setStructured(result);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestId === requestSequence.current) setStructured(local);
      } finally {
        if (requestId === requestSequence.current) setStructuring(false);
      }
    }, 650);

    return () => {
      controller.abort();
      window.clearTimeout(localHandle);
      window.clearTimeout(handle);
    };
  }, [capture.phase, capture.transcript]);

  const wave = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const shape = 0.32 + ((index * 7) % 10) / 16;
        return Math.max(0.18, Math.min(1, capture.audioLevel * 1.35 + shape * 0.18));
      }),
    [capture.audioLevel],
  );

  function patchStructure(patch: Partial<ClinicalStructure>) {
    requestSequence.current += 1;
    setStructured((current) =>
      current
        ? withDerivedEvents({
            ...current,
            ...patch,
            transcript: capture.finalTranscript,
          })
        : current,
    );
    setEdited(true);
    setPublished(false);
  }

  function updateBed(value: string) {
    const certainty: IcuCertainty =
      value === "uci"
        ? "confirmed"
        : value === "uci-possible"
          ? "possible"
          : "not_required";
    patchStructure({
      requires_hospitalization: value === "none" ? false : true,
      icu: {
        certainty,
        confidence: value === "uci" ? 0.93 : value === "uci-possible" ? 0.71 : null,
      },
      uti_required: value === "uti",
      basic_bed_required: value === "basica",
    });
  }

  async function confirm() {
    if (!structured || publishing) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback("Falta configurar la conexión con Supabase en el entorno local.");
      return;
    }
    setPublishing(true);
    setFeedback(null);
    try {
      const finalStructure = withDerivedEvents({
        ...structured,
        transcript: capture.finalTranscript || structured.transcript,
      });
      const result = await publishClinicalConfirmation(supabase, {
        hospitalId: DEMO_HOSPITAL_ID,
        professionalId: DEMO_PROFESSIONAL_ID,
        structure: finalStructure,
        sttEngine: capture.sttEngine,
        durationSeconds: capture.durationSeconds,
        edited,
      });
      setFeedback(result.message);
      setPublished(true);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo publicar");
    } finally {
      setPublishing(false);
    }
  }

  function startNew() {
    capture.reset();
    setStructured(null);
    setPublished(false);
    setPublishing(false);
    setFeedback(null);
    setEdited(false);
  }

  const canEdit = Boolean(structured) && !capture.listening && !capture.transcribing;
  const bedValue = structured
    ? structured.icu.certainty === "confirmed"
      ? "uci"
      : structured.icu.certainty === "possible" ||
          structured.icu.certainty === "conditional"
        ? "uci-possible"
        : structured.uti_required
          ? "uti"
          : structured.basic_bed_required
            ? "basica"
            : "none"
    : "none";

  return (
    <div className="sirena-page mx-auto w-full max-w-[1380px] px-4 py-6 lg:px-8 lg:py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--blue)]">
            <span>SIRENA</span>
            <span className="text-[var(--soft)]">/</span>
            <span className="text-[var(--muted)]">Registro clínico por voz</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] md:text-[30px]">
            {phaseCopy.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
            {phaseCopy.helper}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={phaseCopy.tone} className="gap-1.5 px-3 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                capture.listening ? "animate-pulse bg-current" : "bg-current"
              }`}
            />
            {phaseCopy.label}
          </Badge>
          <Badge tone="neutral">Hospital A · Urgencia adultos</Badge>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="sirena-panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Captura deliberada</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  El audio se procesa temporalmente y no se almacena.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <ShieldCheck className="h-4 w-4 text-[var(--green)]" />
                Confirmación humana
              </div>
            </div>
          </div>

          <div className="px-5 py-6 md:px-6">
            <div className="flex flex-col items-center rounded-2xl border border-[var(--line)] bg-[linear-gradient(180deg,#f8fbff_0%,#f4f7fb_100%)] px-4 py-7 text-center">
              <button
                type="button"
                aria-label={capture.listening ? "Detener grabación" : "Activar micrófono"}
                aria-pressed={capture.listening}
                disabled={
                  capture.phase === "requesting_permission" ||
                  capture.phase === "stopping" ||
                  capture.phase === "transcribing"
                }
                onClick={() => {
                  if (capture.listening) {
                    capture.stopListening();
                    return;
                  }
                  setPublished(false);
                  setFeedback(null);
                  setStructured(null);
                  setEdited(false);
                  void capture.startListening();
                }}
                className={`sirena-mic relative flex h-24 w-24 items-center justify-center rounded-full text-white transition disabled:cursor-wait disabled:opacity-70 ${
                  capture.listening
                    ? "is-live bg-[var(--red)] shadow-[0_14px_40px_rgba(194,70,50,0.28)]"
                    : "bg-[var(--blue)] shadow-[0_14px_40px_rgba(29,78,216,0.24)] hover:-translate-y-0.5 hover:bg-[#1946c5]"
                }`}
              >
                {capture.phase === "requesting_permission" || capture.transcribing ? (
                  <LoaderCircle className="h-9 w-9 animate-spin" />
                ) : capture.listening ? (
                  <Square className="h-8 w-8 fill-current" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>

              <div className="mt-5 flex items-center gap-2">
                {capture.listening ? (
                  <CircleDot className="h-4 w-4 animate-pulse text-[var(--red)]" />
                ) : (
                  <Mic className="h-4 w-4 text-[var(--blue)]" />
                )}
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatDuration(capture.durationSeconds)}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {capture.listening
                    ? "En vivo"
                    : capture.phase === "review"
                      ? "Grabación finalizada"
                      : "Toca para comenzar"}
                </span>
              </div>

              <div className="mt-5 flex h-10 w-full max-w-sm items-center justify-center gap-1" aria-hidden="true">
                {wave.map((level, index) => (
                  <span
                    key={index}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      capture.listening ? "bg-[var(--red)]" : "bg-[#bfd0ef]"
                    }`}
                    style={{ height: `${Math.round(7 + level * 28)}px` }}
                  />
                ))}
              </div>

              <p className="mt-3 text-xs text-[var(--muted)]">
                {capture.liveSupported
                  ? "Texto en vivo disponible · corrección final con Whisper"
                  : "Whisper transcribirá el audio al finalizar"}
              </p>
            </div>

            {capture.speechError ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--amber)]/20 bg-[var(--amber-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--amber)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {capture.speechError}
              </div>
            ) : null}

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="clinical-transcript" className="sirena-label">
                  Transcripción {capture.listening ? "en vivo" : "clínica"}
                </label>
                <div className="flex items-center gap-2">
                  {capture.interimTranscript ? (
                    <Badge tone="info">Escuchando frase</Badge>
                  ) : null}
                  {capture.sttEngine === "groq-whisper" ? (
                    <Badge tone="ok">Corregida por Whisper</Badge>
                  ) : null}
                </div>
              </div>
              <div className="relative mt-2">
                <textarea
                  id="clinical-transcript"
                  className="sirena-input min-h-44 w-full resize-y p-4 text-[15px] leading-7"
                  value={capture.transcript}
                  readOnly={capture.listening || capture.transcribing}
                  onChange={(event) => {
                    capture.setTranscript(event.target.value);
                    setEdited(true);
                    setPublished(false);
                  }}
                  placeholder="La transcripción aparecerá aquí mientras hablas. También puedes escribir o pegar el reporte clínico."
                />
                {capture.interimTranscript ? (
                  <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-[var(--blue-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--blue)]">
                    Texto provisional
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="quiet"
                  disabled={capture.listening || capture.transcribing}
                  onClick={() => {
                    startNew();
                    capture.setTranscript(DEMO_HOSPITALIZATION_PHRASE);
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Demo UCI
                </Button>
                <Button
                  variant="quiet"
                  disabled={capture.listening || capture.transcribing}
                  onClick={() => {
                    startNew();
                    capture.setTranscript(DEMO_UNCERTAINTY_PHRASE);
                  }}
                >
                  <AlertTriangle className="h-4 w-4" /> Demo incertidumbre
                </Button>
              </div>
              {capture.transcript ? (
                <button
                  type="button"
                  disabled={capture.listening || capture.transcribing}
                  onClick={startNew}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Limpiar registro
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="sirena-panel flex min-h-[640px] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 md:px-6">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-[var(--blue)]" />
                <h2 className="text-sm font-semibold">Ficha clínica propuesta</h2>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Se completa con la transcripción y requiere validación.
              </p>
            </div>
            {structuring ? (
              <Badge tone="info" className="gap-1.5">
                <LoaderCircle className="h-3 w-3 animate-spin" /> Estructurando
              </Badge>
            ) : structured ? (
              <Badge tone={edited ? "warn" : "ok"}>{edited ? "Editada" : "Detectada"}</Badge>
            ) : (
              <Badge tone="neutral">Sin datos</Badge>
            )}
          </div>

          {!structured ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Esperando información clínica</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                Al comenzar el dictado, SIRENA identificará al paciente, su condición y el requerimiento de cama.
              </p>
            </div>
          ) : (
            <div className="flex-1 px-5 py-5 md:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Código paciente">
                  <input
                    className="sirena-input"
                    disabled={!canEdit}
                    value={structured.patient_code_hint ?? ""}
                    placeholder="PAC-00000"
                    onChange={(event) =>
                      patchStructure({ patient_code_hint: event.target.value || null })
                    }
                  />
                </Field>
                <Field label="Edad">
                  <div className="grid grid-cols-[1fr_96px] gap-2">
                    <input
                      className="sirena-input"
                      type="number"
                      min={0}
                      max={130}
                      disabled={!canEdit}
                      value={structured.age_years ?? ""}
                      placeholder="Años"
                      onChange={(event) =>
                        patchStructure({
                          age_years: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    />
                    <select
                      className="sirena-input"
                      disabled={!canEdit}
                      value={structured.sex ?? ""}
                      onChange={(event) =>
                        patchStructure({
                          sex: (event.target.value || null) as "M" | "F" | null,
                        })
                      }
                    >
                      <option value="">Sexo</option>
                      <option value="F">Fem.</option>
                      <option value="M">Masc.</option>
                    </select>
                  </div>
                </Field>
                <Field label="Condición relevante" wide>
                  <input
                    className="sirena-input"
                    disabled={!canEdit}
                    value={structured.relevant_condition ?? ""}
                    placeholder="Sin condición detectada"
                    onChange={(event) =>
                      patchStructure({ relevant_condition: event.target.value || null })
                    }
                  />
                </Field>
                <Field label="Hospitalización">
                  <select
                    className="sirena-input"
                    disabled={!canEdit}
                    value={
                      structured.requires_hospitalization === null
                        ? ""
                        : structured.requires_hospitalization
                          ? "yes"
                          : "no"
                    }
                    onChange={(event) =>
                      patchStructure({
                        requires_hospitalization:
                          event.target.value === "" ? null : event.target.value === "yes",
                      })
                    }
                  >
                    <option value="">Sin determinar</option>
                    <option value="yes">Requerida</option>
                    <option value="no">No requerida</option>
                  </select>
                </Field>
                <Field label="Requerimiento de cama">
                  <select
                    className="sirena-input"
                    disabled={!canEdit}
                    value={bedValue}
                    onChange={(event) => updateBed(event.target.value)}
                  >
                    <option value="none">Sin requerimiento</option>
                    <option value="uci">UCI confirmada</option>
                    <option value="uci-possible">UCI posible</option>
                    <option value="uti">UTI / intermedia</option>
                    <option value="basica">Hospitalización básica</option>
                  </select>
                </Field>
                <Field label="Aislamiento">
                  <select
                    className="sirena-input"
                    disabled={!canEdit}
                    value={structured.isolation_required ? "yes" : "no"}
                    onChange={(event) =>
                      patchStructure({ isolation_required: event.target.value === "yes" })
                    }
                  >
                    <option value="no">No requerido</option>
                    <option value="yes">Requerido</option>
                  </select>
                </Field>
                <Field label="Alta médica">
                  <select
                    className="sirena-input"
                    disabled={!canEdit}
                    value={structured.discharge_ordered ? "yes" : "no"}
                    onChange={(event) =>
                      patchStructure({ discharge_ordered: event.target.value === "yes" })
                    }
                  >
                    <option value="no">No indicada</option>
                    <option value="yes">Indicada</option>
                  </select>
                </Field>
              </div>

              <div className="mt-6 border-t border-[var(--line)] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="sirena-label">Eventos operacionales</h3>
                  <span className="text-[11px] text-[var(--muted)]">
                    {structured.events.length} detectados
                  </span>
                </div>
                {structured.events.length ? (
                  <ul className="mt-3 space-y-2">
                    {structured.events.map((event) => {
                      const possible = event === "POSSIBLE_ICU_REQUIREMENT";
                      return (
                        <li
                          key={event}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                            possible
                              ? "border-[var(--amber)]/25 bg-[var(--amber-soft)]"
                              : "border-[var(--line)] bg-[var(--wash)]"
                          }`}
                        >
                          {possible ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--amber)]" />
                          ) : (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--green)]" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{EVENT_LABEL[event]}</p>
                            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                              {possible
                                ? "Pendiente de confirmación · no suma a demanda UCI"
                                : "Se publicará después de tu confirmación"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
                    No se detectaron eventos operacionales en el reporte.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-[var(--line)] bg-[var(--wash)] px-5 py-4 md:px-6">
            {feedback ? (
              <div
                className={`mb-3 flex items-center gap-2 text-sm ${
                  published ? "text-[var(--green)]" : "text-[var(--amber)]"
                }`}
              >
                {published ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {feedback}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <ShieldCheck className="h-3.5 w-3.5" /> Nunca se publica sin tu validación
              </p>
              <Button
                onClick={() => void confirm()}
                disabled={!structured || capture.listening || capture.transcribing || published || publishing}
                className="min-w-44"
              >
                {publishing ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {published ? "Registro publicado" : publishing ? "Publicando…" : "Confirmar y publicar"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="sirena-label mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
