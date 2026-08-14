"use client";

import { joinTranscript, mergeSpeechResults } from "@/lib/voice/speech";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type VoiceCapturePhase =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "stopping"
  | "transcribing"
  | "review"
  | "error";

type RecognitionResult = ArrayLike<{ transcript: string }> & {
  isFinal: boolean;
};

type RecognitionEvent = {
  results: ArrayLike<RecognitionResult>;
};

type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => RecognitionInstance;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return (
    browserWindow.SpeechRecognition ??
    browserWindow.webkitSpeechRecognition ??
    null
  );
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null;
}

function subscribeToBrowserCapability() {
  return () => undefined;
}

export function useVoiceCapture({
  whisperEnabled,
  fallbackToWebSpeech,
}: {
  whisperEnabled: boolean;
  fallbackToWebSpeech: boolean;
}) {
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [phase, setPhase] = useState<VoiceCapturePhase>("idle");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const liveSupported = useSyncExternalStore(
    subscribeToBrowserCapability,
    () => Boolean(getRecognition()),
    () => false,
  );
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sttEngine, setSttEngine] = useState<
    "groq-whisper" | "web-speech" | "manual"
  >("web-speech");

  const phaseRef = useRef<VoiceCapturePhase>("idle");
  const mediaRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: BlobPart[];
  } | null>(null);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const recognitionPrefixRef = useRef("");
  const finalTranscriptRef = useRef("");
  const wantsRecognitionRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const audioFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const beginRecognitionRef = useRef<() => void>(() => undefined);

  const updatePhase = useCallback((next: VoiceCapturePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    return () => {
      wantsRecognitionRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
      if (durationTimerRef.current !== null) {
        window.clearInterval(durationTimerRef.current);
      }
      if (audioFrameRef.current !== null) {
        window.cancelAnimationFrame(audioFrameRef.current);
      }
      recognitionRef.current?.abort?.();
      mediaRef.current?.stream.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, []);

  const setFinal = useCallback((text: string) => {
    finalTranscriptRef.current = text;
    setFinalTranscript(text);
  }, []);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    const extension = blob.type.includes("mp4") ? "m4a" : "webm";
    const file = new File([blob], `reporte.${extension}`, {
      type: blob.type || "audio/webm",
    });
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/transcribe", { method: "POST", body });
    if (response.status === 501) return null;
    if (!response.ok) throw new Error("stt_failed");
    const data = (await response.json()) as { text?: string };
    return data.text?.trim() ?? "";
  }, []);

  const beginRecognition = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor || !fallbackToWebSpeech || !wantsRecognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = "es-CL";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionPrefixRef.current = finalTranscriptRef.current;

    recognition.onresult = (event) => {
      const results = Array.from(event.results, (result) => ({
        isFinal: result.isFinal,
        transcript: result[0]?.transcript ?? "",
      }));
      const merged = mergeSpeechResults(recognitionPrefixRef.current, results);
      setFinal(merged.finalTranscript);
      setInterimTranscript(merged.interimTranscript);
      if (merged.finalTranscript) setSttEngine("web-speech");
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantsRecognitionRef.current = false;
        setSpeechError(
          "El navegador bloqueó la transcripción en vivo. El audio seguirá grabándose para Whisper.",
        );
        return;
      }
      setSpeechError(
        "La transcripción en vivo se interrumpió. Seguimos grabando y Whisper consolidará el texto al terminar.",
      );
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      recognitionPrefixRef.current = finalTranscriptRef.current;
      setInterimTranscript("");
      if (wantsRecognitionRef.current && phaseRef.current === "listening") {
        restartTimerRef.current = window.setTimeout(
          () => beginRecognitionRef.current(),
          180,
        );
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [fallbackToWebSpeech, setFinal]);

  useEffect(() => {
    beginRecognitionRef.current = beginRecognition;
  }, [beginRecognition]);

  const startMeter = useCallback((stream: MediaStream) => {
    const AudioContextCtor = getAudioContext();
    if (!AudioContextCtor) return;
    try {
      const context = new AudioContextCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = context;

      const sample = () => {
        analyser.getByteFrequencyData(samples);
        const average =
          samples.reduce((total, value) => total + value, 0) / samples.length;
        setAudioLevel(Math.min(1, average / 92));
        audioFrameRef.current = window.requestAnimationFrame(sample);
      };
      sample();
    } catch {
      setAudioLevel(0.18);
    }
  }, []);

  const finishMeter = useCallback(() => {
    if (audioFrameRef.current !== null) {
      window.cancelAnimationFrame(audioFrameRef.current);
      audioFrameRef.current = null;
    }
    setAudioLevel(0);
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (
      phaseRef.current === "listening" ||
      phaseRef.current === "requesting_permission"
    ) {
      return;
    }
    setSpeechError(null);
    setInterimTranscript("");
    setFinal("");
    setDurationSeconds(0);
    setSttEngine("web-speech");
    updatePhase("requesting_permission");

    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        throw new Error("unsupported_media");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setSpeechError("La grabación se interrumpió. Intenta iniciar un nuevo registro.");
        updatePhase("error");
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaRef.current = null;
        finishMeter();
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });

        if (!whisperEnabled || blob.size === 0) {
          updatePhase(finalTranscriptRef.current ? "review" : "error");
          if (!finalTranscriptRef.current) {
            setSpeechError("No se detectó audio. Intenta nuevamente o escribe el reporte.");
          }
          return;
        }

        updatePhase("transcribing");
        try {
          const text = await transcribeBlob(blob);
          if (text) {
            setFinal(text);
            setInterimTranscript("");
            setSttEngine("groq-whisper");
          } else {
            setSpeechError(
              "Whisper no está configurado. Conservamos la transcripción en vivo para revisión.",
            );
          }
          updatePhase(finalTranscriptRef.current || text ? "review" : "error");
        } catch {
          setSpeechError(
            finalTranscriptRef.current
              ? "Whisper no respondió. Conservamos la transcripción en vivo para revisión."
              : "Whisper no respondió y no hubo transcripción en vivo. Puedes escribir el reporte manualmente.",
          );
          updatePhase(finalTranscriptRef.current ? "review" : "error");
        }
      };

      mediaRef.current = { recorder, stream, chunks };
      recorder.start(250);
      startedAtRef.current = Date.now();
      durationTimerRef.current = window.setInterval(() => {
        setDurationSeconds(
          Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        );
      }, 500);
      updatePhase("listening");
      startMeter(stream);

      if (fallbackToWebSpeech && getRecognition()) {
        wantsRecognitionRef.current = true;
        beginRecognition();
      } else {
        wantsRecognitionRef.current = false;
        setSpeechError(
          "Este navegador no ofrece texto en vivo. La grabación continúa y Whisper transcribirá al terminar.",
        );
      }
    } catch (error) {
      setSpeechError(
        error instanceof Error && error.message === "unsupported_media"
          ? "Este navegador no permite grabar audio. Escribe el reporte manualmente."
          : "No se pudo acceder al micrófono. Revisa el permiso del navegador e intenta nuevamente.",
      );
      updatePhase("error");
    }
  }, [
    beginRecognition,
    fallbackToWebSpeech,
    finishMeter,
    setFinal,
    startMeter,
    transcribeBlob,
    updatePhase,
    whisperEnabled,
  ]);

  const stopListening = useCallback(() => {
    if (phaseRef.current !== "listening") return;
    updatePhase("stopping");
    wantsRecognitionRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
    if (durationTimerRef.current !== null) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    const current = mediaRef.current;
    if (current?.recorder.state !== "inactive") current?.recorder.stop();
    else updatePhase(finalTranscriptRef.current ? "review" : "error");
  }, [updatePhase]);

  const setTranscript = useCallback(
    (text: string) => {
      setFinal(text);
      setInterimTranscript("");
      setSttEngine("manual");
      if (text.trim() && phaseRef.current !== "listening") updatePhase("review");
    },
    [setFinal, updatePhase],
  );

  const reset = useCallback(() => {
    wantsRecognitionRef.current = false;
    setFinal("");
    setInterimTranscript("");
    setSpeechError(null);
    setDurationSeconds(0);
    setAudioLevel(0);
    setSttEngine("web-speech");
    updatePhase("idle");
  }, [setFinal, updatePhase]);

  const transcript = joinTranscript(finalTranscript, interimTranscript);

  return {
    phase,
    transcript,
    finalTranscript,
    interimTranscript,
    setTranscript,
    listening: phase === "listening",
    transcribing: phase === "transcribing" || phase === "stopping",
    speechError,
    liveSupported,
    durationSeconds,
    audioLevel,
    sttEngine,
    startListening,
    stopListening,
    reset,
  };
}
