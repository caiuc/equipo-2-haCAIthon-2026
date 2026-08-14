import { ZONE_CENTROIDS } from "@/lib/mock/data";
import type {
  ActionType,
  Assignment,
  FacilityStatus,
  NeedType,
  OperationalAlert,
  PatientNeed,
  ZoneAggregate,
} from "@/types";

export const ATTENTION_WINDOW_HOURS = 8;
export const BACKUP_WATCH_HOURS = 4;
export const BACKUP_CRITICAL_HOURS = 2;

export interface DashboardMetrics {
  openCases: number;
  operationalSlots: number;
  generatorsAvailable: number;
  criticalAlerts: number;
  contactedPatients: number;
  casesWithoutAlternative: number;
  partialOrClosedFacilities: number;
  pendingActions: number;
  unverifiedUpdates: number;
  facilitiesOpen: number;
  actionSoon: number;
}

export interface QueueRow {
  assignment: Assignment;
  patient: PatientNeed | null;
  facility: FacilityStatus | null;
  alertReason: string;
  alternatives: FacilityStatus[];
  isCritical: boolean;
  hoursToAttention: number;
}

function facilityById(
  facilities: FacilityStatus[],
  id: string | null,
): FacilityStatus | undefined {
  if (!id) return undefined;
  return facilities.find((facility) => facility.facilityId === id);
}

export function nowPlusHours(hours: number, now = new Date()): Date {
  return new Date(now.getTime() + hours * 3_600_000);
}

export function hoursUntil(iso: string, now = new Date()): number {
  return (new Date(iso).getTime() - now.getTime()) / 3_600_000;
}

export function hasActiveAssignment(
  assignments: Assignment[],
  patientId: string,
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.patientNeedId === patientId &&
      (assignment.status === "APPROVED" ||
        assignment.status === "IN_PROGRESS" ||
        assignment.status === "COMPLETED"),
  );
}

export function isFacilityDegraded(facility: FacilityStatus | undefined): boolean {
  if (!facility) return false;
  return (
    facility.operationalStatus === "CLOSED" ||
    facility.operationalStatus === "PARTIAL"
  );
}

export function isMatchable(facility: FacilityStatus): boolean {
  return (
    facility.availableCapacity > 0 &&
    facility.waterAvailable &&
    facility.accessStatus === "ACCESSIBLE" &&
    facility.operationalStatus !== "CLOSED"
  );
}

export function matchFacilities(
  patient: PatientNeed,
  facilities: FacilityStatus[],
): FacilityStatus[] {
  return facilities
    .filter((facility) => isMatchable(facility))
    .filter((facility) => facility.facilityId !== patient.usualFacilityId)
    .sort((a, b) => b.availableCapacity - a.availableCapacity);
}

export function isCriticalPatient(patient: PatientNeed, now = new Date()): boolean {
  const lowBackup =
    patient.backupHoursRemaining !== null &&
    patient.backupHoursRemaining <= BACKUP_CRITICAL_HOURS;
  const overdue = hoursUntil(patient.nextRequiredAttention, now) <= 2;
  return lowBackup || overdue;
}

function alertMessage(patient: PatientNeed, usual?: FacilityStatus): string {
  const lowBackup =
    patient.backupHoursRemaining !== null &&
    patient.backupHoursRemaining <= BACKUP_WATCH_HOURS;
  if (lowBackup && patient.backupHoursRemaining !== null && patient.backupHoursRemaining <= BACKUP_CRITICAL_HOURS) {
    return "Este caso se aproxima a una interrupción (autonomía bajo 2 h) y todavía no tiene una acción asignada.";
  }
  if (isFacilityDegraded(usual)) {
    return "Este caso se aproxima a una interrupción y todavía no tiene una acción asignada. El centro habitual no está plenamente operativo.";
  }
  if (lowBackup) {
    return "Autonomía de respaldo limitada y todavía no hay una acción asignada.";
  }
  return "Este caso se aproxima a una interrupción y todavía no tiene una acción asignada.";
}

