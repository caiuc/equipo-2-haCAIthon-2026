import { extensionFor } from "@/lib/audio/format";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export const MIN_AUDIO_BYTES = 1200;

export function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function audioFileFromBlob(blob: Blob, basename = "reporte"): File {
  const rawType = blob.type || "audio/webm";
  const type = rawType.split(";")[0] || "audio/webm";
  const name = `${basename}.${extensionFor(type)}`;
  return new File([blob], name, { type });
}

export function createRecorder(stream: MediaStream, mimeType: string): MediaRecorder {
  if (mimeType) {
    try {
      return new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 });
    } catch {
      try {
        return new MediaRecorder(stream, { mimeType });
      } catch {
        /* fall through */
      }
    }
  }
  return new MediaRecorder(stream);
}
