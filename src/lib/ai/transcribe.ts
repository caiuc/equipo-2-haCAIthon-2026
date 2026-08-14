export type SttStatus = {
  available: boolean;
  provider: string | null;
  model: string | null;
};

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

export async function transcribeAudioFile(file: File): Promise<string> {
  const apiKey = process.env.APIFY_STT_API_KEY;
  const baseUrl = (
    process.env.APIFY_STT_BASE_URL ?? "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const model = process.env.APIFY_STT_MODEL ?? "whisper-large-v3-turbo";

  if (!apiKey) {
    throw new Error("stt_unconfigured");
  }

  const maxBytes = Number(process.env.APIFY_STT_MAX_UPLOAD_BYTES ?? 25_000_000);
  if (file.size > maxBytes) {
    throw new Error("too_large");
  }

  const payload = new FormData();
  payload.append("file", file, file.name || "reporte.webm");
  payload.append("model", model);
  payload.append("language", "es");
  payload.append("response_format", "json");

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: payload,
  });

  if (!response.ok) {
    throw new Error("stt_failed");
  }

  const data = (await response.json()) as { text?: string };
  return data.text ?? "";
}
