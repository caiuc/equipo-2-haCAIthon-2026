import type {
  AccessStatus,
  ContactStatus,
  ElectricityStatus,
  MobilityStatus,
  NeedType,
} from "@/types";

export interface StructuredUpdate {
  target: "facility" | "patient" | "unknown";
  facilityNameHint: string | null;
  patientCodeHint: string | null;
  power_status: ElectricityStatus | null;
  backup_hours: number | null;
  water_status: "available" | "unavailable" | null;
  access_status: AccessStatus | null;
  need_type: NeedType | null;
  mobility: MobilityStatus | null;
  contact_status: ContactStatus | null;
  confidence: "pending_verification";
  transcript: string;
}

const FACILITY_HINTS: Array<[RegExp, string]> = [
  [/centro norte|independencia/i, "Centro Norte"],
  [/clinica b|clínica b|providencia/i, "Clínica B"],
  [/centro sur|san miguel/i, "Centro Sur"],
  [/clinica oriente|clínica oriente|las condes/i, "Clínica Oriente"],
];

export const DEMO_FACILITY_PHRASE =
  "Quedan cuatro horas de generador, no tenemos agua en el centro norte y el acceso está cortado";

export const DEMO_PATIENT_PHRASE =
  "Paciente electrodependiente E-008, quedan dos horas de batería y necesita transporte";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const WORD_HOURS: Record<string, number> = {
  una: 1,
  un: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  doce: 12,
};

function hoursFrom(text: string): number | null {
  const digit =
    text.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hrs?|horas?)/i) ??
    text.match(/quedan\s+(\d+(?:[.,]\d+)?)/i);
  if (digit) return Number(digit[1].replace(",", "."));

  const folded = normalize(text);
  const word = folded.match(
    /\b(una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce)\s*(?:h|hrs?|horas?)\b/,
  );
  if (word) return WORD_HOURS[word[1]] ?? null;
  return null;
}

export function parseOperationalText(text: string): StructuredUpdate {
  const raw = text.trim();
  const t = normalize(raw);

  const backup_hours = hoursFrom(raw);
  const mentionsWater = /agua/.test(t);
  const waterUnavailable = /sin agua|no tenemos agua|agua no|sin servicio de agua|no hay agua/.test(
    t,
  );
  const waterAvailable = mentionsWater && /con agua|agua disponible|hay agua/.test(t);

  const blocked = /bloquead|cortad|intransitable|sin acceso/.test(t);
  const restricted = /restringid|parcial/.test(t);
  const mentionsAccess = /acceso|ruta|camino/.test(t);

  const dialysis = /dialis/.test(t);
  const electric = /electro|bateria|generador|ventilador/.test(t);
  const transport = /transporte|ambulancia|no se puede mover|no puede traslad/.test(t);
  const independent = /se traslada|puede llegar|movilidad independiente/.test(t);

  const unreachable = /no localiz|no contesta|inalcanzable/.test(t);
  const contacted = /ya contact|hablamos|confirmado/.test(t);

  let facilityNameHint: string | null = null;
  for (const [pattern, name] of FACILITY_HINTS) {
    if (pattern.test(raw)) {
      facilityNameHint = name;
      break;
    }
  }

  const codeMatch = raw.match(/\b([DE]-\d{3})\b/i);
  const patientCodeHint = codeMatch ? codeMatch[1].toUpperCase() : null;

  const facilitySignals =
    Boolean(facilityNameHint) ||
    waterUnavailable ||
    (mentionsAccess && (blocked || restricted)) ||
    /centro|clinica|hospital|establecimiento/.test(t);

  const patientSignals =
    Boolean(patientCodeHint) || dialysis || /paciente|cuidador|domicilio/.test(t);

  let target: StructuredUpdate["target"] = "unknown";
  if (facilitySignals && !patientSignals) target = "facility";
  else if (patientSignals && !facilitySignals) target = "patient";
  else if (facilitySignals) target = "facility";
  else if (patientSignals) target = "patient";

  let power_status: ElectricityStatus | null = null;
  if (/sin (energia|luz|electricidad)|corte total/.test(t)) power_status = "NONE";
  else if (/generador|respaldo|bateria/.test(t)) power_status = "BACKUP";
  else if (/red electrica|con luz|energia de red/.test(t)) power_status = "GRID";

  let access_status: AccessStatus | null = null;
  if (mentionsAccess && blocked) access_status = "BLOCKED";
  else if (mentionsAccess && restricted) access_status = "RESTRICTED";
  else if (mentionsAccess && /accesible|despejado/.test(t)) access_status = "ACCESSIBLE";

  return {
    target,
    facilityNameHint,
    patientCodeHint,
    power_status,
    backup_hours,
    water_status: waterUnavailable
      ? "unavailable"
      : waterAvailable
        ? "available"
        : null,
    access_status,
    need_type: dialysis ? "DIALYSIS" : electric ? "ELECTRIC_SUPPORT" : null,
    mobility: transport ? "REQUIRES_TRANSPORT" : independent ? "INDEPENDENT" : null,
    contact_status: unreachable ? "UNREACHABLE" : contacted ? "CONTACTED" : null,
    confidence: "pending_verification",
    transcript: raw,
  };
}
