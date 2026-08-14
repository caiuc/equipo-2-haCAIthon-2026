import {
  CRITICAL_EVENT_KINDS,
  CRITICALITY_LABEL,
  emptyStructure,
  enrichStructure,
  EVENT_LABEL,
  type BedAction,
  type ClinicalStructure,
  type Criticality,
  type EventKind,
  type IcuCertainty,
} from "./clinical";
import type { ClinicalEvent, VoiceRecord } from "./database.types";

export type RecordEventView = {
  kind: EventKind;
  label: string;
  critical: boolean;
};

export type RecordDetailView = {
  id: string;
  status: string;
  createdAt: string | null;
  transcript: string;
  hasSnapshot: boolean;
  structure: ClinicalStructure;
  bedActions: BedAction[];
  events: RecordEventView[];
  criticalEvents: RecordEventView[];
  form: {
    name: string | null;
    patient: string;
    sex: string;
    age: string;
    summary: string | null;
    vitalRisk: string;
    criticality: string;
    criticalityKey: Criticality;
    analysis: string | null;
    source: string;
    confidence: number | null;
    condition: string | null;
  };
};

const EVENT_KINDS = new Set<EventKind>(Object.keys(EVENT_LABEL) as EventKind[]);
const ICU: IcuCertainty[] = [
  "confirmed",
  "possible",
  "not_required",
  "conditional",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asEventKind(value: unknown): EventKind | null {
  return typeof value === "string" && EVENT_KINDS.has(value as EventKind)
    ? (value as EventKind)
    : null;
}

function snapshotFromUnknown(
  raw: unknown,
  transcript: string,
): ClinicalStructure | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.form)) {
    const nested = snapshotFromJson(raw.form, transcript);
    if (nested) return nested;
  }
  return snapshotFromJson(raw, transcript);
}

function snapshotFromJson(
  raw: unknown,
  transcript: string,
): ClinicalStructure | null {
  if (!isRecord(raw)) return null;
  if (
    !("events" in raw) &&
    !("icu" in raw) &&
    !("transcript" in raw) &&
    !("clinical_summary" in raw)
  ) {
    return null;
  }
  const fallback = emptyStructure(transcript);
  const icuRaw = isRecord(raw.icu) ? raw.icu : {};
  const events = Array.isArray(raw.events)
    ? raw.events
        .map(asEventKind)
        .filter((item): item is EventKind => Boolean(item))
    : fallback.events;
  const certainty =
    typeof icuRaw.certainty === "string" &&
    ICU.includes(icuRaw.certainty as IcuCertainty)
      ? (icuRaw.certainty as IcuCertainty)
      : fallback.icu.certainty;

  return enrichStructure({
    ...fallback,
    patient_code_hint:
      typeof raw.patient_code_hint === "string" ? raw.patient_code_hint : null,
    patient_name:
      typeof raw.patient_name === "string" && raw.patient_name.trim()
        ? raw.patient_name.trim()
        : null,
    sex: raw.sex === "M" || raw.sex === "F" ? raw.sex : null,
    age_years: typeof raw.age_years === "number" ? raw.age_years : null,
    requires_hospitalization:
      typeof raw.requires_hospitalization === "boolean"
        ? raw.requires_hospitalization
        : null,
    icu: {
      certainty,
      confidence:
        typeof icuRaw.confidence === "number" ? icuRaw.confidence : null,
    },
    uti_required: typeof raw.uti_required === "boolean" ? raw.uti_required : null,
    basic_bed_required:
      typeof raw.basic_bed_required === "boolean"
        ? raw.basic_bed_required
        : null,
    isolation_required:
      typeof raw.isolation_required === "boolean"
        ? raw.isolation_required
        : null,
    relevant_condition:
      typeof raw.relevant_condition === "string"
        ? raw.relevant_condition
        : null,
    clinical_summary:
      typeof raw.clinical_summary === "string" ? raw.clinical_summary : null,
    analysis: typeof raw.analysis === "string" ? raw.analysis : null,
    vital_risk: typeof raw.vital_risk === "boolean" ? raw.vital_risk : null,
    discharge_ordered: raw.discharge_ordered === true,
    events,
    transcript:
      typeof raw.transcript === "string" && raw.transcript.trim()
        ? raw.transcript
        : transcript,
    source: raw.source === "deepseek" ? "deepseek" : "regex",
  });
}

function structureFromEvents(
  transcript: string,
  events: ClinicalEvent[],
): ClinicalStructure {
  const base = emptyStructure(transcript);
  const kinds = events
    .map((item) => asEventKind(item.event_kind))
    .filter((item): item is EventKind => Boolean(item));
  const first = events[0];
  return enrichStructure({
    ...base,
    events: kinds,
    icu: {
      certainty: first?.icu_certainty ?? "not_required",
      confidence: first?.confidence ?? null,
    },
    relevant_condition: first?.relevant_condition ?? null,
    isolation_required: kinds.includes("ISOLATION_REQUIRED") ? true : null,
    uti_required: kinds.includes("UTI_REQUIRED") ? true : null,
    basic_bed_required: kinds.includes("BASIC_BED_REQUIRED") ? true : null,
    requires_hospitalization: kinds.includes("REQUIRES_HOSPITALIZATION")
      ? true
      : null,
    discharge_ordered: kinds.includes("DISCHARGE_ORDERED"),
    source: "regex",
  });
}

function sexLabel(sex: ClinicalStructure["sex"]): string {
  if (sex === "M") return "Masculino";
  if (sex === "F") return "Femenino";
  return "—";
}

function vitalLabel(value: boolean | null): string {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "No mencionado";
}

function eventViews(kinds: EventKind[]): RecordEventView[] {
  return kinds.map((kind) => ({
    kind,
    label: EVENT_LABEL[kind],
    critical: CRITICAL_EVENT_KINDS.has(kind),
  }));
}

export function buildRecordDetail(
  record: Pick<VoiceRecord, "id" | "transcript" | "status" | "created_at"> & {
    structure?: VoiceRecord["structure"];
  },
  events: ClinicalEvent[] = [],
): RecordDetailView {
  const related = events.filter((item) => item.voice_record_id === record.id);
  const fromColumn = snapshotFromUnknown(record.structure, record.transcript);
  const fromPayload = related
    .map((item) => snapshotFromUnknown(item.payload, record.transcript))
    .find((item): item is ClinicalStructure => Boolean(item));
  const fromJson = fromColumn ?? fromPayload;
  const hasSnapshot = Boolean(fromJson);
  const structure =
    fromJson ?? structureFromEvents(record.transcript, related);
  const views = eventViews(structure.events);

  return {
    id: record.id,
    status: record.status,
    createdAt: record.created_at,
    transcript: record.transcript,
    hasSnapshot,
    structure,
    bedActions: structure.bed_actions,
    events: views,
    criticalEvents: views.filter((item) => item.critical),
    form: {
      patient: structure.patient_code_hint ?? "nuevo",
      name: structure.patient_name,
      sex: sexLabel(structure.sex),
      age: structure.age_years ? `${structure.age_years} años` : "—",
      summary: structure.clinical_summary,
      vitalRisk: vitalLabel(structure.vital_risk),
      criticality: CRITICALITY_LABEL[structure.criticality],
      criticalityKey: structure.criticality,
      analysis: structure.analysis,
      source: structure.source === "deepseek" ? "DeepSeek" : "Reglas locales",
      confidence: structure.icu.confidence,
      condition: structure.relevant_condition,
    },
  };
}
