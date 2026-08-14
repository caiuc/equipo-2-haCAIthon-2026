let transcript = "";
let structured: import("@shared/clinical").ClinicalStructure | null = null;

export function setDraftTranscript(value: string) {
  transcript = value;
}

export function getDraftTranscript() {
  return transcript;
}

export function setDraftStructure(
  value: import("@shared/clinical").ClinicalStructure | null,
) {
  structured = value;
}

export function getDraftStructure() {
  return structured;
}
