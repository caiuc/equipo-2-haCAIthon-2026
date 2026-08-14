"use client";

export function DemoScript() {
  return (
    <details className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Guion de demostración
      </summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-[var(--text)]">
        <li>Simula la caída de agua en Centro Norte o repórtala en Ingreso.</li>
        <li>La cola propone derivaciones. Aprueba o rechaza: las camas del mapa cambian.</li>
        <li>Aprueba el generador de E-008. El tablero deja responsables a la vista.</li>
      </ol>
    </details>
  );
}
