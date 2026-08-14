import {
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
  return result;
}
