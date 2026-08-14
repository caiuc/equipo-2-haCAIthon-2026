import { corsJson, corsOptions } from "@/lib/ai/cors";
import { transcribeAudioFile } from "@/lib/ai/transcribe";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return corsJson({ error: "missing_file" }, { status: 400 });
    }
    const text = await transcribeAudioFile(file);
    return corsJson({ text });
  } catch (error) {
    const code = error instanceof Error ? error.message : "stt_failed";
    const status =
      code === "stt_unconfigured" ? 501 : code === "too_large" ? 413 : 502;
    return corsJson({ error: code }, { status });
  }
}
