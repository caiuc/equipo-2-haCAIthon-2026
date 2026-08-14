"use client";

import { useCallback, useRef, useState } from "react";

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceCapture({
  whisperEnabled,
  fallbackToWebSpeech,
}: {
  whisperEnabled: boolean;
  fallbackToWebSpeech: boolean;
}) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const mediaRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: BlobPart[];
  } | null>(null);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    const file = new File([blob], "reporte.webm", {
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

  const startWebSpeech = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) {
      setSpeechError(
        "No hay transcripción disponible. Usa una frase de demo o escribe el reporte.",
      );
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "es-CL";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      setTranscript(event.results[0]?.[0]?.transcript ?? "");
    };
    recognition.onerror = (event) => {
      setSpeechError(
        `Captura de voz no disponible (${event.error}). Usa el fallback.`,
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    setSpeechError(null);
    setListening(true);
    recognition.start();
  }, []);

  const startListening = useCallback(async () => {
    setSpeechError(null);
    if (!whisperEnabled) {
      if (fallbackToWebSpeech) {
        startWebSpeech();
        return;
      }
      setSpeechError("Activa Whisper para grabar, o usa una frase de demo.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaRef.current = null;
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        setTranscribing(true);
        try {
          const text = await transcribeBlob(blob);
          if (text) {
            setTranscript(text);
            return;
          }
          if (fallbackToWebSpeech) {
            startWebSpeech();
            return;
          }
          setSpeechError(
            "Whisper no está configurado. Agrega APIFY_STT_API_KEY o usa una frase de demo.",
          );
        } catch {
          if (fallbackToWebSpeech) {
            setSpeechError(
              "Whisper no respondió. Prueba Web Speech o una frase de demo.",
            );
            startWebSpeech();
            return;
          }
          setSpeechError(
            "Whisper no respondió. Revisa la clave STT o usa una frase de demo.",
          );
        } finally {
          setTranscribing(false);
        }
      };
      mediaRef.current = { recorder, stream, chunks };
      recorder.start();
      setListening(true);
    } catch {
      if (fallbackToWebSpeech) {
        startWebSpeech();
        return;
      }
      setSpeechError(
        "No se pudo acceder al micrófono. Permite el audio o usa una frase de demo.",
      );
    }
  }, [
    fallbackToWebSpeech,
    startWebSpeech,
    transcribeBlob,
    whisperEnabled,
  ]);

  const stopListening = useCallback(() => {
    const current = mediaRef.current;
    if (current) {
      if (current.recorder.state !== "inactive") current.recorder.stop();
      setListening(false);
      return;
    }
    setListening(false);
  }, []);

  return {
    transcript,
    setTranscript,
    listening,
    transcribing,
    speechError,
    startListening,
    stopListening,
  };
}
