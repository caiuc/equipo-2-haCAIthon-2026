import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "warn" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-teal-400 text-slate-950 hover:bg-teal-300 border-teal-300/40",
  ghost:
    "bg-transparent text-slate-100 hover:bg-white/5 border-white/10",
  danger:
    "bg-red-500 text-white hover:bg-red-400 border-red-400/30",
  warn:
    "bg-amber-400 text-slate-950 hover:bg-amber-300 border-amber-300/40",
  quiet:
    "bg-white/5 text-slate-100 hover:bg-white/10 border-white/10",
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
