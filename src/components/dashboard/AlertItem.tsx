"use client";

import { pulseAlert } from "@/lib/animations/transitions";
import { formatHours } from "@/lib/labels";
import { useMockStore } from "@/lib/mock/mockStore";
import { BACKUP_CRITICAL_HOURS } from "@/lib/engine/continuity";
import { useEffect, useRef } from "react";

export function AlertItem({
  id,
  message,
  severity,
  code,
  backupHours,
}: {
  id: string;
  message: string;
  severity: "WATCH" | "CRITICAL";
  code?: string;
  backupHours?: number | null;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const pulse = severity === "CRITICAL" || (backupHours ?? 99) <= BACKUP_CRITICAL_HOURS;

  useEffect(() => {
    if (!pulse || !ref.current) return;
    const animation = pulseAlert(ref.current);
    return () => animation.pause();
  }, [pulse, id]);

  return (
    <li
      ref={ref}
      className={`rounded-lg border px-3 py-2 ${
        severity === "CRITICAL"
          ? "border-red-400/40 bg-red-500/10"
          : "border-amber-400/25 bg-amber-400/8"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-semibold tracking-wide">
          {code ?? "OPERACIÓN"}
        </p>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          {severity === "CRITICAL" ? "Crítica" : "Vigilancia"}
        </span>
      </div>
      <p className="mt-1 text-sm leading-snug text-[var(--text)]">{message}</p>
      {backupHours !== null && backupHours !== undefined ? (
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Autonomía: {formatHours(backupHours)}
        </p>
      ) : null}
    </li>
  );
}

export function AlertList() {
  const { alerts, patients } = useMockStore();
  const visible = alerts.slice(0, 5);

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--line)] px-3 py-4 text-sm text-[var(--muted)]">
        Sin alertas operacionales abiertas.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((alert) => {
        const patient = patients.find((item) => item.id === alert.patientNeedId);
        return (
          <AlertItem
            key={alert.id}
            id={alert.id}
            message={alert.message}
            severity={alert.severity}
            code={patient?.anonymousCode}
            backupHours={patient?.backupHoursRemaining}
          />
        );
      })}
    </ul>
  );
}
