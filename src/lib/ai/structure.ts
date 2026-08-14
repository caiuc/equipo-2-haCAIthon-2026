import {
  type ClinicalStructure,
  type EventKind,
  type IcuCertainty,
} from "@shared/clinical";
import { parseClinicalText } from "@shared/clinicalParser";

const SYSTEM_PROMPT = `Eres un extractor clínico-operacional para Continuidad Vital (Chile).
Devuelves SOLO JSON válido, sin markdown.
No diagnosticas. No tomas decisiones. Distingues certeza:
- confirmed: el profesional indicó UCI de forma afirmativa
- possible: "posible", "probablemente"
- conditional: "si empeora", "podría"
- not_required: no se menciona o se niega
UCI posible o condicional NUNCA debe convertirse en ICU_CONFIRMED.
Campos:
{
  "patient_code_hint": string|null,
  "sex": "M"|"F"|null,
  "age_years": number|null,
  "requires_hospitalization": boolean|null,
  "icu": { "certainty": "confirmed"|"possible"|"not_required"|"conditional", "confidence": number|null },
  "uti_required": boolean|null,
  "basic_bed_required": boolean|null,
  "isolation_required": boolean|null,
  "relevant_condition": string|null,
  "discharge_ordered": boolean,
  "events": string[],
  "confidence": "pending_verification",
  "transcript": string
}
events solo puede incluir: REQUIRES_HOSPITALIZATION, POSSIBLE_ICU_REQUIREMENT, ICU_CONFIRMED, UTI_REQUIRED, BASIC_BED_REQUIRED, ISOLATION_REQUIRED, DISCHARGE_ORDERED, PATIENT_DISCHARGED, BED_CLEANING, BED_AVAILABLE, TRANSFER_SUGGESTED.
confidence siempre "pending_verification".`;

const EVENT_KINDS = new Set<EventKind>([
  "REQUIRES_HOSPITALIZATION",
  "POSSIBLE_ICU_REQUIREMENT",
  "ICU_CONFIRMED",
  "UTI_REQUIRED",
  "BASIC_BED_REQUIRED",
  "ISOLATION_REQUIRED",
  "DISCHARGE_ORDERED",
  "PATIENT_DISCHARGED",
  "BED_CLEANING",
  "BED_AVAILABLE",
  "TRANSFER_SUGGESTED",
]);

const ICU: IcuCertainty[] = [
  "confirmed",
  "possible",
  "not_required",
  "conditional",
];

function isIcuCertainty(value: unknown): value is IcuCertainty {
  return typeof value === "string" && ICU.includes(value as IcuCertainty);
}

function coerce(raw: unknown, transcript: string): ClinicalStructure {
  const fallback = parseClinicalText(transcript);
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Record<string, unknown>;
  const icuRaw = row.icu;
  const icuObj =
    icuRaw && typeof icuRaw === "object"
      ? (icuRaw as Record<string, unknown>)
      : {};
  const events = Array.isArray(row.events)
    ? row.events.filter((item): item is EventKind =>
        typeof item === "string" && EVENT_KINDS.has(item as EventKind),
      )
    : fallback.events;

  return {
    patient_code_hint:
      typeof row.patient_code_hint === "string" ? row.patient_code_hint : fallback.patient_code_hint,
    sex: row.sex === "M" || row.sex === "F" ? row.sex : fallback.sex,
    age_years:
      typeof row.age_years === "number" ? row.age_years : fallback.age_years,
    requires_hospitalization:
      typeof row.requires_hospitalization === "boolean"
        ? row.requires_hospitalization
        : fallback.requires_hospitalization,
    icu: {
      certainty: isIcuCertainty(icuObj.certainty)
        ? icuObj.certainty
        : fallback.icu.certainty,
      confidence:
        typeof icuObj.confidence === "number"
          ? icuObj.confidence
          : fallback.icu.confidence,
    },
    uti_required:
      typeof row.uti_required === "boolean" ? row.uti_required : fallback.uti_required,
    basic_bed_required:
      typeof row.basic_bed_required === "boolean"
        ? row.basic_bed_required
        : fallback.basic_bed_required,
    isolation_required:
      typeof row.isolation_required === "boolean"
        ? row.isolation_required
        : fallback.isolation_required,
    relevant_condition:
      typeof row.relevant_condition === "string"
        ? row.relevant_condition
        : fallback.relevant_condition,
    discharge_ordered:
      typeof row.discharge_ordered === "boolean"
        ? row.discharge_ordered
        : fallback.discharge_ordered,
    events: events.length ? events : fallback.events,
    confidence: "pending_verification",
    transcript,
    source: "deepseek",
  };
}

export async function structureTranscript(
  transcript: string,
): Promise<ClinicalStructure> {
  const trimmed = transcript.trim();
  const fallback = parseClinicalText(trimmed);
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.LLM_MODEL ?? "deepseek-chat";

  if (!apiKey || !trimmed) {
    return fallback;
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: trimmed },
        ],
      }),
    });

    if (!response.ok) return fallback;
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content) as unknown;
    return guardUncertainty(coerce(parsed, trimmed));
  } catch {
    return fallback;
  }
}

function guardUncertainty(value: ClinicalStructure): ClinicalStructure {
  const folded = value.transcript
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const uncertain = /probablemente|posible|podria|si empeora/.test(folded);
  if (!uncertain || value.icu.certainty !== "confirmed") return value;
  return {
    ...value,
    icu: {
      ...value.icu,
      certainty: /si empeora|podria/.test(folded) ? "conditional" : "possible",
    },
    events: value.events.map((event) =>
      event === "ICU_CONFIRMED" ? "POSSIBLE_ICU_REQUIREMENT" : event,
    ),
  };
}
