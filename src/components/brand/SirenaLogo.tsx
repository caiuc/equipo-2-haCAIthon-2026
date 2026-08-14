import type { SVGProps } from "react";

export function SirenaLogo({
  size = 32,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 150 150"
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <rect x="5" y="5" width="140" height="140" rx="34" fill="#1D4ED8" />
      <path
        d="M28 75h20l12-28 14 42 10-22 8 8h6"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="108" y="64" width="22" height="22" rx="3" fill="#6EE7B7" />
    </svg>
  );
}

export function SirenaMark({
  size = 32,
  subtitle = "De la voz clínica a la red",
}: {
  size?: number;
  subtitle?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <SirenaLogo size={size} />
      <span>
        <span className="block text-sm font-semibold tracking-[0.18em]">SIRENA</span>
        {subtitle ? (
          <span className="block text-[11px] text-[var(--muted)]">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
