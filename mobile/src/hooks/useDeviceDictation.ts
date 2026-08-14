import { Audio } from "expo-av";
import { barsFromEnergy } from "@shared/clinicalParser";
import {
  appendWhisperFields,
  joinTranscriptParts,
  parseWhisperText,
  SLICE_MS,
} from "@shared/stt";
import { apiBase } from "@/services/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

type Session = {
  stopRequested: boolean;
  interrupt: (() => void) | null;
  rec: Audio.Recording | null;
  parts: string[];
  seq: number;
  pending: number;
  finished: Promise<void>;
  markFinished: () => void;
};

function sttConfig() {
  const apiKey = process.env.EXPO_PUBLIC_STT_API_KEY ?? "";
  const baseUrl = (
    process.env.EXPO_PUBLIC_STT_BASE_URL ?? "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const model = process.env.EXPO_PUBLIC_STT_MODEL ?? "whisper-large-v3-turbo";
  return { apiKey, baseUrl, model };
}

function hasSttPath() {
  return Boolean(sttConfig().apiKey || apiBase());
}

function audioPart(uri: string): { uri: string; name: string; type: string } {
  const name = uri.split("/").pop() ?? "slice.m4a";
  const type = name.toLowerCase().endsWith(".wav")
    ? "audio/wav"
    : name.toLowerCase().endsWith(".webm")
      ? "audio/webm"
      : "audio/m4a";
  return { uri, name, type };
}

function wait(ms: number, session: Session) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    session.interrupt = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}

async function transcribeViaNext(
  uri: string,
  previous: string,
): Promise<string | null> {
  const part = audioPart(uri);
  const body = new FormData();
  body.append("file", part as unknown as Blob);
  if (previous) body.append("prompt", previous);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${apiBase()}/api/transcribe`, {
      method: "POST",
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    return parseWhisperText(await response.json());
  } catch {
    return null;
  }
}

async function transcribeViaGroq(
  uri: string,
  previous: string,
): Promise<string> {
  const { apiKey, baseUrl, model } = sttConfig();
  if (!apiKey) return "";
  const part = audioPart(uri);
  const body = new FormData();
  body.append("file", part as unknown as Blob);
  appendWhisperFields(body, { model, previousText: previous });
  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  });
  if (!response.ok) return "";
  return parseWhisperText(await response.json());
}

async function transcribeUri(uri: string, previous: string): Promise<string> {
  const viaNext = await transcribeViaNext(uri, previous);
  if (viaNext !== null) return viaNext;
  return transcribeViaGroq(uri, previous);
}

export function useDeviceDictation() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(22).fill(0.1));
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const startedAt = useRef(0);
  const transcriptRef = useRef("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!listening) return;
    const tick = () => setElapsedMs(Date.now() - startedAt.current);
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [listening]);

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    setElapsedMs(0);
    setBars(Array(22).fill(0.1));

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setError("Sin permiso de micrófono. Usa Demo UCI.");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    let markFinished: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
      markFinished = resolve;
    });
    const session: Session = {
      stopRequested: false,
      interrupt: null,
      rec: null,
      parts: [],
      seq: 0,
      pending: 0,
      finished,
      markFinished,
    };
    sessionRef.current = session;
    startedAt.current = Date.now();
    setListening(true);
    setTranscribing(hasSttPath());

    const onStatus = (status: Audio.RecordingStatus) => {
      if (!status.isRecording) return;
      const metering = status.metering ?? -45;
      const energy = Math.min(1, Math.max(0, (metering + 48) / 42));
      setBars(barsFromEnergy(energy, Date.now()));
    };

    void (async () => {
      try {
        while (!session.stopRequested) {
          const { recording } = await Audio.Recording.createAsync(
            {
              ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
              isMeteringEnabled: true,
              android: {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                extension: ".m4a",
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
              },
            },
            onStatus,
            80,
          );
          session.rec = recording;
          await wait(SLICE_MS, session);
          session.rec = null;
          try {
            await recording.stopAndUnloadAsync();
          } catch {
            /* already stopped */
          }
          const uri = recording.getURI();
          if (!uri || !hasSttPath()) continue;
          const seq = session.seq;
          session.seq += 1;
          session.pending += 1;
          void transcribeUri(uri, joinTranscriptParts(session.parts))
            .then((text) => {
              if (!text) return;
              session.parts[seq] = text;
              const next = joinTranscriptParts(session.parts);
              transcriptRef.current = next;
              setTranscript(next);
            })
            .finally(() => {
              session.pending -= 1;
            });
        }
        while (session.pending > 0) {
          await wait(80, session);
        }
        if (!transcriptRef.current) {
          setError(
            hasSttPath()
              ? "No se escuchó dictado. Habla más cerca o usa Demo UCI."
              : "Sin STT. Usa Demo UCI o configura EXPO_PUBLIC_STT_API_KEY / EXPO_PUBLIC_API_URL.",
          );
        }
      } catch {
        setError("No se pudo usar el micrófono. Prueba Demo UCI.");
      } finally {
        setListening(false);
        setTranscribing(false);
        session.markFinished();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
          () => undefined,
        );
        if (sessionRef.current === session) sessionRef.current = null;
      }
    })();
  }, []);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session) {
      setListening(false);
      return;
    }
    session.stopRequested = true;
    session.interrupt?.();
    if (session.rec) {
      void session.rec.stopAndUnloadAsync().catch(() => undefined);
    }
    setListening(false);
  }, []);

  const stopAndFlush = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return transcriptRef.current.trim();
    session.stopRequested = true;
    session.interrupt?.();
    if (session.rec) {
      try {
        await session.rec.stopAndUnloadAsync();
      } catch {
        /* already stopped */
      }
      session.rec = null;
    }
    await session.finished;
    setListening(false);
    return transcriptRef.current.trim();
  }, []);

  return {
    transcript,
    setTranscript,
    listening,
    transcribing,
    elapsedMs,
    bars,
    error,
    hasOnDeviceStt: hasSttPath(),
    start,
    stop,
    stopAndFlush,
  };
}
