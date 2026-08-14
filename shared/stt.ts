export const SLICE_MS = 4000;

export const CLINICAL_STT_PROMPT =
  "Dictado clínico en español de Chile, servicio de urgencia. Vocabulario: paciente, hospitalización, UCI, UTI, cama básica, aislamiento, alta médica, insuficiencia respiratoria.";

export function joinTranscriptParts(
  parts: Array<string | undefined>,
): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildWhisperPrompt(previousText?: string): string {
  return [CLINICAL_STT_PROMPT, previousText?.trim().slice(-240)]
    .filter(Boolean)
    .join(" ");
}

export function whisperFieldMap(input: {
  model: string;
  previousText?: string;
}): Record<string, string> {
  return {
    model: input.model,
    language: "es",
    temperature: "0",
    response_format: "json",
    prompt: buildWhisperPrompt(input.previousText),
  };
}

export function appendWhisperFields(
  body: FormData,
  input: { model: string; previousText?: string },
) {
  const fields = whisperFieldMap(input);
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }
}

export function parseWhisperText(data: unknown): string {
  const text =
    data && typeof data === "object" && "text" in data
      ? String((data as { text?: unknown }).text ?? "")
      : "";
  return text.replace(/\s+/g, " ").trim();
}
