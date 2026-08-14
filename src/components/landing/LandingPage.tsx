"use client";

import { Button } from "@/components/ui/Button";
import { SirenaLogo } from "@/components/brand/SirenaLogo";
import Link from "next/link";

export function LandingPage() {
  return (
    <div className="min-h-full bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-5 lg:px-6">
        <div className="flex items-center gap-3">
          <SirenaLogo size="sm" />
          <span>
            <span className="block font-mono text-sm font-bold tracking-[0.15em]">SIRENA</span>
            <span className="block text-[11px] text-[var(--muted)]">
              Captura · valida · publica
            </span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/hospital"
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Consola
          </Link>
          <Link href="/registro">
            <Button className="text-xs">Registrar por voz</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 pb-10 pt-6 lg:grid-cols-2 lg:items-center lg:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--blue)]">
            Que el profesional atienda; que la red se actualice
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight md:text-5xl">
            Voz clínica deliberada, convertida en capacidad efectiva.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--muted)]">
            SIRENA no reemplaza a la UGCC. Transcribe en vivo lo que el
            profesional reporta, estructura los eventos operacionales y los
            publica solo después de una confirmación humana.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/registro">
              <Button>Nivel 1 · Registro</Button>
            </Link>
            <Link href="/hospital">
              <Button variant="quiet">Nivel 2 · Hospital</Button>
            </Link>
            <Link href="/red">
              <Button variant="quiet">Nivel 3 · Red UGCC</Button>
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_24px_80px_rgba(15,27,45,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--green)]">
            IA propone · humano valida
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <Row ok title="Hospitalización requerida" meta="confianza 0.96" />
            <Row
              warn
              title="Posible requerimiento UCI"
              meta="pendiente de confirmación · 0.71"
            />
            <Row ok title="Requiere aislamiento" meta="confianza 0.89" />
          </ul>
          <p className="mt-5 text-xs text-[var(--muted)]">
            El audio no se almacena. Queda la transcripción y los eventos.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1120px] gap-3 px-4 pb-16 md:grid-cols-3 lg:px-6">
        <Step n="01" title="Hablar" body="El profesional activa el micrófono. No hay escucha permanente." />
        <Step n="02" title="Estructurar" body="El navegador transcribe en vivo y Whisper consolida el resultado final." />
        <Step n="03" title="Publicar" body="Al confirmar, la consola y la vista de red se actualizan en vivo." />
      </section>
    </div>
  );
}

function Row({
  title,
  meta,
  ok,
  warn,
}: {
  title: string;
  meta: string;
  ok?: boolean;
  warn?: boolean;
}) {
  return (
    <li className="rounded-xl border border-[var(--line)] px-4 py-3">
      <p className="font-medium">
        <span className={warn ? "text-[var(--amber)]" : ok ? "text-[var(--green)]" : ""}>
          {warn ? "⚠ " : "✓ "}
        </span>
        {title}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{meta}</p>
    </li>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
      <p className="font-mono text-xs text-[var(--blue)]">{n}</p>
      <h2 className="mt-2 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
    </article>
  );
}
