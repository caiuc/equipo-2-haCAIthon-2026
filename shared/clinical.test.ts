import { describe, expect, it } from "vitest";
import { demandIncrements, emptyStructure, withDerivedEvents } from "./clinical";
import { extractPatientName, parseClinicalText } from "./clinicalParser";
import { repairClinicalTranscript } from "./stt";

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

describe("operational bed mapping", () => {
  it("defaults unspecified hospitalization to cama básica", () => {
    const structure = parseClinicalText(
      "Paciente masculino de 72 años. Se indica hospitalización.",
    );
    expect(structure.requires_hospitalization).toBe(true);
    expect(structure.basic_bed_required).toBe(true);
    expect(structure.icu.certainty).toBe("not_required");
    expect(structure.events).toContain("REQUIRES_HOSPITALIZATION");
    expect(structure.events).toContain("BASIC_BED_REQUIRED");
    expect(demandIncrements(structure).basica).toBe(1);
  });

  it("treats requiere cama as hospitalización básica", () => {
    const structure = parseClinicalText("Requiere cama para continuar hospitalización.");
    expect(structure.requires_hospitalization).toBe(true);
    expect(structure.basic_bed_required).toBe(true);
    expect(demandIncrements(structure).basica).toBe(1);
  });

  it("maps confirmed UCI without defaulting to básica", () => {
    const structure = parseClinicalText(
      "Se indica hospitalización y requerimiento de UCI.",
    );
    expect(structure.icu.certainty).toBe("confirmed");
    expect(structure.basic_bed_required).not.toBe(true);
    expect(demandIncrements(structure).uci).toBe(1);
    expect(demandIncrements(structure).basica).toBeUndefined();
  });
});

describe("patient name extraction", () => {
  it("extracts a dictated name without inventing one from sex or age", () => {
    expect(
      extractPatientName(
        "Paciente Juan Pérez masculino de 72 años se indica hospitalización",
      ),
    ).toBe("Juan Pérez");
    expect(
      extractPatientName("Paciente masculino de 72 años se indica hospitalización"),
    ).toBeNull();
  });
});

describe("clinical transcript repair", () => {
  it("normalizes spoken UCI fragments before mapping", () => {
    expect(repairClinicalTranscript("requiere u c i")).toBe("requiere UCI");
    const structure = parseClinicalText("Paciente estable, requiere u c i");
    expect(structure.icu.certainty).toBe("confirmed");
  });
});
