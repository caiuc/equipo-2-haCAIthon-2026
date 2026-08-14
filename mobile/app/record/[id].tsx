import { ClinicalFormCard } from "@/components/ClinicalFormCard";
import { getSupabase } from "@/services/supabase";
import type { ClinicalEvent, VoiceRecord } from "@shared/database.types";
import { buildRecordDetail } from "@shared/recordDetail";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [record, setRecord] = useState<VoiceRecord | null>(null);
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !id) {
      setError("No se pudo abrir el registro.");
      setLoading(false);
      return;
    }
    void Promise.all([
      supabase.from("voice_records").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("clinical_events")
        .select("*")
        .eq("voice_record_id", id)
        .order("created_at", { ascending: false }),
    ]).then(([voice, related]) => {
      if (voice.error) setError(voice.error.message);
      else if (!voice.data) setError("Registro no encontrado.");
      else setRecord(voice.data);
      if (related.data) setEvents(related.data);
      setLoading(false);
    });
  }, [id]);

  const detail = useMemo(
    () => (record ? buildRecordDetail(record, events) : null),
    [record, events],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-wash">
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View className="flex-1 items-center justify-center bg-wash px-5">
        <Text className="text-sm text-cvred">{error ?? "Sin ficha."}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-wash"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Math.max(insets.bottom, 16) + 12,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-semibold text-ink">
            Paciente {detail.form.patient}
          </Text>
          <Text className="mt-1 text-xs text-muted">
            {detail.form.sex} · {detail.form.age}
            {detail.createdAt
              ? ` · ${new Date(detail.createdAt).toLocaleString("es-CL")}`
              : ""}
          </Text>
        </View>
        <Text
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            detail.form.criticalityKey === "high"
              ? "bg-cvred/15 text-cvred"
              : detail.form.criticalityKey === "medium"
                ? "bg-cvamber/15 text-cvamber"
                : "bg-cvgreen/15 text-cvgreen"
          }`}
        >
          Criticidad {detail.form.criticality}
        </Text>
      </View>

      {!detail.hasSnapshot ? (
        <Text className="mt-4 rounded-xl bg-cvamber/15 px-3 py-2 text-xs text-cvamber">
          Este registro no tiene snapshot del formulario. Se reconstruye desde
          el dictado y los eventos publicados.
        </Text>
      ) : null}

      <Text className="mt-5 text-[11px] font-semibold uppercase tracking-[2px] text-cvred">
        Casos críticos
      </Text>
      {detail.criticalEvents.length === 0 ? (
        <Text className="mt-2 text-sm text-muted">Sin casos críticos.</Text>
      ) : (
        detail.criticalEvents.map((item) => (
          <Text
            key={item.kind}
            className="mt-2 rounded-xl bg-cvred/10 px-3 py-2 text-sm text-cvred"
          >
            {item.label}
          </Text>
        ))
      )}

      <View className="mt-5">
        <ClinicalFormCard value={detail.structure} readOnly />
      </View>
    </ScrollView>
  );
}
