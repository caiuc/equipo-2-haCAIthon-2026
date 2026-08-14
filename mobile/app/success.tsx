import { PrimaryButton } from "@/components/ui";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function SuccessScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-wash px-5 pt-10">
      <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-cvgreen">
        Publicado en la consola central
      </Text>
      <Text className="mt-3 text-3xl font-bold text-ink">
        La red ya lo refleja
      </Text>
      <Text className="mt-3 text-sm leading-5 text-muted">
        La demanda del hospital se actualizó. Ábrelo en /hospital y /red para
        ver el cambio en vivo.
      </Text>
      <View className="mt-10">
        <PrimaryButton
          label="Registrar otro paciente"
          onPress={() => router.replace("/")}
        />
      </View>
    </View>
  );
}
