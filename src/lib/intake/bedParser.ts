import type { BedOccupancy, ErPatientStatus } from "@/types/beds";

export interface BedStructuredUpdate {
  bedNumber: number | null;
  status: BedOccupancy | null;
  patientStatus: ErPatientStatus | null;
  patientLabel: string | null;
  chiefComplaint: string | null;
  confidence: "pending_verification";
  transcript: string;
}

export const DEMO_BED_ADMIT_PHRASE =
  "Ingreso cama 5, paciente crítico, dolor torácico";

export const DEMO_BED_FREE_PHRASE = "Cama 3 queda libre, alta médica";

export const DEMO_BED_OBSERVE_PHRASE =
  "Cama 2 ocupada, estable en observación por fractura de fémur";

const WORD_NUMBERS: Record<string, number> = {
  una: 1,
  un: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function bedFrom(text: string): number | null {
  const folded = normalize(text);
  const digit = folded.match(
    /\b(?:cama|box|litera|puesto)\s*(?:n(?:umero|°|o)?\.?\s*)?(\d)\b/,
  );
  if (digit) {
    const n = Number(digit[1]);
    return n >= 1 && n <= 8 ? n : null;
  }
  const word = folded.match(
    /\b(?:cama|box|litera|puesto)\s+(una|un|uno|dos|tres|cuatro|cinco|seis|siete|ocho)\b/,
  );
  if (word) return WORD_NUMBERS[word[1]] ?? null;
  return null;
}

function occupancyFrom(text: string): BedOccupancy | null {
  const t = normalize(text);
  if (/\b(libre|disponible|alta|desocup|vacia)\b/.test(t)) return "FREE";
  if (/\b(ocupad|ingreso|ingresar|admision|admit)\b/.test(t)) return "OCCUPIED";
  return null;
}

function patientStatusFrom(text: string): ErPatientStatus | null {
  const t = normalize(text);
  if (/\bcritic/.test(t) || /\bgrave\b/.test(t)) return "CRITICAL";
  if (/\bobserv/.test(t)) return "OBSERVATION";
  if (/\bespera\b|\bwaiting\b|\btriage\b/.test(t)) return "WAITING";
  if (/\bestable\b/.test(t)) return "STABLE";
  return null;
}

function complaintFrom(raw: string): string | null {
  const match = raw.match(
    /(?:por|motivo(?:\s+de)?|cuadro\s+de|con)\s+([^.,;]+)/i,
  );
  if (match) return match[1].trim().replace(/\s+/g, " ");

  const t = normalize(raw);
  const known = [
    ["dolor toracico", "dolor torácico"],
    ["politraumatismo", "politraumatismo"],
    ["fractura", "fractura"],
    ["disnea", "disnea"],
    ["convulsion", "convulsión"],
  ];
  for (const [needle, label] of known) {
    if (t.includes(needle)) return label;
  }
  return null;
}

function labelFrom(raw: string, bedNumber: number | null): string | null {
  const code = raw.match(/\b(U-\d{3})\b/i);
  if (code) return `Paciente ${code[1].toUpperCase()}`;
  const gender = normalize(raw);
  if (/paciente\s+femenin/.test(gender)) return "Paciente femenino";
  if (/paciente\s+masculin/.test(gender)) return "Paciente masculino";
  if (bedNumber) return `Paciente U-00${bedNumber}`;
  return null;
}

export function parseBedIntakeText(text: string): BedStructuredUpdate {
  const transcript = text.trim();
  const bedNumber = bedFrom(transcript);
  let status = occupancyFrom(transcript);
  const patientStatus = patientStatusFrom(transcript);
  if (!status && patientStatus) status = "OCCUPIED";

  return {
    bedNumber,
    status,
    patientStatus,
    patientLabel: status === "FREE" ? null : labelFrom(transcript, bedNumber),
    chiefComplaint: status === "FREE" ? null : complaintFrom(transcript),
    confidence: "pending_verification",
    transcript,
  };
}
