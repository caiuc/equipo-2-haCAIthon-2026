"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, FileAudio2, Map } from "lucide-react";
import { SirenaLogo } from "@/components/brand/SirenaLogo";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--paper)_94%,transparent)] shadow-[0_1px_0_rgba(15,27,45,0.02)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <SirenaLogo size="sm" />
            <span>
              <span className="block font-mono text-sm font-bold tracking-[0.15em] text-[var(--ink)]">
                SIRENA
              </span>
              <span className="block text-[11px] text-[var(--muted)]">
                Continuidad Vital
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm" aria-label="Navegación principal">
            <NavLink href="/registro" active={pathname.startsWith("/registro")} icon={<FileAudio2 />}>
              Registro
            </NavLink>
            <NavLink href="/hospital" active={pathname.startsWith("/hospital")} icon={<Building2 />}>
              Hospital
            </NavLink>
            <NavLink href="/red" active={pathname.startsWith("/red")} icon={<Map />}>
              Red UGCC
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-center text-[11px] text-[var(--muted)]">
        SIRENA · Continuidad Vital · audio no almacenado · entorno con datos sintéticos
      </footer>
    </div>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:px-3 ${
        active
          ? "bg-[var(--blue-soft)] text-[var(--blue)]"
          : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
      }`}
    >
      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}
