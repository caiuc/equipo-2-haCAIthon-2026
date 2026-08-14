"use client";

import { animateMetric } from "@/lib/animations/transitions";
import { useDashboardMetrics } from "@/lib/mock/mockStore";
import { useEffect, useRef } from "react";

const cards = [
  {
    key: "openCases",
    label: "Casos abiertos",
    hint: "Continuidad aún no cerrada",
  },
  {
    key: "operationalSlots",
    label: "Cupos operativos",
    hint: "Centros con agua y acceso",
  },
  {
    key: "generatorsAvailable",
    label: "Generadores",
    hint: "Recursos municipales libres",
  },
  {
    key: "criticalAlerts",
    label: "Alertas críticas",
    hint: "Interrupción en < 2 h",
  },
] as const;

function MetricCard({
  label,
  hint,
  value,
  warn,
}: {
  label: string;
  hint: string;
  value: number;
  warn?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const animation = animateMetric(el, previous.current, value);
    previous.current = value;
    return () => animation.pause();
  }, [value]);

  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span
          ref={ref}
          className={`font-mono text-3xl font-semibold tabular-nums ${warn ? "text-red-300" : "text-[var(--text)]"}`}
        >
          {value}
        </span>
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </article>
  );
}

export function MetricsHeader() {
  const metrics = useDashboardMetrics();

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            hint={card.hint}
            value={metrics[card.key]}
            warn={card.key === "criticalAlerts" && metrics.criticalAlerts > 0}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
        <Question
          q="¿Acción próxima?"
          a={`${metrics.actionSoon} casos en ventana de 8 h`}
        />
        <Question
          q="¿Qué sigue funcionando?"
          a={`${metrics.facilitiesOpen} centros operativos`}
        />
        <Question
          q="¿Dónde hay cupos?"
          a={`${metrics.operationalSlots} cupos utilizables`}
        />
        <Question
          q="¿Sin responsable?"
          a={`${metrics.pendingActions} acciones pendientes`}
        />
        <Question
          q="¿Sin alternativa?"
          a={`${metrics.casesWithoutAlternative} casos expuestos`}
        />
      </div>
    </section>
  );
}

function Question({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--text)_4%,transparent)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {q}
      </p>
      <p className="mt-1 text-[13px] font-medium text-[var(--text)]">{a}</p>
    </div>
  );
}
