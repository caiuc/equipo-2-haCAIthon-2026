import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.APIFY_STT_API_KEY;
  const baseUrl = (
    process.env.APIFY_STT_BASE_URL ?? "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const model = process.env.APIFY_STT_MODEL ?? "whisper-large-v3-turbo";

  if (!apiKey) {
    return NextResponse.json({ error: "stt_unconfigured" }, { status: 501 });
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const maxBytes = Number(process.env.APIFY_STT_MAX_UPLOAD_BYTES ?? 25_000_000);
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
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
    return NextResponse.json({ error: "stt_failed" }, { status: 502 });
  }

  const data = (await response.json()) as { text?: string };
  return NextResponse.json({ text: data.text ?? "" });
}