export function computeAlerts(
  patients: PatientNeed[],
  facilities: FacilityStatus[],
  assignments: Assignment[],
  now = new Date(),
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  for (const patient of patients) {
    if (patient.caseStatus !== "OPEN") continue;
    if (hasActiveAssignment(assignments, patient.id)) continue;

    const usual = facilityById(facilities, patient.usualFacilityId);
    const lowBackup =
      patient.backupHoursRemaining !== null &&
      patient.backupHoursRemaining <= BACKUP_WATCH_HOURS;
    const imminent = hoursUntil(patient.nextRequiredAttention, now) <= ATTENTION_WINDOW_HOURS;
    const degraded = isFacilityDegraded(usual);
    const unreachable = patient.contactStatus === "UNREACHABLE";

    const shouldAlert =
      lowBackup ||
      (imminent && degraded) ||
      (degraded && patient.needType === "DIALYSIS") ||
      unreachable;

    if (!shouldAlert) continue;

    const severity: OperationalAlert["severity"] =
      isCriticalPatient(patient, now) || unreachable ? "CRITICAL" : "WATCH";

    alerts.push({
      id: `alert-${patient.id}`,
      patientNeedId: patient.id,
      facilityId: patient.usualFacilityId,
      message: alertMessage(patient, usual),
      severity,
      createdAt: now.toISOString(),
    });
  }

  for (const facility of facilities) {
    if (facility.verificationStatus === "PENDING") {
      alerts.push({
        id: `alert-unverified-${facility.facilityId}`,
        patientNeedId: null,
        facilityId: facility.facilityId,
        message: `Actualización de ${facility.name} pendiente de verificación humana.`,
        severity: "WATCH",
        createdAt: now.toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "CRITICAL" ? -1 : 1;
    return 0;
  });
}

function teamFor(action: ActionType, need: NeedType): string {
  if (action === "GENERATOR") return "Equipo municipal";
  if (action === "CONTACT") return "Coordinación territorial";
  if (need === "DIALYSIS") return "Coordinación renal";
  return "Servicio de Salud";
}

function desiredAction(
  patient: PatientNeed,
  usual: FacilityStatus | undefined,
  now: Date,
): ActionType | null {
  const degraded = isFacilityDegraded(usual);
  const imminent = hoursUntil(patient.nextRequiredAttention, now) <= ATTENTION_WINDOW_HOURS;
  const lowBackup =
    patient.backupHoursRemaining !== null &&
    patient.backupHoursRemaining <= BACKUP_WATCH_HOURS;

  if (patient.needType === "DIALYSIS" && degraded) {
    if (patient.mobility === "REQUIRES_TRANSPORT") return "TRANSPORT";
    return "TRANSFER";
  }
  if (patient.needType === "ELECTRIC_SUPPORT" && lowBackup) return "GENERATOR";
  if (patient.contactStatus === "PENDING" || patient.contactStatus === "UNREACHABLE") {
    return "CONTACT";
  }
  if (imminent && degraded) return "TRANSFER";
  return null;
}

export function proposeAssignments(
  patients: PatientNeed[],
  facilities: FacilityStatus[],
  existing: Assignment[],
  now = new Date(),
): Assignment[] {
  const remainingCapacity = new Map(
    facilities.map((facility) => [facility.facilityId, facility.availableCapacity]),
  );
  for (const assignment of existing) {
    if (
      assignment.facilityId &&
      (assignment.status === "APPROVED" ||
        assignment.status === "IN_PROGRESS" ||
        assignment.status === "PROPOSED") &&
      (assignment.actionType === "TRANSFER" || assignment.actionType === "TRANSPORT")
    ) {
      const current = remainingCapacity.get(assignment.facilityId) ?? 0;
      remainingCapacity.set(assignment.facilityId, Math.max(0, current - 1));
    }
  }

  const proposals: Assignment[] = [];

  for (const patient of patients) {
    if (patient.caseStatus !== "OPEN") continue;
    if (hasActiveAssignment(existing, patient.id)) continue;
    const alreadyProposed = existing.some(
      (assignment) =>
        assignment.patientNeedId === patient.id && assignment.status === "PROPOSED",
    );
    if (alreadyProposed) continue;

    const usual = facilityById(facilities, patient.usualFacilityId);
    const action = desiredAction(patient, usual, now);
    if (!action) continue;

    let facilityId: string | null = null;
    if (action === "TRANSFER" || action === "TRANSPORT") {
      const matches = matchFacilities(patient, facilities).filter(
        (facility) => (remainingCapacity.get(facility.facilityId) ?? 0) > 0,
      );
      const chosen = matches[0];
      if (!chosen) continue;
      facilityId = chosen.facilityId;
      remainingCapacity.set(
        chosen.facilityId,
        (remainingCapacity.get(chosen.facilityId) ?? 0) - 1,
      );
    }

    proposals.push({
      id: `asg-${patient.id}-${action.toLowerCase()}-${now.getTime()}`,
      patientNeedId: patient.id,
      facilityId,
      actionType: action,
      responsibleTeam: teamFor(action, patient.needType),
      status: "PROPOSED",
      createdAt: now.toISOString(),
    });
  }

  return proposals;
}

export function computeMetrics(
  patients: PatientNeed[],
  facilities: FacilityStatus[],
  assignments: Assignment[],
  alerts: OperationalAlert[],
  generatorsAvailable: number,
  now = new Date(),
): DashboardMetrics {
  const openCases = patients.filter((patient) => patient.caseStatus !== "RESOLVED").length;
  const operationalSlots = facilities
    .filter(isMatchable)
    .reduce((sum, facility) => sum + facility.availableCapacity, 0);
  const actionSoon = patients.filter(
    (patient) =>
      patient.caseStatus === "OPEN" &&
      hoursUntil(patient.nextRequiredAttention, now) <= ATTENTION_WINDOW_HOURS,
  ).length;
  const casesWithoutAlternative = patients.filter((patient) => {
    if (patient.caseStatus !== "OPEN") return false;
    const usual = facilityById(facilities, patient.usualFacilityId);
    return isFacilityDegraded(usual) && !hasActiveAssignment(assignments, patient.id);
  }).length;

  return {
    openCases,
    operationalSlots,
    generatorsAvailable,
    criticalAlerts: alerts.filter((alert) => alert.severity === "CRITICAL").length,
    contactedPatients: patients.filter((patient) => patient.contactStatus === "CONTACTED")
      .length,
    casesWithoutAlternative,
    partialOrClosedFacilities: facilities.filter(isFacilityDegraded).length,
    pendingActions: assignments.filter((assignment) => assignment.status === "PROPOSED")
      .length,
    unverifiedUpdates: facilities.filter(
      (facility) => facility.verificationStatus === "PENDING",
    ).length,
    facilitiesOpen: facilities.filter((facility) => facility.operationalStatus === "OPEN")
      .length,
    actionSoon,
  };
}

export function buildActionQueue(
  patients: PatientNeed[],
  facilities: FacilityStatus[],
  assignments: Assignment[],
  now = new Date(),
): QueueRow[] {
  const statusRank: Record<Assignment["status"], number> = {
    PROPOSED: 0,
    IN_PROGRESS: 1,
    APPROVED: 2,
    COMPLETED: 3,
  };

  return assignments
    .map((assignment) => {
      const patient =
        patients.find((item) => item.id === assignment.patientNeedId) ?? null;
      const facility = facilityById(facilities, assignment.facilityId) ?? null;
      const usual = patient
        ? facilityById(facilities, patient.usualFacilityId)
        : undefined;
      const alternatives = patient ? matchFacilities(patient, facilities) : [];
      const isCritical = patient ? isCriticalPatient(patient, now) : false;
      const hoursToAttention = patient
        ? hoursUntil(patient.nextRequiredAttention, now)
        : Number.POSITIVE_INFINITY;

      let alertReason = "Acción propuesta por el motor operacional.";
      if (patient) {
        if (
          patient.backupHoursRemaining !== null &&
          patient.backupHoursRemaining <= BACKUP_CRITICAL_HOURS
        ) {
          alertReason = `Autonomía ${patient.backupHoursRemaining} h; todavía no hay responsable de continuidad.`;
        } else if (isFacilityDegraded(usual)) {
          alertReason = `${usual?.name ?? "Centro habitual"} no operativo del todo; tratamiento ${hoursToAttention.toFixed(1)} h.`;
        } else if (patient.contactStatus === "UNREACHABLE") {
          alertReason = "No localizable; la continuidad sigue sin confirmación.";
        } else if (patient.contactStatus === "PENDING") {
          alertReason = "Todavía no hay contacto confirmado con el caso.";
        } else if (hoursToAttention <= ATTENTION_WINDOW_HOURS) {
          alertReason = `Tratamiento próximo (${hoursToAttention.toFixed(1)} h) sin alternativa asignada.`;
        }
      }

      return {
        assignment,
        patient,
        facility,
        alertReason,
        alternatives,
        isCritical,
        hoursToAttention,
      };
    })
    .sort((a, b) => {
      const statusDelta =
        statusRank[a.assignment.status] - statusRank[b.assignment.status];
      if (statusDelta !== 0) return statusDelta;
      if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
      return a.hoursToAttention - b.hoursToAttention;
    });
}

export function aggregatePatientZones(patients: PatientNeed[]): ZoneAggregate[] {
  const groups = new Map<string, ZoneAggregate>();
  for (const patient of patients) {
    const current = groups.get(patient.currentZone);
    const coordinates =
      ZONE_CENTROIDS[patient.currentZone] ?? patient.coordinates;
    if (!current) {
      groups.set(patient.currentZone, {
        zone: patient.currentZone,
        count: 1,
        openCount: patient.caseStatus === "OPEN" ? 1 : 0,
        coordinates,
      });
    } else {
      current.count += 1;
      if (patient.caseStatus === "OPEN") current.openCount += 1;
    }
  }
  return [...groups.values()];
}

export function suggestedActionCopy(
  action: ActionType,
  facility: FacilityStatus | null,
  alternatives: FacilityStatus[],
): string {
  if (action === "GENERATOR") return "Asignar generador portátil al domicilio";
  if (action === "CONTACT") return "Contactar y confirmar estado de continuidad";
  if (action === "TRANSPORT") {
    const target = facility?.name ?? alternatives[0]?.name;
    return target
      ? `Trasladar a ${target}`
      : "Coordinar transporte; sin cupo compatible aún";
  }
  const target = facility?.name ?? alternatives[0]?.name;
  const extra = alternatives
    .filter((item) => item.facilityId !== facility?.facilityId)
    .slice(0, 2)
    .map((item) => `${item.name} (${item.availableCapacity})`);
  if (!target) return "Buscar cupo alternativo";
  if (extra.length === 0) return `Derivar a ${target}`;
  return `Derivar a ${target} · alternativa ${extra.join(", ")}`;
}
