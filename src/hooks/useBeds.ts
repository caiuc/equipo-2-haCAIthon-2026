"use client";

import type { BedMetrics, EmergencyBed } from "@/types/beds";
import { useCallback, useEffect, useState } from "react";

export function useBeds(pollMs = 5000) {
  const [beds, setBeds] = useState<EmergencyBed[]>([]);
  const [metrics, setMetrics] = useState<BedMetrics>({
    total: 8,
    free: 8,
    occupied: 0,
    critical: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback(
    (data: { beds: EmergencyBed[]; metrics: BedMetrics }) => {
      setBeds(data.beds);
      setMetrics(data.metrics);
      setError(null);
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/beds", { cache: "no-store" });
        if (!response.ok) throw new Error("beds_fetch_failed");
        const data = (await response.json()) as {
          beds: EmergencyBed[];
          metrics: BedMetrics;
        };
        if (!cancelled) applyPayload(data);
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar las camas de urgencia.");
          setIsLoading(false);
        }
      }
    }

    void load();
    if (pollMs <= 0) {
      return () => {
        cancelled = true;
      };
    }
    const id = window.setInterval(() => {
      void load();
    }, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [applyPayload, pollMs]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/beds", { cache: "no-store" });
      if (!response.ok) throw new Error("beds_fetch_failed");
      const data = (await response.json()) as {
        beds: EmergencyBed[];
        metrics: BedMetrics;
      };
      applyPayload(data);
    } catch {
      setError("No se pudieron cargar las camas de urgencia.");
      setIsLoading(false);
    }
  }, [applyPayload]);

  return { beds, metrics, isLoading, error, refresh };
}
