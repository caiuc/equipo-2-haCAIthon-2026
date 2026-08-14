import { describe, expect, it } from "vitest";
import { emptyStructure, withDerivedEvents } from "./clinical";
import { toVoiceRecordStructure } from "./publish";

describe("voice_records.structure payload", () => {
  it("serializes a JSON-safe clinical form without NaN", () => {
    const structure = withDerivedEvents({
      ...emptyStructure("Paciente Juan Pérez se indica hospitalización"),
      patient_name: "Juan Pérez",
      age_years: Number("x"),
      requires_hospitalization: true,
    });
    const payload = toVoiceRecordStructure(structure) as {
      patient_name: string | null;
      age_years: number | null;
      events: string[];
      requires_hospitalization: boolean | null;
    };
    expect(payload.patient_name).toBe("Juan Pérez");
    expect(payload.age_years).toBeNull();
    expect(payload.requires_hospitalization).toBe(true);
    expect(payload.events).toContain("REQUIRES_HOSPITALIZATION");
    expect(() => JSON.stringify(payload)).not.toThrow();
  });
});
