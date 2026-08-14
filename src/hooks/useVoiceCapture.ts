"use client";

import { joinTranscriptParts, SLICE_MS } from "@shared/stt";
import {
  audioFileFromBlob,
  createRecorder,
  MIN_AUDIO_BYTES,
  pickRecorderMime,
} from "@/lib/audio/media";
import { useCallback, useEffect, useRef, useState } from "react";

const CHUNK_MS = SLICE_MS;

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecEvent = {
  results: ArrayLike<{
    isFinal?: boolean;
    0?: { transcript: string };
  }>;
};

type Session = {
  stream: MediaStream;
  mimeType: string;
  recorder: MediaRecorder | null;
  stopRequested: boolean;
  interruptSlice: (() => void) | null;
  loop: boolean;
  seq: number;
  parts: string[];
  pending: number;
  webSpeech: string;
  recognition: InstanceType<SpeechCtor> | null;
  audioContext: AudioContext | null;
  raf: number;
};

function getRecognition(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function postChunk(blob: Blob, previous: string): Promise<string> {
  const file = audioFileFromBlob(blob);
  const body = new FormData();
  body.append("file", file, file.name);
  if (previous) body.append("prompt", previous);
  const response = await fetch("/api/transcribe", { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as {
    text?: string;
    message?: string;
    error?: string;
  };
  if (response.status === 501) {
    throw new Error("stt_unconfigured");
  }
  if (!response.ok) {
    throw new Error(data.message || data.error || "stt_failed");
  }
  return data.text?.trim() ?? "";
}

function recordSlice(session: Session, durationMs: number): Promise<Blob> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (blob: Blob) => {
      if (settled) return;
      settled = true;
      session.recorder = null;
      session.interruptSlice = null;
      resolve(blob);
    };

    try {
      const recorder = createRecorder(session.stream, session.mimeType);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => finish(new Blob());
      recorder.onstop = () => {
        const type =
          recorder.mimeType || session.mimeType || "audio/webm";
        finish(new Blob(chunks, { type }));
      };
      session.recorder = recorder;
      recorder.start(200);

      const timer = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, durationMs);

      session.interruptSlice = () => {
        window.clearTimeout(timer);
        if (recorder.state !== "inactive") recorder.stop();
      };
    } catch {
      session.interruptSlice = null;
      resolve(new Blob());
    }
  });
}

