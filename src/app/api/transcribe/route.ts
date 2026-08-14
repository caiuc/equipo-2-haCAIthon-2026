import { corsJson, corsOptions } from "@/lib/ai/cors";
import { SttError, transcribeAudioFile } from "@/lib/ai/transcribe";
import { extensionFor } from "@/lib/audio/format";

export const runtime = "nodejs";
export const maxDuration = 60;

export function OPTIONS() {
  return corsOptions();
}

function asError(error: unknown): { code: string; message: string } {
  if (error instanceof SttError) {
    return { code: error.code, message: error.message };
  }
  return { code: "stt_failed", message: "Whisper no pudo transcribir." };
}

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    const promptRaw = incoming.get("prompt");
    const previous =
      typeof promptRaw === "string" && promptRaw.trim() ? promptRaw : undefined;

    if (!(file instanceof Blob)) {
      return corsJson(
        { error: "missing_file", message: "No llegó audio al servidor." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength < 200) {
      return corsJson(
        {
          error: "empty_audio",
          message: "El audio llegó vacío. Vuelve a grabar unos segundos más.",
        },
        { status: 400 },
      );
    }

    const type = (file.type || "audio/webm").split(";")[0];
    const originalName = file instanceof File ? file.name : "reporte";
    const upload = new File([buffer], `reporte.${extensionFor(type, originalName)}`, {
      type,
    });

    const text = await transcribeAudioFile(upload, previous);
    return corsJson({ text });
  } catch (error) {
    const { code, message } = asError(error);
    const status =
      code === "stt_unconfigured" ? 501 : code === "too_large" ? 413 : 502;
    return corsJson({ error: code, message }, { status });
  }
}
