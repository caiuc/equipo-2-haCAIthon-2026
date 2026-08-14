import { UrgenciasWorkspace } from "@/components/urgencias/UrgenciasWorkspace";

export default function UrgenciasPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 lg:px-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
          Urgencias
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Ficha de ingreso por voz
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          El médico dicta ocupación y estado del paciente. Nada se persiste sin
          confirmación. Las 8 camas se envían al tablero de Análisis.
        </p>
      </header>
      <UrgenciasWorkspace />
    </div>
  );
}
