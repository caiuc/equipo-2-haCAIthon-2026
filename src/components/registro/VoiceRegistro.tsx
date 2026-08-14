"use client";

import { ClinicalFormCard } from "@/components/records/ClinicalFormCard";
import { RecordDetailModal } from "@/components/records/RecordDetail";
import { SirenaLogo, SirenaMark } from "@/components/brand/SirenaLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LiveChipRow, VoiceBars } from "@/components/registro/VoiceBars";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { publishClinicalConfirmation } from "@shared/publish";
import {
  DEMO_HOSPITAL_ID,
  DEMO_HOSPITALIZATION_PHRASE,
  DEMO_PROFESSIONAL_ID,
  DEMO_UNCERTAINTY_PHRASE,
  type ClinicalStructure,
} from "@shared/clinical";
import { detectLiveChips, parseClinicalText } from "@shared/clinicalParser";
import type { ClinicalEvent, VoiceRecord } from "@shared/database.types";
import { buildRecordDetail } from "@shared/recordDetail";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

type Phase = "idle" | "live" | "review" | "done";

export function VoiceRegistro() {
  const capture = useVoiceCapture();
  const [structured, setStructured] = useState<ClinicalStructure | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [recent, setRecent] = useState<VoiceRecord[]>([]);
  const [recentEvents, setRecentEvents] = useState<ClinicalEvent[]>([]);
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);

  const busy = capture.listening || capture.transcribing;
  const hasText = capture.transcript.trim().length > 0;
  const events = hasText ? structured : null;
  const liveText = capture.transcript.trim() || capture.livePreview;
  const chips = useMemo(() => detectLiveChips(liveText), [liveText]);

  const phase: Phase = published
    ? "done"
    : busy
      ? "live"
      : hasText
        ? "review"
        : "idle";

  const openDetail = useMemo(() => {
    if (!openRecordId) return null;
    const record = recent.find((item) => item.id === openRecordId);
    if (!record) return null;
    return buildRecordDetail(record, recentEvents);
  }, [openRecordId, recent, recentEvents]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void Promise.all([
      supabase
        .from("voice_records")
        .select("*")
        .eq("hospital_id", DEMO_HOSPITAL_ID)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("clinical_events")
        .select("*")
        .eq("hospital_id", DEMO_HOSPITAL_ID)
        .order("created_at", { ascending: false })
        .limit(40),
    ]).then(([voices, events]) => {
      if (voices.data) setRecent(voices.data);
      if (events.data) setRecentEvents(events.data);
    });
  }, [published]);

  useEffect(() => {
    if (busy) return;
    const text = capture.transcript.trim();
    if (!text) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
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
          if (!cancelled) setStructured(result);
        })
        .finally(() => {
          if (!cancelled) setStructuring(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [busy, capture.transcript]);

  async function confirm() {
    if (!structured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback(
        "Falta SUPABASE_URL / SUPABASE_KEY en .env. Pega el SQL y las claves.",
      );
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
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo publicar");
    }
  }

  function applyDemo(phrase: string) {
    capture.stopListening();
    setPublished(false);
    setFeedback(null);
    capture.setTranscript(phrase);
  }

  function startMic() {
    setPublished(false);
    setFeedback(null);
    setStructured(null);
    void capture.startListening();
  }

  function resetAll() {
    capture.reset();
    setStructured(null);
    setPublished(false);
    setFeedback(null);
  }

  return (
    <div className="mx-auto w-full max-w-[430px] px-4 py-5">
      {phase === "idle" ? (
        <IdleScreen
          recent={recent}
          onHoldStart={startMic}
          onDemoUci={() => applyDemo(DEMO_HOSPITALIZATION_PHRASE)}
          onDemoMaybe={() => applyDemo(DEMO_UNCERTAINTY_PHRASE)}
          onOpenRecord={setOpenRecordId}
        />
      ) : null}

      {phase === "live" ? (
        <LiveScreen
          bars={capture.bars}
          elapsedMs={capture.elapsedMs}
          liveText={liveText}
          chips={chips}
          error={capture.speechError}
          transcribing={capture.transcribing && !capture.listening}
          onFinish={() => capture.stopListening()}
        />
      ) : null}

      {phase === "review" && structured ? (
        <ReviewScreen
          structured={structured}
          structuring={structuring}
          feedback={feedback}
          onConfirm={() => void confirm()}
          onRepeat={resetAll}
          onChange={(next) => {
            const transcriptChanged = next.transcript !== structured.transcript;
            setStructured(next);
            if (transcriptChanged) capture.setTranscript(next.transcript);
          }}
        />
      ) : null}

      {phase === "review" && !structured ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <p className="text-sm text-[var(--muted)]">
            {structuring ? "La IA está leyendo el texto…" : "Preparando propuesta."}
          </p>
        </div>
      ) : null}

      {phase === "done" && events ? (
        <DoneScreen
          structured={events}
          feedback={feedback}
          onAgain={resetAll}
        />
      ) : null}

      {openDetail ? (
        <RecordDetailModal
          detail={openDetail}
          onClose={() => setOpenRecordId(null)}
        />
      ) : null}
    </div>
  );
}

