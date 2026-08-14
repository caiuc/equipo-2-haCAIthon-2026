"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useNetworkData } from "@/hooks/useNetworkData";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BED_LABEL,
  balanceTone,
  hospitalBalance,
  type BedKind,
} from "@shared/clinical";
import type { Hospital, HospitalCapacity } from "@shared/database.types";
import { useMemo, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_CENTER = { longitude: -70.66, latitude: -33.48, zoom: 10.4 };

const TONE_COLOR = {
  deficit: "#c24632",
  even: "#b4690e",
  surplus: "#0e9f6e",
} as const;

export function NetworkMap() {
  const { hospitals, capacities, events, transfers, configured, loading, error, refresh } =
    useNetworkData();
  const [kind, setKind] = useState<BedKind>("uci");
  const [selectedId, setSelectedId] = useState<string | null>("blt");

  const selected = hospitals.find((item) => item.id === selectedId) ?? null;
  const selectedCap = capacities.find(
    (item) => item.hospital_id === selected?.id && item.bed_kind === kind,
  );
  const surplus = useMemo(() => {
    if (!selectedCap) return null;
    const balance = hospitalBalance(
      selectedCap.effective_available,
      selectedCap.demand_waiting,
    );
    if (balance >= 0) return null;
    return capacities
      .filter((item) => item.bed_kind === kind && item.hospital_id !== selected?.id)
      .map((item) => ({
        item,
        balance: hospitalBalance(item.effective_available, item.demand_waiting),
        hospital: hospitals.find((h) => h.id === item.hospital_id),
      }))
      .filter((row) => row.balance > 0 && row.hospital)
      .sort((a, b) => b.balance - a.balance)[0];
  }, [capacities, hospitals, kind, selected?.id, selectedCap]);

  async function sendSuggestion() {
    if (!selected || !surplus?.hospital) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from("transfer_suggestions").insert({
      from_hospital_id: selected.id,
      to_hospital_id: surplus.hospital.id,
      bed_kind: kind,
      status: "sent_to_case_mgmt",
    });
    await refresh();
  }

  if (!configured) {
    return <p className="px-4 py-10 text-sm text-[var(--muted)]">Configura Supabase para ver la red.</p>;
  }
  if (loading) return <p className="px-4 py-10 text-sm">Cargando vista de red…</p>;
  if (error) return <p className="px-4 py-10 text-sm text-[var(--red)]">{error}</p>;

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 py-4 lg:grid-cols-[1fr_340px] lg:px-6">
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--blue)]">
              Gestión centralizada de casos · Región Metropolitana
            </p>
            <h1 className="text-lg font-semibold">Continuidad Vital · Vista de red</h1>
          </div>
          <div className="flex gap-1 rounded-lg bg-[var(--wash)] p-1">
            {(["uci", "uti", "basica"] as BedKind[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  kind === item ? "bg-[var(--paper)] text-[var(--blue)]" : "text-[var(--muted)]"
                }`}
              >
                {BED_LABEL[item]}
              </button>
            ))}
          </div>
        </header>
        <div className="h-[560px]">
          {TOKEN ? (
            <Map
              mapboxAccessToken={TOKEN}
              initialViewState={MAP_CENTER}
              mapStyle="mapbox://styles/mapbox/light-v11"
              style={{ width: "100%", height: "100%" }}
              attributionControl={false}
            >
              <NavigationControl position="bottom-right" />
              {hospitals.map((hospital) => {
                const cap = findCap(capacities, hospital.id, kind);
                const balance = cap
                  ? hospitalBalance(cap.effective_available, cap.demand_waiting)
                  : 0;
                const tone = balanceTone(balance);
                return (
                  <Marker
                    key={hospital.id}
                    longitude={hospital.lng}
                    latitude={hospital.lat}
                    anchor="bottom"
                    onClick={(event) => {
                      event.originalEvent.stopPropagation();
                      setSelectedId(hospital.id);
                    }}
                  >
                    <span
                      className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-white px-2 font-mono text-xs font-bold text-white shadow"
                      style={{ background: TONE_COLOR[tone] }}
                    >
                      {balance}
                    </span>
                  </Marker>
                );
              })}
              {selected ? (
                <Popup
                  longitude={selected.lng}
                  latitude={selected.lat}
                  anchor="top"
                  onClose={() => setSelectedId(null)}
                  closeOnClick={false}
                >
                  <p className="text-sm font-semibold">{selected.name}</p>
                  <p className="text-xs text-[var(--muted)]">{selected.commune}</p>
                </Popup>
              ) : null}
            </Map>
          ) : (
            <HospitalList
              hospitals={hospitals}
              capacities={capacities}
              kind={kind}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>
        <p className="border-t border-[var(--line)] px-4 py-2 text-[11px] text-[var(--muted)]">
          Tamaño conceptual = demanda · número = balance. Rojo déficit · verde capacidad.
          La derivación es informativa: la decide el gestor de red.
        </p>
      </section>

      <aside className="flex flex-col gap-3">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <h2 className="text-sm font-semibold">Detalle</h2>
          {selected && selectedCap ? (
            <>
              <p className="mt-2 text-sm font-medium">{selected.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {selected.commune} · {selected.complexity_level}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat label={`Demanda ${BED_LABEL[kind]}`} value={selectedCap.demand_waiting} />
                <Stat label="Cap. efectiva" value={selectedCap.effective_available} />
                <Stat
                  label="Balance"
                  value={hospitalBalance(
                    selectedCap.effective_available,
                    selectedCap.demand_waiting,
                  )}
                />
                <Stat label="Físicas" value={selectedCap.physical_beds} />
                <Stat label="Fuera de servicio" value={selectedCap.out_of_service} />
                <Stat label="Sin dotación" value={selectedCap.unstaffed} />
                <Stat label="Ocupadas" value={selectedCap.occupied} />
                <Stat label="Aislamiento" value={selected.isolation_available} />
              </dl>
              {surplus?.hospital ? (
                <div className="mt-4 rounded-xl bg-[var(--blue-soft)] p-3 text-sm">
                  <p>
                    Derivación posible: {surplus.hospital.name} (balance +
                    {surplus.balance})
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Propuesta informativa. La decisión es del gestor de red.
                  </p>
                  <Button className="mt-3 text-xs" onClick={() => void sendSuggestion()}>
                    Enviar a gestión de casos
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[var(--green)]">
                  Sin déficit en {BED_LABEL[kind]} o sin receptor con capacidad.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Clic en un establecimiento para ver detalle.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <h2 className="text-sm font-semibold">Eventos recientes de la red</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {events.slice(0, 6).map((event) => (
              <li key={event.id} className="flex justify-between gap-2">
                <span>{EVENT_SAFE[event.event_kind] ?? event.event_kind}</span>
                <Badge tone={event.confirmation === "confirmed" ? "ok" : "warn"}>
                  {event.confirmation}
                </Badge>
              </li>
            ))}
          </ul>
          {transfers[0] ? (
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              Última sugerencia: {transfers[0].from_hospital_id} →{" "}
              {transfers[0].to_hospital_id} ({transfers[0].status})
            </p>
          ) : null}
        </section>
      </aside>
    </div>
  );
}

const EVENT_SAFE: Record<string, string> = {
  REQUIRES_HOSPITALIZATION: "Hospitalización",
  POSSIBLE_ICU_REQUIREMENT: "UCI posible",
  ICU_CONFIRMED: "UCI confirmada",
  BASIC_BED_REQUIRED: "Cama básica",
  DISCHARGE_ORDERED: "Alta médica",
  ISOLATION_REQUIRED: "Aislamiento",
  TRANSFER_SUGGESTED: "Derivación",
};

function findCap(rows: HospitalCapacity[], hospitalId: string, kind: BedKind) {
  return rows.find((item) => item.hospital_id === hospitalId && item.bed_kind === kind);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--wash)] px-2 py-2">
      <p className="text-[var(--muted)]">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

function HospitalList({
  hospitals,
  capacities,
  kind,
  selectedId,
  onSelect,
}: {
  hospitals: Hospital[];
  capacities: HospitalCapacity[];
  kind: BedKind;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="h-full space-y-2 overflow-auto p-4">
      {hospitals.map((hospital) => {
        const cap = findCap(capacities, hospital.id, kind);
        const balance = cap
          ? hospitalBalance(cap.effective_available, cap.demand_waiting)
          : 0;
        return (
          <li key={hospital.id}>
            <button
              type="button"
              onClick={() => onSelect(hospital.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                selectedId === hospital.id
                  ? "border-[var(--blue)] bg-[var(--blue-soft)]"
                  : "border-[var(--line)]"
              }`}
            >
              <span className="font-medium">{hospital.name}</span>
              <span className="ml-2 font-mono text-xs">balance {balance}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
