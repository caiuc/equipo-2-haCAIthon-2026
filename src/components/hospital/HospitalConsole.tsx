"use client";

import { SirenaLogo } from "@/components/brand/SirenaLogo";
import { RecordDetailModal } from "@/components/records/RecordDetail";
import { Badge } from "@/components/ui/Badge";
import { useNetworkData } from "@/hooks/useNetworkData";
import { BED_LABEL, EVENT_LABEL, type BedKind } from "@shared/clinical";
import { hospitalBalance } from "@shared/clinical";
import { buildRecordDetail } from "@shared/recordDetail";
import { useMemo, useState } from "react";

const TABS = [
  { id: "capacidad", label: "Capacidad y demanda" },
  { id: "ingresos", label: "Últimos ingresos" },
  { id: "transcripciones", label: "Transcripciones" },
] as const;

export function HospitalConsole() {
  const {
    hospital,
    hospitalCapacities,
    events,
    voices,
    pipelines,
    configured,
    loading,
    error,
  } = useNetworkData();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("capacidad");
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);
  const pipeline = pipelines.find((item) => item.hospital_id === hospital?.id);
  const pending = events.filter((item) => item.confirmation === "proposed").length;
  const openDetail = useMemo(() => {
    if (!openRecordId) return null;
    const record = voices.find((item) => item.id === openRecordId);
    if (!record) return null;
    return buildRecordDetail(record, events);
  }, [openRecordId, voices, events]);

  const byKind = useMemo(() => {
    const map = new Map(hospitalCapacities.map((row) => [row.bed_kind, row]));
    return (["uci", "uti", "basica"] as BedKind[]).map((kind) => map.get(kind));
  }, [hospitalCapacities]);

  if (!configured) {
    return (
      <Banner text="Pega supabase/001_up.sql, 002_rls.sql y 003_seed.sql en el SQL Editor y completa SUPABASE_URL / SUPABASE_KEY en .env." />
    );
  }
  if (loading) return <Banner text="Cargando consola hospitalaria…" />;
  if (error) return <Banner text={error} />;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <SirenaLogo size={36} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--blue)]">
              SIRENA · Consola {hospital?.name ?? "Hospital A"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Urgencia adultos · datos sintéticos
            </h1>
          </div>
        </div>
        {pending ? (
          <Badge tone="warn">{pending} eventos por validar</Badge>
        ) : (
          <Badge tone="ok">En vivo</Badge>
        )}
      </header>

      <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === item.id
                ? "bg-[var(--blue-soft)] text-[var(--blue)]"
                : "text-[var(--muted)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "capacidad" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <h2 className="text-sm font-semibold">Capacidad efectiva</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              No es la cama física: es la que puede recibir un paciente
            </p>
            <div className="mt-4 grid gap-3">
              {byKind.map((row) =>
                row ? (
                  <article key={row.bed_kind} className="rounded-xl border border-[var(--line)] p-3">
                    <div className="flex items-baseline justify-between">
                      <p className="font-semibold">{BED_LABEL[row.bed_kind]}</p>
                      <p className="font-mono text-2xl text-[var(--green)]">
                        {row.effective_available}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {row.physical_beds} físicas · −{row.out_of_service} fuera de
                      servicio · −{row.unstaffed} sin dotación · −{row.occupied}{" "}
                      ocupadas
                    </p>
                  </article>
                ) : null,
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <h2 className="text-sm font-semibold">Demanda actual</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Pacientes esperando continuidad de atención
            </p>
            <div className="mt-4 space-y-3">
              {byKind.map((row) =>
                row ? (
                  <div key={row.bed_kind} className="flex items-center justify-between">
                    <span>Esperando {BED_LABEL[row.bed_kind]}</span>
                    <span className="font-mono text-xl">{row.demand_waiting}</span>
                  </div>
                ) : null,
              )}
              <p className="text-xs text-[var(--amber)]">
                UCI posible (señal) no suma a demanda
              </p>
              {byKind[0] ? (
                <p className="text-sm">
                  Balance UCI:{" "}
                  <strong>
                    {hospitalBalance(
                      byKind[0].effective_available,
                      byKind[0].demand_waiting,
                    )}
                  </strong>
                </p>
              ) : null}
            </div>
            {pipeline ? (
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <Pipe label="Alta médica" value={pipeline.medical_discharge} />
                <Pipe label="Egreso pendiente" value={pipeline.pending_egress} />
                <Pipe label="Cama en aseo" value={pipeline.bed_cleaning} />
                <Pipe label="Cama habilitada" value={pipeline.bed_ready} />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "ingresos" ? (
        <section className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Requerimiento</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {events
                .filter((item) => item.hospital_id === hospital?.id)
                .map((event) => (
                  <tr
                    key={event.id}
                    className={`border-t border-[var(--line)] ${
                      event.voice_record_id
                        ? "cursor-pointer hover:bg-[var(--wash)]"
                        : ""
                    }`}
                    onClick={() => {
                      if (event.voice_record_id) {
                        setOpenRecordId(event.voice_record_id);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {event.patient_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(event.created_at).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">{EVENT_LABEL[event.event_kind]}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          event.confirmation === "confirmed"
                            ? "ok"
                            : event.confirmation === "proposed"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {event.confirmation}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "transcripciones" ? (
        <section className="grid gap-3">
          {voices
            .filter((item) => item.hospital_id === hospital?.id)
            .map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => setOpenRecordId(voice.id)}
                className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={voice.status === "validated" ? "ok" : "warn"}>
                    {voice.status}
                  </Badge>
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    {voice.stt_engine} · audio no almacenado
                  </span>
                </div>
                <p className="mt-3 text-sm">{voice.transcript}</p>
              </button>
            ))}
        </section>
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

function Pipe({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--wash)] px-3 py-2">
      <p className="text-[var(--muted)]">{label}</p>
      <p className="font-mono text-lg">{value}</p>
    </div>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <p className="mx-auto max-w-[720px] px-4 py-10 text-sm text-[var(--muted)]">
      {text}
    </p>
  );
}
