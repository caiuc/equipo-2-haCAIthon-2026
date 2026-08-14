"use client";

import { ActionQueue } from "@/components/dashboard/ActionQueue";
import { AlertList } from "@/components/dashboard/AlertItem";
import { AuditFeed } from "@/components/dashboard/AuditFeed";
import { DemoControls } from "@/components/dashboard/DemoControls";
import { DemoScript } from "@/components/dashboard/DemoScript";
import { MetricsHeader } from "@/components/dashboard/MetricsHeader";
import dynamic from "next/dynamic";

const MapboxViewer = dynamic(
  () =>
    import("@/components/map/MapboxViewer").then((mod) => mod.MapboxViewer),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[320px] bg-[#071018]" />,
  },
);

export function CommandCenter() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">
            Centro de mando
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Coordinación de continuidad
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            El valor no está en el mapa: está en asignar un responsable antes de
            que se interrumpa un tratamiento crítico. Datos 100% ficticios.
          </p>
        </div>
        <DemoControls />
      </div>

      <DemoScript />

      <MetricsHeader />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="flex min-h-[420px] flex-col gap-4 xl:col-span-3">
          <ActionQueue />
          <section className="rounded-xl border border-white/10 bg-[var(--panel)] p-4">
            <h2 className="mb-3 text-sm font-semibold">Alertas operacionales</h2>
            <AlertList />
          </section>
        </div>
        <div className="flex flex-col gap-4 xl:col-span-2">
          <div className="h-[380px] overflow-hidden rounded-xl border border-white/10 xl:h-[460px]">
            <MapboxViewer />
          </div>
          <AuditFeed />
        </div>
      </div>
    </div>
  );
}
