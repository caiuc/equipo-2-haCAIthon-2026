"use client";

import { facilityBeds } from "@/lib/engine/beds";
import { createInitialFacilities, MAP_CENTER } from "@/lib/mock/data";
import { useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const facilityColor: Record<"OPEN" | "PARTIAL" | "CLOSED", string> = {
  OPEN: "#0f766e",
  PARTIAL: "#b45309",
  CLOSED: "#b91c1c",
};

export function LandingMap() {
  const facilities = useMemo(() => createInitialFacilities(), []);

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--input)] text-sm text-[var(--muted)]">
        Mapa de apoyo · configura MAPBOX_TOKEN
      </div>
    );
  }

  return (
    <Map
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
          >
            <div className="flex flex-col items-center">
              <span
                className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white font-mono text-xs font-bold text-white"
                style={{ background: facilityColor[facility.operationalStatus] }}
              >
                {free}
              </span>
              <span className="mt-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm">
                {facility.name}
              </span>
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
