import "react-native-gesture-handler";
import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: "#0F1B2D",
          headerStyle: { backgroundColor: "#F1F4F8" },
          contentStyle: { backgroundColor: "#F1F4F8" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" options={{ title: "SIRENA" }} />
        <Stack.Screen name="recording" options={{ title: "Grabando" }} />
        <Stack.Screen name="review" options={{ title: "IA propone" }} />
        <Stack.Screen name="record/[id]" options={{ title: "Ficha" }} />
        <Stack.Screen name="success" options={{ title: "Publicado" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
