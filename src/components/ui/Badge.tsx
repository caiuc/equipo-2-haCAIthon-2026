import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "critical";

const tones: Record<Tone, string> = {
  ok: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  warn: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  bad: "bg-red-500/15 text-red-300 border-red-400/30",
  info: "bg-teal-400/15 text-teal-200 border-teal-400/30",
  neutral: "bg-white/8 text-slate-300 border-white/12",
  critical: "bg-red-500/25 text-red-100 border-red-400/50",
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
  status: "PROPOSED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED",
) {
  if (status === "PROPOSED") return "warn" as const;
  if (status === "APPROVED" || status === "IN_PROGRESS") return "info" as const;
  return "ok" as const;
}
