export function extensionFor(type: string, filename = ""): string {
  const t = type.toLowerCase();
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "mp4";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("wav")) return "wav";
  if (t.includes("webm")) return "webm";
  const match = filename.toLowerCase().match(/\.(webm|mp3|mp4|m4a|ogg|wav|mpeg)$/);
  return match?.[1] === "m4a" ? "mp4" : (match?.[1] ?? "webm");
}

export { joinTranscriptParts } from "@shared/stt";
