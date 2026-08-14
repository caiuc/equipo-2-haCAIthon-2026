import { PrimaryButton } from "@/components/ui";
import { useLiveRecords } from "@/hooks/useLiveRecords";
import {
  DEMO_HOSPITALIZATION_PHRASE,
  DEMO_UNCERTAINTY_PHRASE,
} from "@shared/clinical";
import { parseClinicalText } from "@shared/clinicalParser";
import { setDraftStructure, setDraftTranscript } from "@/services/draft";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { records, error } = useLiveRecords();

  function goReview(phrase: string) {
    setDraftTranscript(phrase);
    setDraftStructure(parseClinicalText(phrase));
    router.push("/review");
  }

  return (
    <ScrollView className="flex-1 bg-wash" contentContainerClassName="px-5 pb-10 pt-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-cvblue">
        Hospital A · Urgencia adultos
      </Text>
      <Text className="mt-2 text-3xl font-bold text-ink">Mic inactivo</Text>
      <Text className="mt-2 text-sm leading-5 text-muted">
        El micrófono no escucha en continuo. Actívalo solo para registrar un
        paciente. El audio no se almacena.
      </Text>

      <View className="mt-6">
        <PrimaryButton
          label="Activar micrófono"
          onPress={() => router.push("/recording")}
        />
      </View>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={() => goReview(DEMO_HOSPITALIZATION_PHRASE)}
          className="flex-1 rounded-xl border border-line bg-paper px-3 py-3"
        >
          <Text className="text-center text-sm font-semibold text-ink">Demo UCI</Text>
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

      <Text className="mt-8 text-[11px] font-semibold uppercase tracking-[2px] text-muted">
        Mis últimos registros
      </Text>
      <View className="mt-3 gap-2">
        {error ? (
          <Text className="text-sm text-cvred">{error}</Text>
        ) : records.length === 0 ? (
          <Text className="text-sm text-muted">
            Aún no hay registros. Corre supabase/003_seed.sql o publica el
            primero.
          </Text>
        ) : (
          records.map((item) => (
            <View key={item.id} className="rounded-xl border border-line bg-paper p-3">
              <Text className="font-mono text-[11px] text-cvblue">
                {item.status}
                {item.created_at
                  ? ` · ${new Date(item.created_at).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </Text>
              <Text className="mt-1 text-sm text-ink" numberOfLines={3}>
                {item.transcript}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
