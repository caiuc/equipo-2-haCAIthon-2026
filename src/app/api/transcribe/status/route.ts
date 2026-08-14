import { corsJson, corsOptions } from "@/lib/ai/cors";
import { getSttStatus } from "@/lib/ai/transcribe";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  return corsJson(getSttStatus());
}
