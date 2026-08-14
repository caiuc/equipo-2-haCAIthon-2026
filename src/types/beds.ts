export type BedOccupancy = "FREE" | "OCCUPIED";

export type ErPatientStatus =
  | "STABLE"
  | "CRITICAL"
  | "OBSERVATION"
  | "WAITING";

export interface EmergencyBed {
  bedNumber: number;
  status: BedOccupancy;
  patientLabel: string | null;
  patientStatus: ErPatientStatus | null;
  chiefComplaint: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface BedMetrics {
  total: number;
  free: number;
  occupied: number;
  critical: number;
}

export interface BedUpdatePayload {
  bedNumber: number;
  status: BedOccupancy;
  patientLabel?: string | null;
  patientStatus?: ErPatientStatus | null;
  chiefComplaint?: string | null;
  notes?: string | null;
}
