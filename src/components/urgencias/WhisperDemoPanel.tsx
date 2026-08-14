"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";

export interface WhisperStatus {
  available: boolean;
  provider: string | null;
  model: string | null;
}

export function WhisperDemoPanel({
  whisperEnabled,
  onToggleWhisper,
  onRunDemo,
  highlight,
}: {
  whisperEnabled: boolean;
  onToggleWhisper: (next: boolean) => void;
  onRunDemo: () => void;
  highlight: boolean;
}) {
  const [status, setStatus] = useState<WhisperStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/transcribe/status")
      .then((response) => response.json())
      .then((data: WhisperStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ available: false, provider: null, model: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <details
      open
      className={`rounded-xl border px-4 py-3 text-sm ${
        highlight
          ? "border-teal-500 bg-[color-mix(in_oklab,var(--teal)_10%,transparent)] ring-2 ring-teal-400/50"
          : "border-[var(--line)] bg-[var(--panel)]"
      }`}
    >
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Demo Whisper · ficha de urgencias
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant={whisperEnabled ? "primary" : "quiet"}
          onClick={() => onToggleWhisper(!whisperEnabled)}
        >
          {whisperEnabled ? "Whisper activo" : "Activar Whisper"}
        </Button>
        <Button variant="quiet" onClick={onRunDemo}>
          Ejecutar demo guiada
        </Button>
        {status?.available ? (
          <Badge tone="ok">Whisper listo · {status.model}</Badge>
        ) : (
          <Badge tone="warn">Sin clave STT</Badge>
        )}
      </div>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed">
        <li>Pulsa Activar Whisper. El badge confirma si hay API key.</li>
        <li>
          Graba: “Ingreso cama 5, paciente crítico, dolor torácico”.
        </li>
        <li>Revisa la ficha, confirma y abre Análisis: la cama 5 aparece ocupada.</li>
      </ol>
      {!status?.available ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Sin <code className="font-mono">APIFY_STT_API_KEY</code> la demo guiada
          precarga la frase. Con clave, graba de verdad.
        </p>
      ) : null}
    </details>
  );
}
