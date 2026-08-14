import { PrimaryButton } from "@/components/ui";
import { getDraftStructure } from "@/services/draft";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function SuccessScreen() {
  const router = useRouter();
  const structured = getDraftStructure();
  const stamp = new Date().toLocaleTimeString("es-CL");

  return (
    <View className="flex-1 bg-wash px-5 pt-10">
      <View className="items-center">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-cvgreen">
          <Text className="text-3xl font-bold text-white">✓</Text>
        </View>
        <Text className="mt-5 text-center text-xl font-semibold text-ink">
          Publicado en la consola central
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">
          La demanda del hospital se actualizó. Ábrelo en /hospital y /red para
          ver el cambio en vivo.
        </Text>
      </View>

      <Text className="mt-8 text-[11px] font-semibold uppercase tracking-[2px] text-muted">
        Eventos publicados
      </Text>
      <View className="mt-2 gap-1">
        {(structured?.events ?? []).map((event) => (
          <Text key={event} className="font-mono text-[11px] text-muted">
            {stamp} · {event}
          </Text>
        ))}
      </View>
      <View className="mt-4 rounded-xl bg-paper px-3 py-2">
        <Text className="text-xs text-muted">Validado por E. Riquelme</Text>
      </View>

      <View className="mt-8">
        <PrimaryButton
          success
          label="Registrar otro paciente"
          onPress={() => router.replace("/")}
        />
      </View>
    </View>
  );
}
