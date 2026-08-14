"use client";

import { Badge, operationalTone } from "@/components/ui/Badge";
import { aggregatePatientZones } from "@/lib/engine/continuity";
import { accessLabel, incidentLabel, operationalLabel } from "@/lib/labels";
import { MAP_CENTER } from "@/lib/mock/data";
import { useMockStore } from "@/lib/mock/mockStore";
import { useMemo, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const facilityColor: Record<"OPEN" | "PARTIAL" | "CLOSED", string> = {
  OPEN: "#3dd68c",
  PARTIAL: "#f5b942",
  CLOSED: "#ff5c5c",
};

const incidentColor = {
  ROAD_BLOCKED: "#fb7185",
  POWER_OUTAGE: "#fbbf24",
  FLOOD_ZONE: "#38bdf8",
} as const;

export function MapboxViewer() {
  const { facilities, incidents, patients } = useMockStore();
  const zones = useMemo(() => aggregatePatientZones(patients), [patients]);

  return (
    <div className="relative h-full min-h-[320px] bg-[#071018]">
      {TOKEN ? (
        <Map
          mapboxAccessToken={TOKEN}
          initialViewState={MAP_CENTER}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" />
          {facilities.map((facility) => (
            <Marker
              key={facility.facilityId}
              longitude={facility.coordinates[0]}
              latitude={facility.coordinates[1]}
              anchor="center"
            >
              <Dot
                color={facilityColor[facility.operationalStatus]}
                label={facility.name}
              />
            </Marker>
          ))}
          {incidents.map((incident) => (
            <Marker
              key={incident.id}
              longitude={incident.coordinates[0]}
              latitude={incident.coordinates[1]}
              anchor="center"
            >
              <IncidentPin
                color={incidentColor[incident.type]}
                label={incidentLabel[incident.type]}
              />
            </Marker>
          ))}
          {zones.map((zone) => (
            <Marker
              key={zone.zone}
              longitude={zone.coordinates[0]}
              latitude={zone.coordinates[1]}
              anchor="center"
            >
              <ZoneBubble count={zone.openCount} zone={zone.zone} />
            </Marker>
          ))}
        </Map>
      ) : (
        <SchematicMap />
      )}
      <Legend />
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="block h-3.5 w-3.5 rounded-full border-2 border-white/80 shadow-lg"
        style={{ background: color }}
      />
      <span className="mt-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {label}
      </span>
    </div>
  );
}

function IncidentPin({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="block h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent"
        style={{ borderBottomColor: color }}
      />
      <span className="mt-1 max-w-[90px] rounded bg-black/70 px-1 text-[9px] text-white">
        {label}
      </span>
    </div>
  );
}

function ZoneBubble({ count, zone }: { count: number; zone: string }) {
  return (
    <div className="flex flex-col items-center opacity-90">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-200/50 bg-teal-400/20 font-mono text-xs text-teal-100">
        {count}
      </span>
      <span className="mt-1 rounded bg-black/60 px-1 text-[9px] text-slate-200">
        {zone}
      </span>
    </div>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 rounded-lg border border-white/10 bg-black/70 p-2 text-[10px] text-slate-200">
      <p className="font-semibold uppercase tracking-wider text-slate-400">
        Territorio (sin pins individuales de pacientes)
      </p>
      <p>
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />{" "}
        Operativo
        <span className="mx-2 inline-block h-2 w-2 rounded-full bg-amber-400" />{" "}
        Parcial
        <span className="mx-2 inline-block h-2 w-2 rounded-full bg-red-400" />{" "}
        Cerrado
      </p>
      <p>Círculos: concentración por zona · triángulos: incidentes</p>
    </div>
  );
}

const BOUNDS = {
  minLng: -70.82,
  maxLng: -70.5,
  minLat: -33.56,
  maxLat: -33.32,
};

function project(coordinates: [number, number]) {
  const x =
    ((coordinates[0] - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y =
    ((BOUNDS.maxLat - coordinates[1]) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { left: `${Math.min(96, Math.max(4, x))}%`, top: `${Math.min(94, Math.max(6, y))}%` };
}

function SchematicMap() {
  const { facilities, incidents, patients } = useMockStore();
  const zones = useMemo(() => aggregatePatientZones(patients), [patients]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedFacility = facilities.find((item) => item.facilityId === selected);

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#12304a,transparent_40%),radial-gradient(circle_at_70%_80%,#1a1530,transparent_45%),#071018]">
      <p className="absolute left-3 top-3 z-10 text-[10px] uppercase tracking-widest text-slate-400">
        Vista territorial de apoyo · token Mapbox opcional
      </p>
      {zones.map((zone) => {
        const pos = project(zone.coordinates);
        return (
          <div
            key={zone.zone}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={pos}
          >
            <ZoneBubble count={zone.openCount} zone={zone.zone} />
          </div>
        );
      })}
      {incidents.map((incident) => {
        const pos = project(incident.coordinates);
        return (
          <button
            key={incident.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={pos}
            title={incident.description}
            type="button"
          >
            <IncidentPin
              color={incidentColor[incident.type]}
              label={incidentLabel[incident.type]}
            />
          </button>
        );
      })}
      {facilities.map((facility) => {
        const pos = project(facility.coordinates);
        return (
          <button
            key={facility.facilityId}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={pos}
            type="button"
            onClick={() => setSelected(facility.facilityId)}
          >
            <Dot
              color={facilityColor[facility.operationalStatus]}
              label={facility.name}
            />
          </button>
        );
      })}
      {selectedFacility ? (
        <div className="absolute right-3 top-3 max-w-[220px] rounded-lg border border-white/15 bg-black/80 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{selectedFacility.name}</p>
            <Badge tone={operationalTone(selectedFacility.operationalStatus)}>
              {operationalLabel[selectedFacility.operationalStatus]}
            </Badge>
          </div>
          <p className="mt-2 text-slate-300">
            Cupos {selectedFacility.availableCapacity} · Agua{" "}
            {selectedFacility.waterAvailable ? "sí" : "no"} · Acceso{" "}
            {accessLabel[selectedFacility.accessStatus]}
          </p>
        </div>
      ) : null}
    </div>
  );
}
