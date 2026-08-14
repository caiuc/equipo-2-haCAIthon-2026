import { LiveChips, VoiceBars } from "@/components/VoiceBars";
import { PrimaryButton } from "@/components/ui";
import { useDeviceDictation } from "@/hooks/useDeviceDictation";
import { structureTranscript } from "@/services/api";
import { setDraftStructure, setDraftTranscript } from "@/services/draft";
import { detectLiveChips } from "@shared/clinicalParser";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function RecordingScreen() {
  const router = useRouter();
  const dictation = useDeviceDictation();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const chips = useMemo(
    () => detectLiveChips(dictation.transcript),
    [dictation.transcript],
  );

  useEffect(() => {
    void dictation.start();
    return () => dictation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish() {
    if (busy) return;
    setBusy(true);
    const text = await dictation.stopAndFlush();
    if (!text) {
      setLocalError(
        dictation.error ??
          "No se escuchó dictado. Habla más cerca o usa Demo UCI.",
      );
      setBusy(false);
      return;
    }
    const structured = await structureTranscript(text);
    setDraftTranscript(text);
    setDraftStructure(structured);
    router.replace("/review");
  }

  return (
    <View className="flex-1 bg-wash px-5 pt-4 pb-6">
      <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-cvred">
        ● Grabando {formatClock(dictation.elapsedMs)}
      </Text>

      <View className="mt-4">
        <VoiceBars bars={dictation.bars} active />
      </View>

      <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[2px] text-muted">
        Transcripción en vivo
      </Text>
      <ScrollView
        ref={scrollRef}
        className="mt-2 flex-1 rounded-2xl bg-paper"
        contentContainerClassName="p-4"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        <Text className="text-[15px] leading-6 text-ink">
          {dictation.transcript || "Hable ahora. El texto aparece acá."}
        </Text>
      </ScrollView>

      <Text className="mt-3 text-[11px] font-semibold uppercase tracking-[2px] text-muted">
        Detectando mientras habla
      </Text>
      <View className="mt-2 max-h-16">
        <LiveChips chips={chips} />
      </View>
      <Text className="mt-2 text-xs text-muted">
        El audio no se almacena: queda la transcripción y los eventos.
      </Text>
      {localError || dictation.error ? (
        <Text className="mt-2 text-sm text-cvamber">
          {localError ?? dictation.error}
        </Text>
      ) : null}

      <View className="mt-4">
        <PrimaryButton
          success
          disabled={busy}
          label={busy ? "Procesando dictado…" : "Detener grabación"}
          onPress={() => void finish()}
        />
      </View>
    </View>
  );
}
