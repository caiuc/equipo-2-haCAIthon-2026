export type SpeechResultLike = {
  isFinal: boolean;
  transcript: string;
};

export function joinTranscript(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeSpeechResults(
  prefix: string,
  results: SpeechResultLike[],
) {
  const finals: string[] = [];
  const interim: string[] = [];

  for (const result of results) {
    const text = result.transcript.trim();
    if (!text) continue;
    if (result.isFinal) finals.push(text);
    else interim.push(text);
  }

  return {
    finalTranscript: joinTranscript(prefix, ...finals),
    interimTranscript: joinTranscript(...interim),
  };
}
