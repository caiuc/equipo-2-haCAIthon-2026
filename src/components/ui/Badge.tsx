import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

const tones: Record<Tone, string> = {
  ok: "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green)]/20",
  warn: "bg-[var(--amber-soft)] text-[var(--amber)] border-[var(--amber)]/20",
  bad: "bg-[var(--red-soft)] text-[var(--red)] border-[var(--red)]/20",
  info: "bg-[var(--blue-soft)] text-[var(--blue)] border-[var(--blue)]/20",
  neutral: "bg-[var(--wash)] text-[var(--muted)] border-[var(--line)]",
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
