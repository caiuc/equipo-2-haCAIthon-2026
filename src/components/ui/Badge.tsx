import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "critical";

const tones: Record<Tone, string> = {
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  bad: "bg-red-50 text-red-800 border-red-200",
  info: "bg-teal-50 text-teal-800 border-teal-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
  critical: "bg-red-100 text-red-900 border-red-300",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function operationalTone(status: "OPEN" | "PARTIAL" | "CLOSED") {
  if (status === "OPEN") return "ok" as const;
  if (status === "PARTIAL") return "warn" as const;
  return "bad" as const;
}

export function assignmentTone(
  status: "PROPOSED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED",
) {
  if (status === "PROPOSED") return "warn" as const;
  if (status === "REJECTED") return "bad" as const;
  if (status === "APPROVED" || status === "IN_PROGRESS") return "info" as const;
  return "ok" as const;
}
