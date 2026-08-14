import { ManualForms } from "@/components/voice/ManualForms";
import { VoiceIntake } from "@/components/voice/VoiceIntake";

export default function IntakePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 lg:px-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">
          Ingreso multicanal
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Reportes de terreno
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Voz o formulario. Un parser mock estructura el texto; nada entra al
          estado operacional sin verificación humana. No se registran
          diagnósticos ni historia clínica.
        </p>
      </header>
      <VoiceIntake />
      <ManualForms />
    </div>
  );
}
