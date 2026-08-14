"use client";

import { DEMO_HOSPITAL_ID } from "@shared/clinical";
import type {
  ClinicalEvent,
  DischargePipeline,
  Hospital,
  HospitalCapacity,
  TransferSuggestion,
  VoiceRecord,
} from "@shared/database.types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

export type NetworkSnapshot = {
  hospitals: Hospital[];
  capacities: HospitalCapacity[];
  events: ClinicalEvent[];
  voices: VoiceRecord[];
  pipelines: DischargePipeline[];
  transfers: TransferSuggestion[];
};

const empty: NetworkSnapshot = {
  hospitals: [],
  capacities: [],
  events: [],
  voices: [],
  pipelines: [],
  transfers: [],
};

export function useNetworkData(hospitalId = DEMO_HOSPITAL_ID) {
  const [data, setData] = useState<NetworkSnapshot>(empty);
  const [error, setError] = useState<string | null>(null);
  const [configured] = useState(() => getSupabaseBrowserClient() !== null);
  const [loading, setLoading] = useState(() => getSupabaseBrowserClient() !== null);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const [
      hospitals,
      capacities,
      events,
      voices,
      pipelines,
      transfers,
    ] = await Promise.all([
      supabase.from("hospitals").select("*").order("name"),
      supabase.from("hospital_capacity").select("*"),
      supabase
        .from("clinical_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("voice_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("discharge_pipeline").select("*"),
      supabase.from("transfer_suggestions").select("*").order("created_at", {
        ascending: false,
      }),
    ]);
    const firstError =
      hospitals.error ||
      capacities.error ||
      events.error ||
      voices.error ||
      pipelines.error ||
      transfers.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    setError(null);
    setData({
      hospitals: hospitals.data ?? [],
      capacities: capacities.data ?? [],
      events: events.data ?? [],
      voices: voices.data ?? [],
      pipelines: pipelines.data ?? [],
      transfers: transfers.data ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const handle = window.setTimeout(() => {
      void refresh();
    }, 0);
    const channel = supabase
      .channel("cv-network")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hospital_capacity" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinical_events" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voice_records" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discharge_pipeline" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      window.clearTimeout(handle);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const hospital = useMemo(
    () => data.hospitals.find((item) => item.id === hospitalId) ?? data.hospitals[0] ?? null,
    [data.hospitals, hospitalId],
  );

  const hospitalCapacities = useMemo(
    () => data.capacities.filter((item) => item.hospital_id === (hospital?.id ?? hospitalId)),
    [data.capacities, hospital?.id, hospitalId],
  );

  return {
    ...data,
    hospital,
    hospitalCapacities,
    error,
    configured,
    loading,
    refresh,
  };
}
