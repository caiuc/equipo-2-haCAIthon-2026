import { PrimaryButton } from "@/components/ui";
import { structureTranscript, transcribeRecording } from "@/services/api";
import { setDraftStructure, setDraftTranscript } from "@/services/draft";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

export default function RecordingScreen() {
  const router = useRouter();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Sin permiso de micrófono. Usa una frase de demo.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      if (cancelled) {
        await recording.stopAndUnloadAsync();
        return;
      }
      recordingRef.current = recording;
      setIsRecording(true);
    })();

    return () => {
      cancelled = true;
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) {
        void rec.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  async function finish() {
    setBusy(true);
    try {
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (!rec) throw new Error("sin_audio");
      await rec.stopAndUnloadAsync();
      setIsRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      if (!uri) throw new Error("sin_audio");
      const text = await transcribeRecording(uri);
      if (!text) throw new Error("stt_empty");
      const structured = await structureTranscript(text);
      setDraftTranscript(text);
      setDraftStructure(structured);
      router.replace("/review");
    } catch {
      setError(
        "No se pudo transcribir. Revisa EXPO_PUBLIC_API_URL o usa Demo UCI.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-wash px-5 pt-8">
      <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-cvred">
        Grabando
      </Text>
      <Text className="mt-2 text-3xl font-bold text-ink">
        Transcripción en vivo
      </Text>
      <Text className="mt-3 text-sm text-muted">
        Detectando mientras habla. El audio no se almacena: queda la
        transcripción y los eventos.
      </Text>
      <View className="mt-10 items-center">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-cvred/15">
          <View className="h-16 w-16 rounded-full bg-cvred" />
        </View>
        <Text className="mt-4 font-mono text-sm text-muted">
          {isRecording ? "MIC ACTIVO" : "preparando…"}
        </Text>
      </View>
      {error ? <Text className="mt-6 text-sm text-cvamber">{error}</Text> : null}
      <View className="mt-auto mb-10">
        <PrimaryButton
          danger
          disabled={busy}
          label={busy ? "Transcribiendo…" : "Terminar registro"}
          onPress={() => void finish()}
        />
      </View>
    </View>
  );
}
