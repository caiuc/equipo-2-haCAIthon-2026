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

export type Criticality = "high" | "medium" | "low";
export type BedActionKind = "occupy" | "vacate";

export interface IcuExtraction {
  certainty: IcuCertainty;
  confidence: number | null;
}

export interface BedAction {
  kind: BedKind;
  action: BedActionKind;
  label: string;
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
  clinical_summary: string | null;
  analysis: string | null;
  criticality: Criticality;
  vital_risk: boolean | null;
  bed_actions: BedAction[];
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

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const CRITICAL_EVENT_KINDS = new Set<EventKind>([
  "POSSIBLE_ICU_REQUIREMENT",
  "ICU_CONFIRMED",
  "UTI_REQUIRED",
  "ISOLATION_REQUIRED",
]);

export function bedActionLabel(
  action: BedActionKind,
  kind: BedKind,
): string {
  const bed = BED_LABEL[kind];
  return action === "occupy" ? `Ocupa demanda ${bed}` : `Libera cama ${bed}`;
}

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
    clinical_summary: null,
    analysis: null,
    criticality: "low",
    vital_risk: null,
    bed_actions: [],
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

export function deriveBedActions(structure: ClinicalStructure): BedAction[] {
  const events = new Set(structure.events);
  const vacate =
    structure.discharge_ordered ||
    events.has("DISCHARGE_ORDERED") ||
    events.has("PATIENT_DISCHARGED") ||
    events.has("BED_AVAILABLE");

  if (vacate) {
    let kind: BedKind = "basica";
    if (events.has("ICU_CONFIRMED") || structure.icu.certainty === "confirmed") {
      kind = "uci";
    } else if (events.has("UTI_REQUIRED") || structure.uti_required) {
      kind = "uti";
    }
    return [{ kind, action: "vacate", label: bedActionLabel("vacate", kind) }];
  }

  const actions: BedAction[] = [];
  const deltas = demandIncrements(structure);
  for (const kind of ["uci", "uti", "basica"] as BedKind[]) {
    if (!deltas[kind]) continue;
    actions.push({
      kind,
      action: "occupy",
      label: bedActionLabel("occupy", kind),
    });
  }
  return actions;
}

export function deriveCriticality(structure: ClinicalStructure): Criticality {
  if (structure.vital_risk === true || structure.icu.certainty === "confirmed") {
    return "high";
  }
  if (
    structure.icu.certainty === "possible" ||
    structure.icu.certainty === "conditional" ||
    structure.uti_required ||
    structure.isolation_required
  ) {
    return "medium";
  }
  return "low";
}

export function enrichStructure(structure: ClinicalStructure): ClinicalStructure {
  const next: ClinicalStructure = {
    ...structure,
    clinical_summary:
      structure.clinical_summary?.trim() ||
      structure.relevant_condition ||
      null,
    analysis: structure.analysis?.trim() ? structure.analysis.trim() : null,
  };
  next.bed_actions = deriveBedActions(next);
  next.criticality = deriveCriticality(next);
  return next;
}

export function eventsFromFlags(structure: ClinicalStructure): EventKind[] {
  const events: EventKind[] = [];
  if (structure.requires_hospitalization) events.push("REQUIRES_HOSPITALIZATION");
  if (
    structure.icu.certainty === "possible" ||
    structure.icu.certainty === "conditional"
  ) {
    events.push("POSSIBLE_ICU_REQUIREMENT");
  }
  if (structure.icu.certainty === "confirmed") events.push("ICU_CONFIRMED");
  if (structure.uti_required) events.push("UTI_REQUIRED");
  if (structure.basic_bed_required) events.push("BASIC_BED_REQUIRED");
  if (structure.isolation_required) events.push("ISOLATION_REQUIRED");
  if (structure.discharge_ordered) events.push("DISCHARGE_ORDERED");
  for (const extra of [
    "PATIENT_DISCHARGED",
    "BED_CLEANING",
    "BED_AVAILABLE",
    "TRANSFER_SUGGESTED",
  ] as EventKind[]) {
    if (structure.events.includes(extra) && !events.includes(extra)) {
      events.push(extra);
    }
  }
  return events;
}

export function patchStructure(
  current: ClinicalStructure,
  patch: Partial<ClinicalStructure>,
): ClinicalStructure {
  const next: ClinicalStructure = {
    ...current,
    ...patch,
    icu: patch.icu ? { ...current.icu, ...patch.icu } : current.icu,
  };
  next.events = eventsFromFlags(next);
  return enrichStructure(next);
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
