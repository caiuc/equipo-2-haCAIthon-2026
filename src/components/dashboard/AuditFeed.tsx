"use client";

import { formatClock } from "@/lib/labels";
import { useMockStore } from "@/lib/mock/mockStore";

const kindLabel = {
  INTAKE: "Ingreso",
  SIMULATION: "Simulación",
  APPROVAL: "Aprobación",
  ALERT: "Alerta",
  UPDATE: "Sistema",
  RESET: "Reinicio",
} as const;

export function AuditFeed() {
  const { audit } = useMockStore();
  const recent = audit.slice(0, 8);

  return (
    <section className="rounded-xl border border-white/10 bg-[var(--panel)]">
      <header className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Qué cambió en los últimos minutos</h2>
      </header>
      <ol className="max-h-56 space-y-0 overflow-auto p-2">
        {recent.map((event) => (
          <li
            key={event.id}
            className="flex gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/4"
          >
            <time className="w-12 shrink-0 font-mono text-[11px] text-[var(--muted)]">
              {formatClock(event.at)}
            </time>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                {kindLabel[event.kind]}
              </p>
              <p className="text-[13px] leading-snug">{event.message}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
