import { extensionFor } from "@/lib/audio/format";
import { appendWhisperFields, parseWhisperText } from "@shared/stt";

export type SttStatus = {
  available: boolean;
  provider: string | null;
  model: string | null;
};

export class SttError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "SttError";
  }
}

export function getSttStatus(): SttStatus {
  const apiKey = process.env.APIFY_STT_API_KEY;
  const model = process.env.APIFY_STT_MODEL ?? "whisper-large-v3-turbo";
  const baseUrl =
    process.env.APIFY_STT_BASE_URL ?? "https://api.groq.com/openai/v1";
  const provider = /groq/.test(baseUrl)
    ? "groq"
    : process.env.APIFY_STT_PROVIDER || "whisper";

  return {
    available: Boolean(apiKey),
    provider: apiKey ? provider : null,
    model: apiKey ? model : null,
  };
}

export async function transcribeAudioFile(
  file: File,
  previousText?: string,
): Promise<string> {
  const apiKey = process.env.APIFY_STT_API_KEY;
  const baseUrl = (
    process.env.APIFY_STT_BASE_URL ?? "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const model = process.env.APIFY_STT_MODEL ?? "whisper-large-v3-turbo";

  if (!apiKey) {
    throw new SttError("stt_unconfigured", "Whisper no está configurado.");
  }

  const maxBytes = Number(process.env.APIFY_STT_MAX_UPLOAD_BYTES ?? 25_000_000);
  if (file.size > maxBytes) {
    throw new SttError("too_large", "El audio supera el tamaño máximo.");
  }
  if (file.size < 200) {
    throw new SttError("empty_audio", "El audio llegó vacío.");
  }

  const type = (file.type || "audio/webm").split(";")[0];
  const name = file.name?.includes(".")
    ? file.name
    : `reporte.${extensionFor(type, file.name)}`;
  const upload = new File([file], name, { type });

  const payload = new FormData();
  payload.append("file", upload, upload.name);
  appendWhisperFields(payload, { model, previousText });

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: payload,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const err = (await response.json()) as {
        error?: { message?: string } | string;
      };
      detail =
        typeof err.error === "string"
          ? err.error
          : err.error?.message ?? "";
    } catch {
      detail = "";
    }
    const formatHint = /format|codec|unsupported|invalid/i.test(detail)
      ? " El formato de audio no fue aceptado."
      : "";
    throw new SttError(
      "stt_failed",
      `Whisper no pudo transcribir.${formatHint}`.trim(),
    );
  }

  return parseWhisperText(await response.json());
}
