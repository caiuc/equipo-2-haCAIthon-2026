import { Pressable, Text, View } from "react-native";

export function EventCard({
  title,
  detail,
  warn,
}: {
  title: string;
  detail: string;
  warn?: boolean;
}) {
  return (
    <View className="rounded-xl border border-line bg-paper px-4 py-3">
      <Text className="text-base font-semibold text-ink">
        {warn ? "⚠ " : "✓ "}
        {title}
      </Text>
      <Text className="mt-1 text-xs text-muted">{detail}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center rounded-xl px-4 py-3 ${
        danger ? "bg-cvred" : "bg-cvblue"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <Text className="font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
