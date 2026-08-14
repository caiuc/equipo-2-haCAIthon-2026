import { emptyStructure, enrichStructure, type ClinicalStructure } from "./clinical";
import { repairClinicalTranscript } from "./stt";

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

const NAME_STOP = new Set([
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "un",
  "una",
  "con",
  "sin",
  "por",
  "para",
  "en",
  "al",
  "se",
  "su",
  "sus",
  "paciente",
  "masculino",
  "femenino",
  "hombre",
  "mujer",
  "nino",
  "nina",
  "ano",
  "anos",
  "edad",
  "sexo",
  "hospitalizacion",
  "hospitalizado",
  "hospitalizada",
  "internacion",
  "ingreso",
  "ingresa",
  "uci",
  "uti",
  "usi",
  "cama",
  "basica",
  "basico",
  "aislamiento",
  "alta",
  "medica",
  "requiere",
  "requerimiento",
  "indica",
  "indicacion",
  "posible",
  "probablemente",
  "confirmada",
  "confirmado",
  "estable",
  "insuficiencia",
  "respiratoria",
  "dolor",
  "toracico",
  "sepsis",
  "codigo",
  "pac",
  "rut",
  "cuidados",
  "intensivos",
  "intermedios",
  "nombre",
  "llamado",
  "llamada",
  "don",
  "dona",
  "sr",
  "sra",
  "senor",
  "senora",
]);

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function extractPatientName(text: string): string | null {
  const source = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /se llama\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]+){0,4})/i,
    /nombre(?:\s+del\s+paciente)?\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]+){0,4})/i,
    /paciente(?:\s+de\s+nombre)?\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]+){0,4})/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const name = cleanName(match[1]);
    if (name) return name;
  }
  return null;
}

function cleanName(raw: string): string | null {
  const kept: string[] = [];
  for (const part of raw.split(/\s+/).filter(Boolean)) {
    const key = normalize(part);
    if (/^\d/.test(key) || key.startsWith("pac")) break;
    const particle = key === "de" || key === "del" || key === "la";
    if (NAME_STOP.has(key) && !particle) {
      if (kept.length) break;
      continue;
    }
    if (particle && kept.length === 0) continue;
    kept.push(titleCase(part));
    const meaningful = kept.filter(
      (item) => !["De", "Del", "La"].includes(item),
    ).length;
    if (meaningful >= 3) break;
  }
  while (kept.length && ["De", "Del", "La"].includes(kept[kept.length - 1])) {
    kept.pop();
  }
  if (kept.length < 1) return null;
  if (kept.every((item) => item.length < 3 && !["De", "Del", "La"].includes(item))) {
    return null;
  }
  return kept.join(" ");
}

export function parseClinicalText(text: string): ClinicalStructure {
  const transcript = repairClinicalTranscript(text);
  const folded = normalize(transcript);
  const result = emptyStructure(transcript);

  const code = transcript.match(/\b(PAC-?\d{3,6})\b/i);
  if (code) {
    result.patient_code_hint = code[1]
      .toUpperCase()
      .replace("PAC", "PAC-")
      .replace("PAC--", "PAC-");
    if (!result.patient_code_hint.startsWith("PAC-")) {
      result.patient_code_hint = `PAC-${code[1].replace(/\D/g, "")}`;
    }
  }
  result.patient_name = extractPatientName(transcript);

  if (/femenin|mujer\b/.test(folded)) result.sex = "F";
  else if (/masculin|hombre\b/.test(folded)) result.sex = "M";

  const age =
    folded.match(/(\d{1,3})\s*a(?:nos|nios)?\b/) ?? folded.match(/(\d{1,3})\s*a\b/);
  if (age) result.age_years = Number(age[1]);

  const uncertain =
    /probablemente|posible|podria|si empeora|por confirmar|pendiente/.test(
      folded,
    );
  const mentionsIcu =
    /\buci\b|\busi\b|cuidados intensivos|unidad de cuidados intensivos/.test(
      folded,
    );
  const mentionsUti = /\buti\b|cuidados intermedios/.test(folded);
  const deniesIcu = /no (necesita|requiere) uci|sin requerimiento uci/.test(
    folded,
  );
  const discharge =
    /\balta medica\b|\bse da de alta\b|\begreso\b|\balta\b/.test(folded);
  const isolation = /aislamiento/.test(folded);
  const hospitalization =
    /hospitaliz|ospitaliz|internac|internar|se interna|queda internad|ingreso hospital|se indica ingreso|requier\w* hospital|necesita hospital/.test(
      folded,
    );
  const mentionsBed = /\bcama(s)?\b/.test(folded);
  const basicBed =
    /cama basica|hospitalizacion basica|cama de hospitalizacion/.test(folded);

  let certainty: ClinicalStructure["icu"]["certainty"] = "not_required";
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
  result.requires_hospitalization =
    hospitalization || mentionsIcu || mentionsUti || basicBed || mentionsBed
      ? true
      : discharge
        ? false
        : null;
  result.uti_required = mentionsUti || null;
  result.basic_bed_required = basicBed || null;
  result.isolation_required = isolation || null;
  result.discharge_ordered = discharge && !hospitalization && !mentionsBed;
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
  if (parsed.patient_name) {
    chips.push({ id: "name", label: parsed.patient_name, tone: "ok" });
  }
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
