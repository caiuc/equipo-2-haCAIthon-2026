import { ManualForms } from "@/components/voice/ManualForms";
import { VoiceIntake } from "@/components/voice/VoiceIntake";

export default function ReportePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 lg:px-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
          Ingreso y reporte
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Reportes de terreno
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Voz o formulario. Nada entra al estado operacional sin verificación
          humana. No se registran diagnósticos ni historia clínica.
        </p>
      </header>
      <aside className="rounded-xl border border-teal-700/20 bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-900">
        Zona del equipo de voz: Whisper transcribe y DeepSeek debe devolver el
        JSON de <code className="font-mono text-xs">StructuredUpdate</code>{" "}
        (ver <code className="font-mono text-xs">design.md</code>). Trabaja aquí
        y en <code className="font-mono text-xs">src/components/voice/</code>{" "}
        para no chocar con landing ni con el mapa.
      </aside>
      <VoiceIntake />
      <ManualForms />
    </div>
  );
}
