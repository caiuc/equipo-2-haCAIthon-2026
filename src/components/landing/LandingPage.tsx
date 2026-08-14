"use client";

import { BedGrid } from "@/components/map/BedGrid";
import { Button } from "@/components/ui/Button";
import { createInitialFacilities } from "@/lib/mock/data";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";

const MapPreview = dynamic(
  () => import("@/components/landing/LandingMap").then((mod) => mod.LandingMap),
  {
    ssr: false,
    loading: () => <div className="h-full bg-[var(--input)]" />,
  },
);

export function LandingPage() {
  const facilities = useMemo(() => createInitialFacilities(), []);

  return (
    <div className="min-h-full bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-5 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 font-mono text-sm font-black text-white">
            CV
          </span>
          <span>
            <span className="block text-sm font-semibold">Continuidad Vital</span>
            <span className="block text-[11px] text-[var(--muted)]">
              Coordinación sanitaria en catástrofe
            </span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/analisis"
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            Análisis
          </Link>
          <Link href="/reporte">
            <Button className="text-xs">Reportar</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 pb-8 pt-6 lg:grid-cols-2 lg:items-center lg:px-6 lg:pt-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-800">
            HaCAiThon 2026 · Salud pública
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            De la interrupción a una acción asignada.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--muted)]">
            En una catástrofe no basta con ver el daño. Continuidad Vital muestra
            quién no puede esperar, qué camas siguen libres y quién se hace cargo
            antes de que se corte un tratamiento crítico.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/analisis">
              <Button>Entrar al análisis</Button>
            </Link>
            <Link href="/reporte">
              <Button variant="quiet">Reportar en terreno</Button>
            </Link>
          </div>
        </div>
        <div className="h-[340px] overflow-hidden rounded-2xl border border-[var(--line)] shadow-[0_24px_80px_rgba(16,32,51,0.08)] md:h-[400px]">
          <MapPreview />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1200px] gap-3 px-4 pb-10 md:grid-cols-3 lg:px-6">
        <Step
          n="01"
          title="Reporte"
          body="Voz o formulario. Un operador describe el centro o el caso sin historia clínica."
        />
        <Step
          n="02"
          title="Verificación humana"
          body="La IA estructura el texto. Nada entra al tablero sin confirmación."
        />
        <Step
          n="03"
          title="Responsable"
          body="Se aprueba o rechaza. El mapa actualiza camas libres en el acto."
        />
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-16 lg:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Capacidad territorial ahora
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facilities.map((facility) => (
            <article
              key={facility.facilityId}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
            >
              <p className="text-sm font-semibold">{facility.name}</p>
              <div className="mt-3">
                <BedGrid facility={facility} compact />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-4 py-6 text-center text-[11px] text-[var(--muted)]">
        Datos ficticios de demostración · no conecta registros clínicos, SENAPRED ni MINSAL
      </footer>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="font-mono text-xs text-teal-800">{n}</p>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </article>
  );
}
