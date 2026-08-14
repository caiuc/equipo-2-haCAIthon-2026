import type {
  AccessStatus,
  ActionType,
  AssignmentStatus,
  CaseStatus,
  ContactStatus,
  ElectricityStatus,
  IncidentMarker,
  MobilityStatus,
  NeedType,
  OperationalStatus,
} from "@/types";

export const needTypeLabel: Record<NeedType, string> = {
  DIALYSIS: "Diálisis",
  ELECTRIC_SUPPORT: "Electrodependencia",
};

export const mobilityLabel: Record<MobilityStatus, string> = {
  INDEPENDENT: "Se traslada solo",
  REQUIRES_TRANSPORT: "Requiere transporte",
};

export const contactLabel: Record<ContactStatus, string> = {
  PENDING: "Sin contactar",
  CONTACTED: "Contactado",
  UNREACHABLE: "No localizable",
};

export const caseStatusLabel: Record<CaseStatus, string> = {
  OPEN: "Abierto",
  ASSIGNED: "Asignado",
  RESOLVED: "Resuelto",
};

export const operationalLabel: Record<OperationalStatus, string> = {
  OPEN: "Operativo",
  PARTIAL: "Parcial",
  CLOSED: "Cerrado",
};

export const electricityLabel: Record<ElectricityStatus, string> = {
  GRID: "Red",
  BACKUP: "Generador",
  NONE: "Sin energía",
};

export const accessLabel: Record<AccessStatus, string> = {
  ACCESSIBLE: "Accesible",
  RESTRICTED: "Restringido",
  BLOCKED: "Bloqueado",
};

export const actionLabel: Record<ActionType, string> = {
  CONTACT: "Contactar",
  TRANSPORT: "Traslado",
  GENERATOR: "Asignar generador",
  TRANSFER: "Derivar a centro",
};

export const assignmentStatusLabel: Record<AssignmentStatus, string> = {
  PROPOSED: "Pendiente",
  APPROVED: "Aprobada",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
};

export const incidentLabel: Record<IncidentMarker["type"], string> = {
  ROAD_BLOCKED: "Ruta bloqueada",
  POWER_OUTAGE: "Corte eléctrico",
  FLOOD_ZONE: "Zona inundada",
};

export function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toLocaleString("es-CL", { maximumFractionDigits: 1 })} h`;
}

export function formatTimeUntil(iso: string, now = new Date()): string {
  const delta = new Date(iso).getTime() - now.getTime();
  const hours = delta / 3_600_000;
  if (hours < 0) return "ventana vencida";
  if (hours < 1) return `en ${Math.max(1, Math.round(hours * 60))} min`;
  return `en ${hours.toLocaleString("es-CL", { maximumFractionDigits: 1 })} h`;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
