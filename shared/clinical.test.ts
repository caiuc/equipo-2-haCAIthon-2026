import { describe, expect, it } from "vitest";
import {
  demandIncrements,
  emptyStructure,
  withDerivedEvents,
} from "./clinical";

describe("clinical event normalization", () => {
  it("keeps a possible ICU requirement out of confirmed ICU demand", () => {
    const structure = withDerivedEvents({
      ...emptyStructure("Posible UCI si empeora"),
      requires_hospitalization: true,
      icu: { certainty: "possible", confidence: 0.71 },
    });
    expect(structure.events).toContain("POSSIBLE_ICU_REQUIREMENT");
    expect(structure.events).not.toContain("ICU_CONFIRMED");
    expect(demandIncrements(structure).uci).toBeUndefined();
  });

  it("recomputes events after a human edit", () => {
    const structure = withDerivedEvents({
      ...emptyStructure("Requiere UCI"),
      requires_hospitalization: true,
      icu: { certainty: "confirmed", confidence: 0.93 },
      isolation_required: true,
    });
    expect(structure.events).toEqual([
      "REQUIRES_HOSPITALIZATION",
      "ICU_CONFIRMED",
      "ISOLATION_REQUIRED",
    ]);
    expect(demandIncrements(structure).uci).toBe(1);
  });
});
