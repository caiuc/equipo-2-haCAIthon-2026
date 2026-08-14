import { corsJson, corsOptions } from "@/lib/ai/cors";
import { structureTranscript } from "@/lib/ai/structure";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "invalid_json" }, { status: 400 });
  }
  const transcript =
    body && typeof body === "object" && "transcript" in body
      ? String((body as { transcript?: unknown }).transcript ?? "")
      : "";
  if (!transcript.trim()) {
    return corsJson({ error: "missing_transcript" }, { status: 400 });
  }
  const structured = await structureTranscript(transcript);
  return corsJson(structured);
}
