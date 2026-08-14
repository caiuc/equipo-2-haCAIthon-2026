"use client";

import { Button } from "@/components/ui/Button";
import { useMockStore } from "@/lib/mock/mockStore";

export function DemoControls() {
  const { scenarioActive, simulateCentroNorteWaterFailure, resetDemo } =
    useMockStore();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="warn"
        onClick={simulateCentroNorteWaterFailure}
        disabled={scenarioActive}
      >
        {scenarioActive
          ? "Escenario Centro Norte activo"
          : "Simular caída de agua en Centro Norte"}
      </Button>
      <Button variant="quiet" onClick={resetDemo}>
        Reiniciar demo
      </Button>
    </div>
  );
}
