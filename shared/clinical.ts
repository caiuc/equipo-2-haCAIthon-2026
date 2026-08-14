export type BedKind = "uci" | "uti" | "basica";
export type VoiceStatus = "pending" | "validated" | "edited" | "discarded";
export type EventConfirmation = "proposed" | "confirmed" | "rejected";
export type IcuCertainty =
  | "confirmed"
  | "possible"
  | "not_required"
  | "conditional";

export type EventKind =
  | "REQUIRES_HOSPITALIZATION"
  | "POSSIBLE_ICU_REQUIREMENT"
  | "ICU_CONFIRMED"
  | "UTI_REQUIRED"
  | "BASIC_BED_REQUIRED"
  | "ISOLATION_REQUIRED"
  | "DISCHARGE_ORDERED"
  | "PATIENT_DISCHARGED"
  | "BED_CLEANING"
  | "BED_AVAILABLE"
  | "TRANSFER_SUGGESTED";

export const DEMO_HOSPITAL_ID = "blt";
export const DEMO_PROFESSIONAL_ID = "c1a1e000-0000-4000-8000-000000000001";

export const DEMO_HOSPITALIZATION_PHRASE =
  "Paciente masculino de 72 años con insuficiencia respiratoria. Se indica hospitalización y requerimiento de UCI.";

export const DEMO_UNCERTAINTY_PHRASE =
  "Probablemente requiera UCI si empeora.";

export const DEMO_ISOLATION_PHRASE =
  "Paciente masculino de 72 años, insuficiencia respiratoria, se indica hospitalización. Posible requerimiento UCI. Actualmente estable. Requiere aislamiento.";

export interface IcuExtraction {
  certainty: IcuCertainty;
  confidence: number | null;
}

export interface ClinicalStructure {
  patient_code_hint: string | null;
  sex: "M" | "F" | null;
  age_years: number | null;
  requires_hospitalization: boolean | null;
  icu: IcuExtraction;
  uti_required: boolean | null;
  basic_bed_required: boolean | null;
  isolation_required: boolean | null;
  relevant_condition: string | null;
  discharge_ordered: boolean;
  events: EventKind[];
  confidence: "pending_verification";
  transcript: string;
  source: "deepseek" | "regex";
}

export const EVENT_LABEL: Record<EventKind, string> = {
  REQUIRES_HOSPITALIZATION: "Hospitalización requerida",
  POSSIBLE_ICU_REQUIREMENT: "Posible requerimiento UCI",
  ICU_CONFIRMED: "UCI confirmada",
  UTI_REQUIRED: "UTI requerida",
  BASIC_BED_REQUIRED: "Cama básica",
  ISOLATION_REQUIRED: "Requiere aislamiento",
  DISCHARGE_ORDERED: "Alta médica",
  PATIENT_DISCHARGED: "Paciente egresado",
  BED_CLEANING: "Cama en aseo",
  BED_AVAILABLE: "Cama habilitada",
  TRANSFER_SUGGESTED: "Derivación sugerida",
};

export const BED_LABEL: Record<BedKind, string> = {
  uci: "UCI",
  uti: "UTI",
  basica: "Básicas",
};

export function emptyStructure(transcript: string): ClinicalStructure {
  return {
    patient_code_hint: null,
    sex: null,
    age_years: null,
    requires_hospitalization: null,
    icu: { certainty: "not_required", confidence: null },
    uti_required: null,
    basic_bed_required: null,
    isolation_required: null,
    relevant_condition: null,
    discharge_ordered: false,
    events: [],
    confidence: "pending_verification",
    transcript,
    source: "regex",
  };
}

export function countsAsIcuDemand(certainty: IcuCertainty): boolean {
  return certainty === "confirmed";
}

export function demandIncrements(
  structure: ClinicalStructure,
): Partial<Record<BedKind, number>> {
  const delta: Partial<Record<BedKind, number>> = {};
  if (structure.icu.certainty === "confirmed") {
    delta.uci = 1;
  }
  if (structure.uti_required) {
    delta.uti = 1;
  }
  if (
    structure.basic_bed_required ||
    (structure.requires_hospitalization &&
      structure.icu.certainty !== "confirmed" &&
      !structure.uti_required)
  ) {
    delta.basica = 1;
  }
  return delta;
}

export function hospitalBalance(effective: number, demand: number): number {
  return effective - demand;
}

export function balanceTone(
  balance: number,
): "deficit" | "even" | "surplus" {
  if (balance < 0) return "deficit";
  if (balance > 0) return "surplus";
  return "even";
}
