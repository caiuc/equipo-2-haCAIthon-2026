import {
  enrichStructure,
  emptyStructure,
  type ClinicalStructure,
  type EventKind,
  type IcuCertainty,
} from "./clinical";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const CONDITIONS: Array<[RegExp, string]> = [
  [/insuficiencia respiratoria/, "insuficiencia respiratoria"],
  [/dolor toracico/, "dolor torácico"],
  [/politraumatismo/, "politraumatismo"],
  [/sepsis|choque septico/, "sepsis"],
  [/avc|accidente cerebrovascular/, "accidente cerebrovascular"],
];

export function parseClinicalText(text: string): ClinicalStructure {
  const transcript = text.trim();
  const folded = normalize(transcript);
  const result = emptyStructure(transcript);

  const code = transcript.match(/\b(PAC-?\d{3,6})\b/i);
  if (code) {
    result.patient_code_hint = code[1].toUpperCase().replace("PAC", "PAC-").replace("PAC--", "PAC-");
    if (!result.patient_code_hint.startsWith("PAC-")) {
      result.patient_code_hint = `PAC-${code[1].replace(/\D/g, "")}`;
    }
  }

  if (/femenin|mujer\b/.test(folded)) result.sex = "F";
  else if (/masculin|hombre\b/.test(folded)) result.sex = "M";

  const age = folded.match(/(\d{1,3})\s*a(?:nos|nios)?\b/) ?? folded.match(/(\d{1,3})\s*a\b/);
  if (age) result.age_years = Number(age[1]);

  const uncertain =
    /probablemente|posible|podria|si empeora|por confirmar|pendiente/.test(folded);
  const mentionsIcu = /\buci\b|\bitu\b|cuidados intensivos/.test(folded);
  const mentionsUti = /\buti\b|cuidados intermedios/.test(folded);
  const deniesIcu = /no (necesita|requiere) uci|sin requerimiento uci/.test(folded);
  const discharge = /\balta medica\b|\bse da de alta\b|\begreso\b|\balta\b/.test(folded);
  const isolation = /aislamiento/.test(folded);
  const hospitalization = /hospitaliz|se indica internacion|ingreso hospitalario/.test(
    folded,
  );
  const basicBed = /cama basica|hospitalizacion basica/.test(folded);

  let certainty: IcuCertainty = "not_required";
  let icuConfidence: number | null = null;
  if (deniesIcu) {
    certainty = "not_required";
    icuConfidence = 0.9;
  } else if (mentionsIcu && uncertain) {
    certainty = /si empeora|podria/.test(folded) ? "conditional" : "possible";
    icuConfidence = 0.71;
  } else if (mentionsIcu) {
    certainty = "confirmed";
    icuConfidence = 0.93;
  }

  result.icu = { certainty, confidence: icuConfidence };
  result.requires_hospitalization = hospitalization || mentionsIcu || mentionsUti || basicBed
    ? true
    : discharge
      ? false
      : null;
  result.uti_required = mentionsUti || null;
  result.basic_bed_required = basicBed || (hospitalization && !mentionsIcu && !mentionsUti) || null;
  result.isolation_required = isolation || null;
  result.discharge_ordered = discharge && !hospitalization;
  result.vital_risk = /riesgo vital|inestable|choque|shock|paro|critico/.test(
    folded,
  )
    ? true
    : null;

  for (const [pattern, label] of CONDITIONS) {
    if (pattern.test(folded)) {
      result.relevant_condition = label;
      break;
    }
  }

  const events: EventKind[] = [];
  if (result.requires_hospitalization) events.push("REQUIRES_HOSPITALIZATION");
  if (certainty === "possible" || certainty === "conditional") {
    events.push("POSSIBLE_ICU_REQUIREMENT");
  }
  if (certainty === "confirmed") events.push("ICU_CONFIRMED");
  if (result.uti_required) events.push("UTI_REQUIRED");
  if (result.basic_bed_required) events.push("BASIC_BED_REQUIRED");
  if (result.isolation_required) events.push("ISOLATION_REQUIRED");
  if (result.discharge_ordered) events.push("DISCHARGE_ORDERED");
  result.events = events;
  result.source = "regex";
  return enrichStructure(result);
}

export type LiveChip = {
  id: string;
  label: string;
  tone: "ok" | "warn";
};

export function detectLiveChips(text: string): LiveChip[] {
  const parsed = parseClinicalText(text);
  const chips: LiveChip[] = [];
  if (parsed.age_years) {
    chips.push({ id: "age", label: `${parsed.age_years} años`, tone: "ok" });
  }
  if (parsed.requires_hospitalization) {
    chips.push({ id: "hosp", label: "hospitalización", tone: "ok" });
  }
  if (parsed.icu.certainty === "confirmed") {
    chips.push({ id: "icu", label: "UCI", tone: "ok" });
  } else if (
    parsed.icu.certainty === "possible" ||
    parsed.icu.certainty === "conditional"
  ) {
    chips.push({ id: "icu-p", label: "UCI posible", tone: "warn" });
  }
  if (parsed.uti_required) {
    chips.push({ id: "uti", label: "UTI", tone: "ok" });
  }
  if (parsed.basic_bed_required) {
    chips.push({ id: "basica", label: "cama básica", tone: "ok" });
  }
  if (parsed.isolation_required) {
    chips.push({ id: "iso", label: "aislamiento", tone: "ok" });
  }
  if (parsed.discharge_ordered) {
    chips.push({ id: "alta", label: "alta médica", tone: "ok" });
  }
  if (parsed.relevant_condition) {
    chips.push({
      id: "cond",
      label: parsed.relevant_condition,
      tone: "ok",
    });
  }
  return chips;
}

export const BAR_COUNT = 22;

export function barsFromEnergy(energy: number, now: number): number[] {
  const amp = Math.min(1, Math.max(0.06, energy));
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const wave = 0.4 + 0.6 * Math.abs(Math.sin(now / 140 + i * 0.42));
    const jitter = 0.2 * Math.abs(Math.sin(now / 80 + i * 1.63));
    return Math.min(1, amp * (wave + jitter));
  });
}
