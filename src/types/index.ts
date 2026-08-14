export type NeedType = "DIALYSIS" | "ELECTRIC_SUPPORT";
export type MobilityStatus = "INDEPENDENT" | "REQUIRES_TRANSPORT";
export type ContactStatus = "PENDING" | "CONTACTED" | "UNREACHABLE";
export type CaseStatus = "OPEN" | "ASSIGNED" | "RESOLVED";

export interface PatientNeed {
  id: string;
  anonymousCode: string;
  needType: NeedType;
  clinicalPriority: "DEFINED_BY_PROVIDER";
  nextRequiredAttention: string;
  backupHoursRemaining: number | null;
  currentZone: string;
  coordinates: [number, number];
  mobility: MobilityStatus;
  contactStatus: ContactStatus;
  caseStatus: CaseStatus;
  usualFacilityId: string | null;
}

export type OperationalStatus = "OPEN" | "PARTIAL" | "CLOSED";
export type ElectricityStatus = "GRID" | "BACKUP" | "NONE";
export type AccessStatus = "ACCESSIBLE" | "RESTRICTED" | "BLOCKED";

export interface FacilityStatus {
  facilityId: string;
  name: string;
  operationalStatus: OperationalStatus;
  totalCapacity: number;
  availableCapacity: number;
  electricity: ElectricityStatus;
  backupHours: number | null;
  waterAvailable: boolean;
  accessStatus: AccessStatus;
  coordinates: [number, number];
  updatedAt: string;
  verificationStatus: "PENDING" | "VERIFIED";
}

export type ActionType = "CONTACT" | "TRANSPORT" | "GENERATOR" | "TRANSFER";
export type AssignmentStatus =
  | "PROPOSED"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED";

export interface Assignment {
  id: string;
  patientNeedId: string;
  facilityId: string | null;
  actionType: ActionType;
  responsibleTeam: string;
  status: AssignmentStatus;
  createdAt: string;
}

export interface IncidentMarker {
  id: string;
  type: "ROAD_BLOCKED" | "POWER_OUTAGE" | "FLOOD_ZONE";
  coordinates: [number, number];
  description: string;
}

export type AlertSeverity = "WATCH" | "CRITICAL";

export interface OperationalAlert {
  id: string;
  patientNeedId: string | null;
  facilityId: string | null;
  message: string;
  severity: AlertSeverity;
  createdAt: string;
}

export type AuditKind =
  | "INTAKE"
  | "SIMULATION"
  | "APPROVAL"
  | "REJECTION"
  | "ALERT"
  | "UPDATE"
  | "RESET";

export interface AuditEvent {
  id: string;
  at: string;
  message: string;
  kind: AuditKind;
}

export interface ZoneAggregate {
  zone: string;
  count: number;
  openCount: number;
  coordinates: [number, number];
}
