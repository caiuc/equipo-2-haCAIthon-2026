import { MicButton } from "@/components/MicButton";
import { useLiveRecords } from "@/hooks/useLiveRecords";
import { setDraftStructure, setDraftTranscript } from "@/services/draft";
import {
  DEMO_HOSPITALIZATION_PHRASE,
  DEMO_UNCERTAINTY_PHRASE,
} from "@shared/clinical";
import { parseClinicalText } from "@shared/clinicalParser";
import type { VoiceStatus } from "@shared/database.types";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUS_LABEL: Record<VoiceStatus, string> = {
  pending: "Pendiente",
  validated: "Validado",
  edited: "Editado",
  discarded: "Descartado",
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { records, error, refresh } = useLiveRecords();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  function goReview(phrase: string) {
    setDraftTranscript(phrase);
    setDraftStructure(parseClinicalText(phrase));
    router.push("/review");
  }

  return (
    <View className="flex-1 bg-wash">
      <View className="px-5 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold tracking-[3px] text-ink">
              SIRENA
            </Text>
            <Text className="mt-1 text-[11px] font-semibold uppercase tracking-[2px] text-muted">
              Hospital A · Urgencia adultos
            </Text>
          </View>
          <Text className="rounded-full bg-paper px-2 py-1 text-[11px] font-semibold text-muted">
            ● Mic inactivo
          </Text>
        </View>

        <View className="mt-8">
          <MicButton onPress={() => router.push("/recording")} />
        </View>

        <View className="mt-6 flex-row gap-2">
          <Pressable
            onPress={() => goReview(DEMO_HOSPITALIZATION_PHRASE)}
            className="flex-1 rounded-xl border border-line bg-paper px-3 py-3"
          >
            <Text className="text-center text-sm font-semibold text-ink">
              Demo UCI
            </Text>
          </Pressable>
          <Pressable
            onPress={() => goReview(DEMO_UNCERTAINTY_PHRASE)}
            className="flex-1 rounded-xl border border-line bg-paper px-3 py-3"
          >
            <Text className="text-center text-sm font-semibold text-ink">
              Incertidumbre
            </Text>
          </Pressable>
        </View>

        <Text className="mt-6 text-[11px] font-semibold uppercase tracking-[2px] text-muted">
          Mis últimos registros
        </Text>
      </View>

      <ScrollView
        className="mt-3 flex-1 px-5"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <Text className="text-sm text-cvred">{error}</Text>
        ) : records.length === 0 ? (
          <Text className="text-sm text-muted">
            Aún no hay registros en este hospital.
          </Text>
        ) : (
          records.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/record/${item.id}`)}
              className="mb-2 rounded-xl border border-line bg-paper p-3"
            >
              <Text className="font-mono text-[11px] text-cvgreen">
                {STATUS_LABEL[item.status] ?? item.status}
                {item.created_at
                  ? ` · ${new Date(item.created_at).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-ink">
                {item.transcript?.trim() || "Sin transcripción"}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
