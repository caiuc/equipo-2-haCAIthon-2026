import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

export function MicButton({ onPress }: { onPress: () => void }) {
  return (
    <View className="items-center">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Micrófono"
        className="h-[132px] w-[132px] items-center justify-center rounded-full border-[3px] border-cvgreen bg-cvgreen/15"
      >
        <Ionicons name="mic" size={56} color="#0E9F6E" />
      </Pressable>
      <Text className="mt-3 text-[11px] font-bold uppercase tracking-[3px] text-cvgreen">
        Micrófono
      </Text>
      <Text className="mt-2 max-w-[260px] text-center text-sm leading-5 text-muted">
        Toque para dictar. El micrófono no queda escuchando en segundo plano.
      </Text>
    </View>
  );
}
