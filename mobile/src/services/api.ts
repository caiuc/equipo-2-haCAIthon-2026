import type { ClinicalStructure } from "@shared/clinical";
import { parseClinicalText } from "@shared/clinicalParser";
import { apiBase } from "./supabase";

export async function structureTranscript(
  transcript: string,
): Promise<ClinicalStructure> {
  const local = parseClinicalText(transcript);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${apiBase()}/api/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return local;
    return (await response.json()) as ClinicalStructure;
  } catch {
    return local;
  }
}
