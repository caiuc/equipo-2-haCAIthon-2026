import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.APIFY_STT_API_KEY;
  const model = process.env.APIFY_STT_MODEL ?? "whisper-large-v3-turbo";
  const baseUrl = process.env.APIFY_STT_BASE_URL ?? "https://api.groq.com/openai/v1";
  const provider = /groq/.test(baseUrl)
    ? "groq"
    : process.env.APIFY_STT_PROVIDER || "whisper";

  return NextResponse.json({
    available: Boolean(apiKey),
    provider: apiKey ? provider : null,
    model: apiKey ? model : null,
  });
}
