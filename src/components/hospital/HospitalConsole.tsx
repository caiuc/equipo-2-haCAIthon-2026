"use client";

import { Badge } from "@/components/ui/Badge";
import { SirenaLogo } from "@/components/brand/SirenaLogo";
import { useNetworkData } from "@/hooks/useNetworkData";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Clock3,
  FileAudio2,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  BED_LABEL,
  CRITICALITY_LABEL,
  EVENT_LABEL,
  hospitalBalance,
  type BedKind,
  type EventKind,
} from "@shared/clinical";
import type {
  ClinicalEvent,
  Patient,
  Professional,
  VoiceRecord,
} from "@shared/database.types";
import { buildRecordDetail } from "@shared/recordDetail";
import { useEffect, useMemo, useState } from "react";

const TABS = [
  { id: "capacidad", label: "Capacidad y demanda" },
  { id: "ingresos", label: "Últimos ingresos" },
  { id: "transcripciones", label: "Transcripciones" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type VoiceBundle = { voice: VoiceRecord; events: ClinicalEvent[] };

export function HospitalConsole() {
  const {
    hospital,
    hospitalCapacities,
    events,
    voices,
    patients,
    professionals,
    pipelines,
    configured,
    loading,
    error,
    refresh,
  } = useNetworkData();
  const [tab, setTab] = useState<TabId>("ingresos");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const updateClock = () =>
      setClock(
        new Date().toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const professionalById = useMemo(
    () => new Map(professionals.map((professional) => [professional.id, professional])),
    [professionals],
  );
  const eventByVoice = useMemo(() => {
    const map = new Map<string, ClinicalEvent[]>();
    for (const event of events) {
      if (!event.voice_record_id) continue;
      const current = map.get(event.voice_record_id) ?? [];
      current.push(event);
      map.set(event.voice_record_id, current);
    }
    return map;
  }, [events]);

  const records = useMemo<VoiceBundle[]>(
    () =>
      voices
        .filter((voice) => voice.hospital_id === hospital?.id)
        .map((voice) => ({ voice, events: eventByVoice.get(voice.id) ?? [] })),
    [eventByVoice, hospital?.id, voices],
  );

  const selectedRecord =
    records.find((record) => record.voice.id === selectedVoiceId) ?? records[0] ?? null;
  const pipeline = pipelines.find((item) => item.hospital_id === hospital?.id);
  const pending = records.filter(isPending).length;
  const byKind = useMemo(() => {
    const map = new Map(hospitalCapacities.map((row) => [row.bed_kind, row]));
    return (['uci', 'uti', 'basica'] as BedKind[]).map((kind) => map.get(kind));
  }, [hospitalCapacities]);
  const stats = useMemo(() => buildStats(records), [records]);
  const lastUpdate = useMemo(() => {
    const timestamps = [
      ...hospitalCapacities.map((row) => row.updated_at),
      ...records.map((record) => record.voice.created_at),
    ];
    if (!timestamps.length) return "Sin actualización";
    const latest = timestamps.sort().at(-1);
    return latest
      ? new Date(latest).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Sin actualización";
  }, [hospitalCapacities, records]);

  if (!configured) {
    return (
      <Banner
        title="Conecta la consola hospitalaria"
        text="Completa las variables de Supabase en el entorno local para visualizar capacidad, ingresos y transcripciones."
      />
    );
  }
  if (loading) {
    return <Banner title="Cargando consola SIRENA" text="Sincronizando la operación hospitalaria…" loading />;
  }
  if (error) return <Banner title="No se pudo actualizar la consola" text={error} />;

  function openTranscript(voiceId: string) {
    setSelectedVoiceId(voiceId);
    setTab("transcripciones");
  }

  return (
    <div className="sirena-page mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">
      <section className="sirena-panel overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 md:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <SirenaLogo size="sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
                  SIRENA · Consola {hospital?.name ?? "Hospital A"}
                </h1>
                <Badge tone="neutral">Urgencia adultos</Badge>
                <Badge tone="info">Datos sintéticos</Badge>
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                Continuidad Vital · última sincronización {lastUpdate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {pending ? (
              <Badge tone="warn" className="gap-1.5 px-3 py-1">
                <AlertTriangle className="h-3 w-3" /> {pending} por validar
              </Badge>
            ) : (
              <Badge tone="ok" className="gap-1.5 px-3 py-1">
                <Radio className="h-3 w-3" /> En vivo
              </Badge>
            )}
            <span className="hidden font-mono text-xs text-[var(--muted)] sm:inline">
              {clock}
            </span>
            <button
              type="button"
              aria-label="Actualizar consola"
              onClick={() => void refresh()}
              className="sirena-icon-button"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="border-b border-[var(--line)] px-4 pt-3 md:px-7">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Secciones de la consola">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  tab === item.id
                    ? "border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue)]"
                    : "border-transparent text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "capacidad" ? (
          <CapacityView byKind={byKind} pipeline={pipeline} />
        ) : null}

        {tab === "ingresos" ? (
          <AdmissionsView
            records={records}
            patientById={patientById}
            professionalById={professionalById}
            openTranscript={openTranscript}
          />
        ) : null}

        {tab === "transcripciones" ? (
          <TranscriptView
            records={records}
            selected={selectedRecord}
            patientById={patientById}
            professionalById={professionalById}
            onSelect={setSelectedVoiceId}
          />
        ) : null}

        <StatsBar stats={stats} />
      </section>
    </div>
  );
}

function CapacityView({
  byKind,
  pipeline,
}: {
  byKind: Array<ReturnType<typeof useNetworkData>["hospitalCapacities"][number] | undefined>;
  pipeline: ReturnType<typeof useNetworkData>["pipelines"][number] | undefined;
}) {
  return (
    <div className="p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="sirena-label">Capacidad efectiva de recepción</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Estado actual por tipo de cama</h2>
        </div>
        <p className="flex items-center gap-2 text-xs text-[var(--amber)]">
          <AlertTriangle className="h-3.5 w-3.5" /> UCI posible no suma a demanda confirmada
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {byKind.map((row) =>
          row ? (
            <article key={row.bed_kind} className="rounded-2xl border border-[var(--line)] bg-[var(--wash)] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--blue)] shadow-sm">
                    <BedDouble className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{BED_LABEL[row.bed_kind]}</p>
                    <p className="text-[11px] text-[var(--muted)]">Disponibilidad efectiva</p>
                  </div>
                </div>
                <span className="font-mono text-3xl font-semibold text-[var(--green)]">
                  {row.effective_available}
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--blue)]"
                  style={{ width: `${Math.min(100, (row.occupied / Math.max(1, row.physical_beds)) * 100)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Ocupadas" value={row.occupied} />
                <Metric label="Esperando" value={row.demand_waiting} />
                <Metric label="Balance" value={hospitalBalance(row.effective_available, row.demand_waiting)} />
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted)]">
                {row.physical_beds} físicas · {row.out_of_service} fuera de servicio · {row.unstaffed} sin dotación · proyección 4 h: {row.projected_4h}
              </p>
            </article>
          ) : null,
        )}
      </div>

      {pipeline ? (
        <div className="mt-5 rounded-2xl border border-[var(--line)] p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--blue)]" />
            <h3 className="text-sm font-semibold">Flujo de liberación de camas</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Pipe label="Alta médica" value={pipeline.medical_discharge} />
            <Pipe label="Egreso pendiente" value={pipeline.pending_egress} />
            <Pipe label="Cama en aseo" value={pipeline.bed_cleaning} />
            <Pipe label="Cama habilitada" value={pipeline.bed_ready} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdmissionsView({
  records,
  patientById,
  professionalById,
  openTranscript,
}: {
  records: VoiceBundle[];
  patientById: Map<string, Patient>;
  professionalById: Map<string, Professional>;
  openTranscript: (voiceId: string) => void;
}) {
  return (
    <div className="p-5 md:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="sirena-label">Últimos ingresos y eventos validados</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Ordenados por registro y agrupados por transcripción de voz.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--green)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--green)]" /> En vivo
        </span>
      </div>

      {records.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <tr>
                <th className="px-4 pb-1">Paciente</th>
                <th className="px-4 pb-1">Hora</th>
                <th className="px-4 pb-1">Requerimiento</th>
                <th className="px-4 pb-1">Estado</th>
                <th className="px-4 pb-1">Validado por</th>
                <th className="px-4 pb-1 text-right">Transcripción</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const state = recordState(record);
                const patient = record.voice.patient_id
                  ? patientById.get(record.voice.patient_id)
                  : undefined;
                const professional = record.voice.professional_id
                  ? professionalById.get(record.voice.professional_id)
                  : undefined;
                return (
                  <tr
                    key={record.voice.id}
                    className={`group ${state.pending ? "bg-[var(--amber-soft)]" : "bg-[var(--wash)]"}`}
                  >
                    <td className={`border-l-4 px-4 py-4 font-mono text-sm font-semibold ${state.pending ? "border-[var(--amber)]" : "border-[var(--green)]"}`}>
                      {patient?.code ?? "PAC-SIN-CÓDIGO"}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[var(--muted)]">
                      {formatTime(record.voice.created_at)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold">
                      {formatRequirement(record.events)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--muted)]">
                      {professional ? `${professional.display_name} · ${professional.unit}` : "Pendiente"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openTranscript(record.voice.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--blue)] hover:underline"
                      >
                        Ver transcripción <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<FileAudio2 />} title="Aún no hay ingresos" text="Los registros confirmados aparecerán aquí en tiempo real." />
      )}
    </div>
  );
}

function TranscriptView({
  records,
  selected,
  patientById,
  professionalById,
  onSelect,
}: {
  records: VoiceBundle[];
  selected: VoiceBundle | null;
  patientById: Map<string, Patient>;
  professionalById: Map<string, Professional>;
  onSelect: (voiceId: string) => void;
}) {
  if (!records.length) {
    return (
      <div className="p-7">
        <EmptyState icon={<FileAudio2 />} title="Sin transcripciones" text="Los reportes de voz confirmados aparecerán en esta sección." />
      </div>
    );
  }
  const patient = selected?.voice.patient_id
    ? patientById.get(selected.voice.patient_id)
    : undefined;
  const professional = selected?.voice.professional_id
    ? professionalById.get(selected.voice.professional_id)
    : undefined;
  const state = selected ? recordState(selected) : null;

  return (
    <div className="grid min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="border-b border-[var(--line)] bg-[var(--wash)] p-3 lg:border-b-0 lg:border-r">
        <div className="px-2 pb-3 pt-2">
          <p className="sirena-label">Registros de voz</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{records.length} disponibles</p>
        </div>
        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {records.map((record) => {
            const itemPatient = record.voice.patient_id
              ? patientById.get(record.voice.patient_id)
              : undefined;
            const active = record.voice.id === selected?.voice.id;
            return (
              <button
                key={record.voice.id}
                type="button"
                onClick={() => onSelect(record.voice.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-[var(--blue)] bg-white shadow-sm"
                    : "border-transparent bg-transparent hover:border-[var(--line)] hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">
                    {itemPatient?.code ?? "PAC-SIN-CÓDIGO"}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--muted)]">
                    {formatTime(record.voice.created_at)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                  {record.voice.transcript}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {selected ? (
        <article className="p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <FileAudio2 className="h-5 w-5 text-[var(--blue)]" />
                <h2 className="text-xl font-semibold tracking-tight">
                  {patient?.code ?? "Paciente sin código"}
                </h2>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {formatDateTime(selected.voice.created_at)}</span>
                <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {professional?.display_name ?? "Profesional pendiente"}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {state ? <Badge tone={state.tone}>{state.label}</Badge> : null}
              <Badge tone="neutral">{selected.voice.stt_engine}</Badge>
              {selected.voice.duration_seconds ? (
                <Badge tone="neutral">{selected.voice.duration_seconds} s</Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-6">
            <p className="sirena-label">Transcripción consolidada</p>
            <blockquote className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--wash)] p-5 text-[15px] leading-7 text-[var(--ink)]">
              {selected.voice.transcript}
            </blockquote>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--blue)]" />
              <p className="sirena-label">Eventos estructurados</p>
            </div>
            {selected.events.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {selected.events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[var(--line)] p-4">
                    <div className="flex items-start gap-2">
                      {event.event_kind === "POSSIBLE_ICU_REQUIREMENT" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--amber)]" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--green)]" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">{EVENT_LABEL[event.event_kind]}</p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          {event.relevant_condition ?? `Certeza UCI: ${event.icu_certainty ?? "n/d"}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No hay eventos asociados a este registro.</p>
            )}
          </div>

          <TranscriptFormSnapshot voice={selected.voice} events={selected.events} />

          <div className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--green-soft)] px-4 py-3 text-xs text-[var(--green)]">
            <ShieldCheck className="h-4 w-4" /> Audio no almacenado · registro confirmado por una persona
          </div>
        </article>
      ) : null}
    </div>
  );
}

