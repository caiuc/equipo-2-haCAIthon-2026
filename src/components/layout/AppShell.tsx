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
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[color-mix(in_oklab,var(--bg)_88%,black)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400 font-mono text-sm font-black text-slate-950">
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
            <NavLink href="/" active={pathname === "/"}>
              Centro de mando
            </NavLink>
            <NavLink href="/intake" active={pathname.startsWith("/intake")}>
              Ingreso
            </NavLink>
          </nav>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-[var(--muted)]">
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
          ? "bg-[color-mix(in_oklab,var(--text)_12%,transparent)] text-[var(--text)]"
          : "text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </Link>
  );
}
