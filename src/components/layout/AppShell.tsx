"use client";

import { Button } from "@/components/ui/Button";
import { useMockStore } from "@/lib/mock/mockStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useMockStore();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--panel)_90%,transparent)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 font-mono text-sm font-black text-white">
              CV
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                Continuidad Vital
              </span>
              <span className="block text-[11px] text-[var(--muted)]">
                Coordinación sanitaria en catástrofe
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/analisis" active={pathname.startsWith("/analisis")}>
              Análisis
            </NavLink>
            <NavLink href="/reporte" active={pathname.startsWith("/reporte")}>
              Reporte
            </NavLink>
          </nav>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "light" ? "Modo oscuro" : "Modo claro"}
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--line)] px-4 py-3 text-center text-[11px] text-[var(--muted)]">
        MVP de hackathon · datos ficticios · no conecta registros clínicos, SENAPRED ni MINSAL
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
          ? "bg-[color-mix(in_oklab,var(--text)_8%,transparent)] text-[var(--text)]"
          : "text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--text)_5%,transparent)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </Link>
  );
}
