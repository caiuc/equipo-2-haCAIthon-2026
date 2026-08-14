export const SLICE_MS = 4000;

export const CLINICAL_STT_PROMPT =
  "Dictado clínico en español de Chile, urgencia. Transcribe nombres propios, edad y sexo tal como se dicen. Vocabulario: paciente, se llama, hospitalización, internación, ingreso, cama, cama básica, UCI, UTI, cuidados intensivos, cuidados intermedios, aislamiento, alta médica, insuficiencia respiratoria, requiere cama.";

export function repairClinicalTranscript(text: string): string {
  let next = text.replace(/\s+/g, " ").trim();
  const replacements: Array<[RegExp, string]> = [
    [/\b(?:u\s*[.\-]?\s*c\s*[.\-]?\s*i)\b/gi, "UCI"],
    [/\b(?:u\s*[.\-]?\s*t\s*[.\-]?\s*i)\b/gi, "UTI"],
    [/\bhuci\b/gi, "UCI"],
    [/\búci\b/gi, "UCI"],
    [/\busy\b/gi, "UCI"],
    [/\buty\b/gi, "UTI"],
    [/\butí\b/gi, "UTI"],
    [/\bospitalizaci[oó]n\b/gi, "hospitalización"],
    [/\bhospitalizacion\b/gi, "hospitalización"],
    [/\binternacion\b/gi, "internación"],
    [/\bcama b[áa]sica[s]?\b/gi, "cama básica"],
    [/\balta medica\b/gi, "alta médica"],
    [/\baislament[oa]\b/gi, "aislamiento"],
  ];
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

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
  return repairClinicalTranscript(text);
}