function StatsBar({ stats }: { stats: ReturnType<typeof buildStats> }) {
  const items = [
    { label: "Registros de voz hoy", value: stats.today },
    { label: "Validados sin edición", value: stats.validated },
    { label: "Editados antes de confirmar", value: stats.edited },
    { label: "Pendientes de confirmar", value: stats.pending, warn: true },
    { label: "Latencia media voz → dato", value: `${stats.latency}s`, green: true },
  ];
  return (
    <div className="grid border-t border-[var(--line)] bg-[var(--wash)] sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className={`border-b border-[var(--line)] px-5 py-4 last:border-b-0 sm:border-r lg:border-b-0 ${item.warn ? "bg-[var(--amber-soft)]" : ""}`}>
          <p className="text-[10px] uppercase tracking-[0.11em] text-[var(--muted)]">{item.label}</p>
          <p className={`mt-1 font-mono text-2xl font-semibold ${item.warn ? "text-[var(--amber)]" : item.green ? "text-[var(--green)]" : ""}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white px-2 py-2">
      <p className="font-mono text-base font-semibold">{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function Pipe({ label, value }: { label: string; value: number }) {
  return (
    <div className="relative rounded-xl bg-[var(--wash)] px-4 py-3 after:absolute after:-right-2 after:top-1/2 after:hidden after:h-px after:w-4 after:bg-[var(--line)] sm:after:block last:after:hidden">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{text}</p>
    </div>
  );
}

function Banner({ title, text, loading = false }: { title: string; text: string; loading?: boolean }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]">
        {loading ? <RefreshCw className="h-6 w-6 animate-spin" /> : <AlertTriangle className="h-6 w-6" />}
      </span>
      <h1 className="mt-4 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{text}</p>
    </div>
  );
}

function isPending(record: VoiceBundle) {
  return (
    record.voice.status === "pending" ||
    record.events.some((event) => event.confirmation === "proposed")
  );
}

function recordState(record: VoiceBundle): {
  label: string;
  tone: "ok" | "warn" | "neutral";
  pending: boolean;
} {
  if (record.events.some((event) => event.confirmation === "proposed")) {
    return { label: "Por validar", tone: "warn", pending: true };
  }
  if (record.voice.status === "pending") {
    return { label: "Sin confirmar", tone: "warn", pending: true };
  }
  if (record.voice.status === "edited") {
    return { label: "Publicado · editado", tone: "ok", pending: false };
  }
  return { label: "Publicado", tone: "ok", pending: false };
}

function TranscriptFormSnapshot({
  voice,
  events,
}: {
  voice: VoiceRecord;
  events: ClinicalEvent[];
}) {
  const detail = buildRecordDetail(voice, events);
  const facts = [
    ["Paciente", detail.form.patient],
    ["Sexo", detail.form.sex],
    ["Edad", detail.form.age],
    ["Riesgo vital", detail.form.vitalRisk],
    ["Fuente", detail.form.source],
  ];
  return (
    <div className="mt-6 space-y-4">
      <div>
        <p className="sirena-label">Ficha clínica</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--line)] p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            detail.form.criticalityKey === "high"
              ? "bg-[var(--red-soft)] text-[var(--red)]"
              : detail.form.criticalityKey === "medium"
                ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                : "bg-[var(--green-soft)] text-[var(--green)]"
          }`}
        >
          Criticidad {CRITICALITY_LABEL[detail.form.criticalityKey]}
        </span>
        {detail.bedActions.length ? (
          detail.bedActions.map((item) => (
            <span
              key={`${item.action}-${item.kind}`}
              className="rounded-full bg-[var(--blue-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--blue)]"
            >
              {item.label}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-[var(--muted)]">Sin cambio de cama</span>
        )}
      </div>
      {detail.criticalEvents.length ? (
        <div>
          <p className="sirena-label">Casos críticos</p>
          <ul className="mt-2 space-y-1">
            {detail.criticalEvents.map((item) => (
              <li
                key={item.kind}
                className="rounded-xl bg-[var(--red-soft)] px-3 py-2 text-sm text-[var(--red)]"
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {detail.form.condition ? (
        <div>
          <p className="sirena-label">Condición relevante</p>
          <p className="mt-2 text-sm leading-6">{detail.form.condition}</p>
        </div>
      ) : null}
      {detail.form.summary ? (
        <div>
          <p className="sirena-label">Resumen clínico</p>
          <p className="mt-2 text-sm leading-6">{detail.form.summary}</p>
        </div>
      ) : null}
      {detail.form.analysis ? (
        <div>
          <p className="sirena-label">Análisis de la IA</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {detail.form.analysis}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function formatRequirement(events: ClinicalEvent[]) {
  const kinds = new Set(events.map((event) => event.event_kind));
  if (kinds.has("POSSIBLE_ICU_REQUIREMENT")) return "UCI posible (condicional)";
  if (kinds.has("ICU_CONFIRMED")) {
    return kinds.has("ISOLATION_REQUIRED") ? "UCI + aislamiento" : "UCI confirmada";
  }
  if (kinds.has("UTI_REQUIRED")) return "UTI / cuidados intermedios";
  if (kinds.has("BASIC_BED_REQUIRED")) return "Hospitalización básica";
  if (kinds.has("DISCHARGE_ORDERED")) return "Alta médica";
  const first = events[0]?.event_kind as EventKind | undefined;
  return first ? EVENT_LABEL[first] : "Sin requerimiento estructurado";
}

function buildStats(records: VoiceBundle[]) {
  const todayKey = new Date().toLocaleDateString("en-CA");
  const today = records.filter(
    (record) => new Date(record.voice.created_at).toLocaleDateString("en-CA") === todayKey,
  ).length;
  const pending = records.filter(isPending).length;
  const edited = records.filter((record) => record.voice.status === "edited").length;
  const validated = records.filter(
    (record) => record.voice.status === "validated" && !isPending(record),
  ).length;
  const latencies = records.flatMap((record) => {
    const confirmed = record.events
      .map((event) => event.confirmed_at)
      .filter((value): value is string => Boolean(value));
    if (!confirmed.length) return [];
    const seconds = Math.round(
      (new Date(confirmed.sort()[0]).getTime() - new Date(record.voice.created_at).getTime()) /
        1000,
    );
    return seconds >= 0 ? [seconds] : [];
  });
  const latency = latencies.length
    ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
    : 0;
  return { today, pending, edited, validated, latency };
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
