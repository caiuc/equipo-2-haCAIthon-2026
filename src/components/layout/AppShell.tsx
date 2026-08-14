"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--paper)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue)] font-mono text-xs font-bold text-white">
              CV
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                Continuidad Vital
              </span>
              <span className="block text-[11px] text-[var(--muted)]">
                Gestión de red · datos sintéticos
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/registro" active={pathname.startsWith("/registro")}>
              Registro
            </NavLink>
            <NavLink href="/hospital" active={pathname.startsWith("/hospital")}>
              Hospital
            </NavLink>
            <NavLink href="/red" active={pathname.startsWith("/red")}>
              Red UGCC
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--line)] px-4 py-3 text-center text-[11px] text-[var(--muted)]">
        Prototipo HaCAiThon · audio no almacenado · no conecta MINSAL ni fichas clínicas
      </footer>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 font-medium ${
        active
          ? "bg-[var(--blue-soft)] text-[var(--blue)]"
          : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </Link>
  );
}