function IdleScreen({
  recent,
  onHoldStart,
  onDemoUci,
  onDemoMaybe,
  onOpenRecord,
}: {
  recent: VoiceRecord[];
  onHoldStart: () => void;
  onDemoUci: () => void;
  onDemoMaybe: () => void;
  onOpenRecord: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <SirenaMark size={36} subtitle="Hospital A · Urgencia adultos" />
        <Badge tone="neutral">● Mic inactivo</Badge>
      </div>

      <div className="mt-14 flex flex-col items-center">
        <button
          type="button"
          onClick={onHoldStart}
          className="flex h-[148px] w-[148px] items-center justify-center rounded-full border-[3px] border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)] shadow-[0_16px_40px_rgba(14,159,110,0.18)]"
          aria-label="Activar micrófono"
        >
          <span className="flex h-14 w-10 items-end justify-center rounded-md border-[3px] border-current">
            <span className="mb-1 h-4 w-1 rounded-full bg-current" />
          </span>
        </button>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--green)]">
          Mantener
        </p>
        <p className="mt-3 max-w-[260px] text-center text-sm leading-relaxed text-[var(--muted)]">
          El micrófono se activa solo mientras usted lo mantiene. No hay escucha
          continua.
        </p>
      </div>

      <div className="mt-8 flex gap-2">
        <Button variant="quiet" className="flex-1" onClick={onDemoUci}>
          Demo UCI
        </Button>
        <Button variant="quiet" className="flex-1" onClick={onDemoMaybe}>
          Incertidumbre
        </Button>
      </div>

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Mis últimos registros
      </p>
      <div className="mt-3 space-y-2">
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Aún no hay registros en este hospital.
          </p>
        ) : (
          recent.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenRecord(item.id)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-left"
            >
              <p className="font-mono text-[11px] text-[var(--green)]">
                {item.status}
              </p>
              <p className="mt-1 line-clamp-2 text-sm">{item.transcript}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function LiveScreen({
  bars,
  elapsedMs,
  liveText,
  chips,
  error,
  transcribing,
  onFinish,
}: {
  bars: number[];
  elapsedMs: number;
  liveText: string;
  chips: ReturnType<typeof detectLiveChips>;
  error: string | null;
  transcribing: boolean;
  onFinish: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [liveText]);

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <SirenaLogo size={28} />
        <Badge tone="bad">● Grabando {formatClock(elapsedMs)}</Badge>
      </div>
      <div className="mt-4 shrink-0">
        <VoiceBars bars={bars} active />
      </div>
      <p className="mt-4 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Transcripción en vivo
      </p>
      <div
        ref={boxRef}
        className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl bg-[var(--wash)] p-4 text-[15px] leading-7"
      >
        {liveText || (
          <span className="text-[var(--muted)]">
            {transcribing
              ? "Cerrando el último fragmento…"
              : "Hable ahora. El texto aparece acá."}
          </span>
        )}
        {liveText ? (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[var(--green)] align-middle" />
        ) : null}
      </div>
      <p className="mt-3 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Detectando mientras habla
      </p>
      <div className="mt-2 max-h-16 shrink-0 overflow-x-auto overflow-y-hidden">
        <LiveChipRow chips={chips} />
      </div>
      <p className="mt-2 shrink-0 text-xs text-[var(--muted)]">
        El audio no se almacena: queda la transcripción y los eventos.
      </p>
      {error ? (
        <p className="mt-2 shrink-0 text-sm text-[var(--amber)]">{error}</p>
      ) : null}
      <div className="shrink-0 bg-[var(--bg)] pt-4 pb-1">
        <button
          type="button"
          onClick={onFinish}
          className="w-full rounded-2xl bg-[var(--green)] py-3.5 text-sm font-semibold text-white"
        >
          {transcribing ? "Procesando dictado…" : "Detener grabación"}
        </button>
      </div>
    </div>
  );
}

function ReviewScreen({
  structured,
  structuring,
  feedback,
  onConfirm,
  onRepeat,
  onChange,
}: {
  structured: ClinicalStructure;
  structuring: boolean;
  feedback: string | null;
  onConfirm: () => void;
  onRepeat: () => void;
  onChange: (next: ClinicalStructure) => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">
            Paciente {structured.patient_code_hint ?? "nuevo"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Formulario propuesto · editable antes de publicar
          </p>
        </div>
        <Badge tone="info">IA propone</Badge>
      </div>
      <div className="mt-4">
        <ClinicalFormCard value={structured} onChange={onChange} />
      </div>
      {structuring ? (
        <p className="mt-3 text-xs text-[var(--blue)]">Actualizando propuesta…</p>
      ) : null}
      {feedback ? (
        <p className="mt-3 text-sm text-[var(--red)]">{feedback}</p>
      ) : null}
      <button
        type="button"
        onClick={onConfirm}
        disabled={structuring}
        className="mt-5 w-full rounded-2xl bg-[var(--blue)] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Confirmar y publicar
      </button>
      <div className="mt-2">
        <Button variant="quiet" className="w-full" onClick={onRepeat}>
          Repetir registro
        </Button>
      </div>
    </div>
  );
}

function DoneScreen({
  structured,
  feedback,
  onAgain,
}: {
  structured: ClinicalStructure;
  feedback: string | null;
  onAgain: () => void;
}) {
  return (
    <div className="pt-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--green)] text-3xl text-white">
        ✓
      </div>
      <p className="mt-5 text-xl font-semibold">Publicado en la consola central</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {feedback ??
          "La demanda del hospital se actualizó. Ábrelo en Hospital y Red UGCC."}
      </p>
      <p className="mt-6 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Eventos publicados
      </p>
      <ul className="mt-2 space-y-1 text-left font-mono text-[11px] text-[var(--muted)]">
        {structured.events.map((event) => (
          <li key={event}>
            {new Date().toLocaleTimeString("es-CL")} · {event}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-[var(--wash)] px-3 py-2 text-xs text-[var(--muted)]">
        Validado por E. Riquelme
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-6 w-full rounded-2xl bg-[var(--green)] py-3.5 text-sm font-semibold text-white"
      >
        Registrar otro paciente
      </button>
      <Link
        href="/hospital"
        className="mt-3 block text-sm font-semibold text-[var(--blue)]"
      >
        Ver consola hospital
      </Link>
    </div>
  );
}
