"use client";

export function DemoScript() {
  return (
    <details className="rounded-xl border border-teal-400/20 bg-teal-400/5 px-4 py-3 text-sm">
      <summary className="cursor-pointer font-semibold text-teal-200">
        Guion de demostración (4 minutos)
      </summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-[var(--text)]">
        <li>Muestra la cola: E-008 ya pide generador; todavía no hay responsable de diálisis extra.</li>
        <li>Pulsa “Simular caída de agua en Centro Norte” (o reporta por voz en Ingreso).</li>
        <li>El motor alerta casos próximos a interrupción sin alternativa (D-014 y vecinos).</li>
        <li>Matching propone Clínica B y Centro Sur. Aprueba derivaciones.</li>
        <li>Aprueba el generador de E-008. El tablero deja responsables y pendientes a la vista.</li>
      </ol>
      <p className="mt-3 text-[13px] italic text-teal-100/90">
        “En una catástrofe, conocer el daño no basta. Continuidad Vital transforma
        una interrupción en una acción asignada antes de que el paciente pierda su
        tratamiento.”
      </p>
    </details>
  );
}
