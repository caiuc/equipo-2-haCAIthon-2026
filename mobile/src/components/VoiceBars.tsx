import { Text, View } from "react-native";

export function VoiceBars({
  bars,
  active = true,
}: {
  bars: number[];
  active?: boolean;
}) {
  const display = bars.length ? bars : Array.from({ length: 22 }, () => 0.1);
  return (
    <View className="h-[72px] flex-row items-end justify-center gap-[3px]">
      {display.map((value, index) => (
        <View
          key={index}
          className="w-[5px] rounded-full bg-cvgreen"
          style={{
            height: Math.max(8, (active ? value : 0.1) * 72),
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </View>
  );
}

export function LiveChips({
  chips,
}: {
  chips: Array<{ id: string; label: string; tone: "ok" | "warn" }>;
}) {
  if (!chips.length) {
    return (
      <Text className="text-xs text-muted">Detectando mientras habla…</Text>
    );
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {chips.map((chip) => (
        <View
          key={chip.id}
          className={`rounded-full px-2.5 py-1 ${
            chip.tone === "warn" ? "bg-cvamber/15" : "bg-cvgreen/15"
          }`}
        >
          <Text
            className={`text-[11px] font-semibold ${
              chip.tone === "warn" ? "text-cvamber" : "text-cvgreen"
            }`}
          >
            {chip.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
