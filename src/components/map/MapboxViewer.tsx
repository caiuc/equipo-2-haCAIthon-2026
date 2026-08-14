"use client";

import { Badge, operationalTone } from "@/components/ui/Badge";
import { BedGrid } from "@/components/map/BedGrid";
import { aggregatePatientZones } from "@/lib/engine/continuity";
import { facilityBeds } from "@/lib/engine/beds";
import { accessLabel, incidentLabel, operationalLabel } from "@/lib/labels";
import { MAP_CENTER } from "@/lib/mock/data";
import { useMockStore } from "@/lib/mock/mockStore";
import { useEffect, useMemo, useRef } from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const facilityColor: Record<"OPEN" | "PARTIAL" | "CLOSED", string> = {
  OPEN: "#2ee6d6",
  PARTIAL: "#f5b942",
  CLOSED: "#ff5c5c",
};

const incidentColor = {
  ROAD_BLOCKED: "#fb7185",
  POWER_OUTAGE: "#fbbf24",
  FLOOD_ZONE: "#38bdf8",
} as const;

export function MapboxViewer({
  heightClass = "h-full min-h-[320px]",
}: {
  heightClass?: string;
}) {
  const { facilities, incidents, patients, focusFacilityId, focusAt, focusFacility } =
    useMockStore();
  const zones = useMemo(() => aggregatePatientZones(patients), [patients]);
  const mapRef = useRef<MapRef>(null);
  const selected = facilities.find((item) => item.facilityId === focusFacilityId);

  useEffect(() => {
    if (!focusFacilityId || !TOKEN) return;
    const facility = facilities.find((item) => item.facilityId === focusFacilityId);
    if (!facility) return;
    mapRef.current?.flyTo({
      center: [facility.coordinates[0], facility.coordinates[1]],
      zoom: 13,
      duration: 1100,
    });
  }, [focusFacilityId, focusAt, facilities]);

  return (
    <div className={`relative overflow-hidden bg-[var(--input)] ${heightClass}`}>
      {TOKEN ? (
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          initialViewState={MAP_CENTER}
          mapStyle="mapbox://styles/mapbox/light-v11"
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" />
          {facilities.map((facility) => {
            const { free } = facilityBeds(facility);
            return (
              <Marker
                key={facility.facilityId}
                longitude={facility.coordinates[0]}
                latitude={facility.coordinates[1]}
                anchor="bottom"
                onClick={(event) => {
                  event.originalEvent.stopPropagation();
                  focusFacility(facility.facilityId);
                }}
              >
                <FacilityPin
                  color={facilityColor[facility.operationalStatus]}
                  name={facility.name}
                  free={free}
                  active={focusFacilityId === facility.facilityId}
                />
              </Marker>
            );
          })}
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
          {selected ? (
            <Popup
              longitude={selected.coordinates[0]}
              latitude={selected.coordinates[1]}
              anchor="top"
              offset={16}
              closeOnClick={false}
              onClose={() => focusFacility(null)}
              className="cv-map-popup"
            >
              <FacilityPopup facility={selected} />
            </Popup>
          ) : null}
        </Map>
      ) : (
        <SchematicMap />
      )}
      <Legend />
    </div>
  );
}

function FacilityPin({
  color,
  name,
  free,
  active,
}: {
  color: string;
  name: string;
  free: number;
  active: boolean;
}) {
  return (
    <div className="flex cursor-pointer flex-col items-center">
      <span
        className={`flex h-8 min-w-8 items-center justify-center rounded-full border-2 font-mono text-xs font-bold text-slate-950 ${active ? "scale-110" : ""}`}
        style={{ background: color, borderColor: "rgba(255,255,255,0.85)" }}
      >
        {free}
      </span>
      <span className="mt-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm">
        {name}
      </span>
    </div>
  );
}

function FacilityPopup({
  facility,
}: {
  facility: import("@/types").FacilityStatus;
}) {
  return (
    <div className="min-w-[200px] max-w-[240px] text-[var(--text)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{facility.name}</p>
        <Badge tone={operationalTone(facility.operationalStatus)}>
          {operationalLabel[facility.operationalStatus]}
        </Badge>
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        Agua {facility.waterAvailable ? "sí" : "no"} · Acceso{" "}
        {accessLabel[facility.accessStatus]}
      </p>
      <div className="mt-2">
        <BedGrid facility={facility} compact />
      </div>
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
      <span className="mt-1 max-w-[90px] rounded bg-white px-1 text-[9px] text-slate-800 shadow-sm">
        {label}
      </span>
    </div>
  );
}

function ZoneBubble({ count, zone }: { count: number; zone: string }) {
  return (
    <div className="flex flex-col items-center opacity-90">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-700/30 bg-teal-50 font-mono text-xs text-teal-900">
        {count}
      </span>
      <span className="mt-1 rounded bg-white px-1 text-[9px] text-slate-700 shadow-sm">
        {zone}
      </span>
    </div>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 rounded-lg border border-[var(--line)] bg-white/90 p-2 text-[10px] text-slate-700 shadow-sm">
      <p className="font-semibold uppercase tracking-wider text-slate-500">
        Territorio · sin pins de pacientes
      </p>
      <p>Número en el pin = camas libres</p>
      <p>
        <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-teal-400" />{" "}
        Libre
        <span className="mx-2 inline-block h-2 w-2 rounded-sm bg-slate-500" />{" "}
        Ocupada
        <span className="mx-2 inline-block h-2 w-2 rounded-sm bg-red-400" />{" "}
        Bloqueada
      </p>
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
  return {
    left: `${Math.min(96, Math.max(4, x))}%`,
    top: `${Math.min(94, Math.max(6, y))}%`,
  };
}

function SchematicMap() {
  const { facilities, incidents, patients, focusFacility, focusFacilityId } = useMockStore();
  const zones = useMemo(() => aggregatePatientZones(patients), [patients]);
  const selectedFacility = facilities.find(
    (item) => item.facilityId === focusFacilityId,
  );

  return (
    <div className="relative h-full overflow-hidden bg-[var(--input)]">
      <p className="absolute left-3 top-3 z-10 text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Vista territorial · falta token Mapbox
      </p>
      {zones.map((zone) => (
        <div
          key={zone.zone}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={project(zone.coordinates)}
        >
          <ZoneBubble count={zone.openCount} zone={zone.zone} />
        </div>
      ))}
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={project(incident.coordinates)}
        >
          <IncidentPin
            color={incidentColor[incident.type]}
            label={incidentLabel[incident.type]}
          />
        </div>
      ))}
      {facilities.map((facility) => {
        const { free } = facilityBeds(facility);
        return (
          <button
            key={facility.facilityId}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={project(facility.coordinates)}
            type="button"
            onClick={() => {
              focusFacility(facility.facilityId);
            }}
          >
            <FacilityPin
              color={facilityColor[facility.operationalStatus]}
              name={facility.name}
              free={free}
              active={focusFacilityId === facility.facilityId}
            />
          </button>
        );
      })}
      {selectedFacility ? (
        <div className="absolute right-3 top-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 shadow-sm">
          <FacilityPopup facility={selectedFacility} />
        </div>
      ) : null}
    </div>
  );
}
