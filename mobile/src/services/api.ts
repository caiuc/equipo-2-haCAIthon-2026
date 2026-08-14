import type { ClinicalStructure } from "@shared/clinical";
import { parseClinicalText } from "@shared/clinicalParser";
import { apiBase } from "./supabase";

function audioPart(uri: string): { uri: string; name: string; type: string } {
  const name = uri.split("/").pop() ?? "reporte.m4a";
  const lower = name.toLowerCase();
  const type = lower.endsWith(".wav")
    ? "audio/wav"
    : lower.endsWith(".3gp")
      ? "audio/3gpp"
      : lower.endsWith(".caf")
        ? "audio/x-caf"
        : "audio/m4a";
  return { uri, name, type };
}

export async function transcribeRecording(uri: string): Promise<string> {
  const body = new FormData();
  body.append("file", audioPart(uri) as unknown as Blob);
  const response = await fetch(`${apiBase()}/api/transcribe`, {
    method: "POST",
    body,
  });
  if (response.status === 501) return "";
  if (!response.ok) throw new Error("stt_failed");
  const data = (await response.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

export async function structureTranscript(
  transcript: string,
): Promise<ClinicalStructure> {
  try {
    const response = await fetch(`${apiBase()}/api/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (!response.ok) return parseClinicalText(transcript);
    return (await response.json()) as ClinicalStructure;
  } catch {
    return parseClinicalText(transcript);
  }
}
