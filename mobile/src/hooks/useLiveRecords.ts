import { DEMO_HOSPITAL_ID } from "@shared/clinical";
import type { VoiceRecord } from "@shared/database.types";
import { getSupabase } from "@/services/supabase";
import { useCallback, useEffect, useState } from "react";

export function useLiveRecords(hospitalId = DEMO_HOSPITAL_ID) {
  const [records, setRecords] = useState<VoiceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Falta EXPO_PUBLIC_SUPABASE_URL / ANON_KEY en mobile/.env");
      return;
    }
    const { data, error: queryError } = await supabase
      .from("voice_records")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setError(null);
    setRecords(data ?? []);
  }, [hospitalId]);

  useEffect(() => {
    void refresh();
    const supabase = getSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel("cv-mobile-voices")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voice_records" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { records, refresh, error };
}
