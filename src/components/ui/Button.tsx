import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "warn" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 border-teal-800/30",
  ghost:
    "bg-transparent text-[var(--text)] hover:bg-black/5 border-[var(--line)]",
  danger:
    "bg-red-600 text-white hover:bg-red-500 border-red-500/30",
  warn:
    "bg-amber-400 text-slate-950 hover:bg-amber-300 border-amber-300/40",
  quiet:
    "bg-[var(--input)] text-[var(--text)] hover:bg-black/5 border-[var(--line)]",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tracking-tight transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
