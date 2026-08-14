import { EventCard, PrimaryButton } from "@/components/ui";
import { getDraftStructure } from "@/services/draft";
import { getDemoSession } from "@/services/session";
import { getSupabase } from "@/services/supabase";
import { EVENT_LABEL } from "@shared/clinical";
import { publishClinicalConfirmation } from "@shared/publish";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function ReviewScreen() {
  const router = useRouter();
  const structured = getDraftStructure();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!structured) return;
    const supabase = getSupabase();
    if (!supabase) {
      setError("Falta EXPO_PUBLIC_SUPABASE_URL / ANON_KEY en mobile/.env");
      return;
    }
    setBusy(true);
    try {
      const session = await getDemoSession();
      await publishClinicalConfirmation(supabase, {
        hospitalId: session.hospitalId,
        professionalId: session.professionalId,
        structure: structured,
      });
      router.replace("/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar");
    } finally {
      setBusy(false);
    }
  }

  if (!structured) {
    return (
      <View className="flex-1 items-center justify-center bg-wash px-5">
        <Text className="text-sm text-muted">No hay extracción pendiente.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-wash" contentContainerClassName="px-5 pb-10 pt-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-cvblue">
        Paciente {structured.patient_code_hint ?? "nuevo"}
      </Text>
      <Text className="mt-1 text-xs text-muted">
        {structured.sex === "M" ? "MASC" : structured.sex === "F" ? "FEM" : "—"}
        {structured.age_years ? ` · ${structured.age_years} A` : ""} · URGENCIA
      </Text>
      <Text className="mt-4 text-sm leading-5 text-ink">{structured.transcript}</Text>
      <Text className="mt-6 text-[11px] font-semibold uppercase tracking-[2px] text-muted">
        IA propone
      </Text>
      <View className="mt-3 gap-2">
        {structured.events.map((event) => (
          <EventCard
            key={event}
            warn={event === "POSSIBLE_ICU_REQUIREMENT"}
            title={EVENT_LABEL[event]}
            detail={
              event === "POSSIBLE_ICU_REQUIREMENT"
                ? "Pendiente de confirmación · no suma a demanda"
                : structured.relevant_condition ?? "Listo para publicar"
            }
          />
        ))}
      </View>
      {error ? <Text className="mt-4 text-sm text-cvred">{error}</Text> : null}
      <View className="mt-6">
        <PrimaryButton
          disabled={busy}
          label={busy ? "Publicando…" : "Confirmar y publicar"}
          onPress={() => void confirm()}
        />
      </View>
    </ScrollView>
  );
}