export function useVoiceCapture() {
  const [transcript, setTranscript] = useState("");
  const [livePreview, setLivePreview] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [pendingChunks, setPendingChunks] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(22).fill(0.08));
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [sttReady, setSttReady] = useState<boolean | null>(null);
  const [sttModel, setSttModel] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const transcriptRef = useRef("");
  const previewRef = useRef("");
  const startedAtRef = useRef(0);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!listening) return;
    const tick = () => setElapsedMs(Date.now() - startedAtRef.current);
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [listening]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/transcribe/status")
      .then((response) => response.json())
      .then((data: { available?: boolean; model?: string | null }) => {
        if (cancelled) return;
        setSttReady(Boolean(data.available));
        setSttModel(data.model ?? null);
      })
      .catch(() => {
        if (!cancelled) setSttReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyParts = useCallback((parts: Array<string | undefined>) => {
    const next = joinTranscriptParts(parts);
    transcriptRef.current = next;
    setTranscript(next);
  }, []);

  const startWebSpeech = useCallback((session: Session) => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "es-CL";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const piece = event.results[i]?.[0]?.transcript ?? "";
        if (event.results[i]?.isFinal) finalText += `${piece} `;
        else interim += piece;
      }
      const preview = `${finalText}${interim}`.replace(/\s+/g, " ").trim();
      session.webSpeech = preview;
      previewRef.current = preview;
      setLivePreview(preview);
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "language-not-supported" && recognition.lang !== "es-ES") {
        recognition.lang = "es-ES";
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
        return;
      }
      if (!transcriptRef.current) {
        setSpeechError(
          "El navegador no pudo dar vista previa. Whisper sigue grabando.",
        );
      }
    };
    recognition.onend = () => {
      if (session.stopRequested) return;
      try {
        recognition.start();
      } catch {
        /* already started */
      }
    };
    session.recognition = recognition;
    try {
      recognition.start();
    } catch {
      /* unsupported locale or already started */
    }
  }, []);

  const startMeter = useCallback((session: Session) => {
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(session.stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      session.audioContext = audioContext;
      const freq = new Uint8Array(analyser.frequencyBinCount);
      const time = new Uint8Array(analyser.fftSize);
      let last = 0;
      const tick = (stamp: number) => {
        session.raf = window.requestAnimationFrame(tick);
        if (stamp - last < 50) return;
        last = stamp;
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(time);
        let sum = 0;
        for (const value of time) {
          const n = (value - 128) / 128;
          sum += n * n;
        }
        const nextBars = Array.from({ length: 22 }, (_, i) => {
          const idx = Math.min(
            freq.length - 1,
            Math.floor((i / 22) * freq.length),
          );
          return Math.min(1, freq[idx] / 190);
        });
        setBars(nextBars);
        setLevel(Math.min(1, Math.sqrt(sum / time.length) * 3.2));
      };
      session.raf = window.requestAnimationFrame(tick);
    } catch {
      session.audioContext = null;
    }
  }, []);

  const teardown = useCallback((session: Session) => {
    session.recognition?.abort?.();
    try {
      session.recognition?.stop();
    } catch {
      /* ignore */
    }
    session.stream.getTracks().forEach((track) => track.stop());
    if (session.raf) window.cancelAnimationFrame(session.raf);
    void session.audioContext?.close();
    setLevel(0);
  }, []);

  const startListening = useCallback(async () => {
    setSpeechError(null);
    setLivePreview("");
    setTranscript("");
    transcriptRef.current = "";
    previewRef.current = "";
    setPendingChunks(0);
    setElapsedMs(0);
    setBars(Array(22).fill(0.08));

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setSpeechError("Este navegador no permite grabar audio. Usa Chrome o una frase de demo.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      const mimeType = pickRecorderMime();
      const whisperOn =
        sttReady !== false && typeof MediaRecorder !== "undefined";
      const session: Session = {
        stream,
        mimeType,
        recorder: null,
        stopRequested: false,
        interruptSlice: null,
        loop: whisperOn,
        seq: 0,
        parts: [],
        pending: 0,
        webSpeech: "",
        recognition: null,
        audioContext: null,
        raf: 0,
      };
      sessionRef.current = session;
      startedAtRef.current = Date.now();
      setListening(true);
      startMeter(session);
      startWebSpeech(session);

      if (!whisperOn) {
        if (!getRecognition()) {
          setSpeechError(
            "No hay Whisper ni transcripción del navegador. Usa una frase de demo.",
          );
          session.stopRequested = true;
          setListening(false);
          teardown(session);
          sessionRef.current = null;
        }
        return;
      }

      setTranscribing(true);
      void (async () => {
        try {
          while (!session.stopRequested) {
            const blob = await recordSlice(session, CHUNK_MS);
            if (blob.size < MIN_AUDIO_BYTES) {
              if (session.stopRequested) break;
              await sleep(60);
              continue;
            }
            const seq = session.seq;
            session.seq += 1;
            session.pending += 1;
            setPendingChunks((count) => count + 1);
            const previous = joinTranscriptParts(session.parts);
            void postChunk(blob, previous)
              .then((text) => {
                if (!text) return;
                session.parts[seq] = text;
                applyParts(session.parts);
              })
              .catch((error: unknown) => {
                const code = error instanceof Error ? error.message : "";
                if (code === "stt_unconfigured") {
                  setSttReady(false);
                  setSpeechError(
                    "Whisper no está configurado. Se muestra la vista previa del navegador.",
                  );
                  return;
                }
                if (!joinTranscriptParts(session.parts) && !previewRef.current) {
                  setSpeechError(
                    error instanceof Error
                      ? error.message
                      : "Whisper no respondió. Revisa la clave STT o usa una frase de demo.",
                  );
                }
              })
              .finally(() => {
                session.pending -= 1;
                setPendingChunks((count) => Math.max(0, count - 1));
              });
          }
          while (session.pending > 0) await sleep(80);
          if (!transcriptRef.current && previewRef.current) {
            setTranscript(previewRef.current);
          }
        } catch {
          setSpeechError(
            "No se pudo grabar el audio. Permite el micrófono o usa una frase de demo.",
          );
        } finally {
          teardown(session);
          if (sessionRef.current === session) sessionRef.current = null;
          setListening(false);
          setTranscribing(false);
          setLivePreview("");
        }
      })();
    } catch {
      setListening(false);
      const Ctor = getRecognition();
      if (Ctor) {
        setSpeechError(
          "No se pudo acceder al micrófono. Se intenta vista previa del navegador, o usa una demo.",
        );
        const session: Session = {
          stream: new MediaStream(),
          mimeType: "",
          recorder: null,
          stopRequested: false,
          interruptSlice: null,
          loop: false,
          seq: 0,
          parts: [],
          pending: 0,
          webSpeech: "",
          recognition: null,
          audioContext: null,
          raf: 0,
        };
        sessionRef.current = session;
        startedAtRef.current = Date.now();
        setListening(true);
        startWebSpeech(session);
        return;
      }
      setSpeechError(
        "No se pudo acceder al micrófono. Permite el audio o usa una frase de demo.",
      );
    }
  }, [applyParts, startMeter, startWebSpeech, sttReady, teardown]);

  const stopListening = useCallback(() => {
    const session = sessionRef.current;
    if (!session) {
      setListening(false);
      return;
    }
    session.stopRequested = true;
    session.interruptSlice?.();
    try {
      session.recognition?.stop();
    } catch {
      /* ignore */
    }
    if (!transcriptRef.current && previewRef.current) {
      setTranscript(previewRef.current);
    }
    setListening(false);
    if (!session.loop) {
      teardown(session);
      sessionRef.current = null;
      setLivePreview("");
    }
  }, [teardown]);

  const reset = useCallback(() => {
    stopListening();
    setTranscript("");
    setLivePreview("");
    setSpeechError(null);
    setPendingChunks(0);
    setElapsedMs(0);
    setBars(Array(22).fill(0.08));
  }, [stopListening]);

  return {
    transcript,
    setTranscript,
    livePreview,
    listening,
    transcribing,
    pendingChunks,
    elapsedMs,
    level,
    bars,
    speechError,
    sttReady,
    sttModel,
    startListening,
    stopListening,
    reset,
  };
}
