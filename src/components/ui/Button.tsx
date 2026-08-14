import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "warn" | "quiet";

const styles: Record<Variant, string> = {
  primary: "bg-[var(--blue)] text-white hover:bg-[#1a44c0] border-[#1a44c0]/30",
  ghost:
    "bg-transparent text-[var(--ink)] hover:bg-black/5 border-[var(--line)]",
  danger: "bg-[var(--red)] text-white hover:bg-[#a93b2a] border-[#a93b2a]/30",
  warn: "bg-[var(--amber)] text-white hover:bg-[#9a5b0c] border-[#9a5b0c]/30",
  quiet:
    "bg-[var(--wash)] text-[var(--ink)] hover:bg-black/5 border-[var(--line)]",
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
