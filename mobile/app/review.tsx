import { ClinicalFormCard } from "@/components/ClinicalFormCard";
import { PrimaryButton } from "@/components/ui";
import { getDraftStructure, setDraftStructure } from "@/services/draft";
import { getDemoSession } from "@/services/session";
import { getSupabase } from "@/services/supabase";
import { publishClinicalConfirmation } from "@shared/publish";
import type { ClinicalStructure } from "@shared/clinical";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function ReviewScreen() {
  const router = useRouter();
  const initial = getDraftStructure();
  const [form, setForm] = useState<ClinicalStructure | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!form) return;
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
        structure: form,
      });
      setDraftStructure(form);
      router.replace("/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar");
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    return (
      <View className="flex-1 items-center justify-center bg-wash px-5">
        <Text className="text-sm text-muted">No hay extracción pendiente.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-wash"
      contentContainerClassName="px-5 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-semibold text-ink">
            Paciente {form.patient_code_hint ?? "nuevo"}
          </Text>
          <Text className="mt-1 text-xs text-muted">
            Formulario propuesto · editable antes de publicar
          </Text>
        </View>
        <Text className="rounded-full bg-cvblue/10 px-2 py-1 text-[11px] font-semibold text-cvblue">
          IA propone
        </Text>
      </View>

      <View className="mt-5">
        <ClinicalFormCard value={form} onChange={setForm} />
      </View>

      {error ? <Text className="mt-4 text-sm text-cvred">{error}</Text> : null}

      <View className="mt-6">
        <PrimaryButton
          disabled={busy}
          label={busy ? "Publicando…" : "Confirmar y publicar"}
          onPress={() => void confirm()}
        />
      </View>
      <View className="mt-2 flex-row gap-2">
        <Pressable
          onPress={() => router.replace("/")}
          className="flex-1 items-center rounded-xl border border-line bg-paper py-3"
        >
          <Text className="text-sm font-semibold text-ink">Repetir registro</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace("/recording")}
          className="flex-1 items-center rounded-xl border border-line bg-paper py-3"
        >
          <Text className="text-sm font-semibold text-ink">Regrabar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
