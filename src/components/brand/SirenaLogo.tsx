import { Activity } from "lucide-react";

const sizes = {
  sm: {
    frame: "h-9 w-9 rounded-[11px]",
    pulse: "h-5 w-5",
    block: "right-[6px] h-2.5 w-2.5 rounded-[3px]",
  },
  md: {
    frame: "h-11 w-11 rounded-[14px]",
    pulse: "h-6 w-6",
    block: "right-[7px] h-3 w-3 rounded-[3px]",
  },
  lg: {
    frame: "h-16 w-16 rounded-[20px]",
    pulse: "h-9 w-9",
    block: "right-[10px] h-4 w-4 rounded-[4px]",
  },
} as const;

export function SirenaLogo({
  size = "md",
  className = "",
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  const styles = sizes[size];
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#2552DC] text-white shadow-[0_9px_24px_rgba(37,82,220,0.24)] ${styles.frame} ${className}`}
    >
      <Activity
        className={`${styles.pulse} -translate-x-0.5`}
        strokeWidth={3.4}
      />
      <span
        className={`absolute top-1/2 -translate-y-1/2 bg-[#64DFB4] ${styles.block}`}
      />
    </span>
  );
}
