import type {
  Assignment,
  FacilityStatus,
  IncidentMarker,
  PatientNeed,
} from "@/types";

const FAC_NORTE = "fac-norte";
const FAC_B = "fac-clinica-b";
const FAC_SUR = "fac-sur";
const FAC_ORIENTE = "fac-oriente";

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export const ZONE_CENTROIDS: Record<string, [number, number]> = {
  Independencia: [-70.665, -33.415],
  Recoleta: [-70.64, -33.4],
  Providencia: [-70.615, -33.432],
  "San Miguel": [-70.651, -33.499],
  Maipú: [-70.748, -33.511],
  Quilicura: [-70.728, -33.355],
};

export const MAP_CENTER = {
  longitude: -70.66,
  latitude: -33.44,
  zoom: 10.6,
};

export const INITIAL_GENERATORS = 3;

export function createInitialFacilities(): FacilityStatus[] {
  const now = new Date().toISOString();
  return [
    {
      facilityId: FAC_NORTE,
      name: "Centro Norte",
      operationalStatus: "OPEN",
      totalCapacity: 12,
      availableCapacity: 6,
      electricity: "GRID",
      backupHours: 12,
      waterAvailable: true,
      accessStatus: "ACCESSIBLE",
      coordinates: [-70.665, -33.408],
      updatedAt: now,
      verificationStatus: "VERIFIED",
    },
    {
      facilityId: FAC_B,
      name: "Clínica B",
      operationalStatus: "OPEN",
      totalCapacity: 8,
      availableCapacity: 4,
      electricity: "GRID",
      backupHours: 18,
      waterAvailable: true,
      accessStatus: "ACCESSIBLE",
      coordinates: [-70.612, -33.426],
      updatedAt: now,
      verificationStatus: "VERIFIED",
    },
    {
      facilityId: FAC_SUR,
      name: "Centro Sur",
      operationalStatus: "OPEN",
      totalCapacity: 6,
      availableCapacity: 3,
      electricity: "GRID",
      backupHours: 10,
      waterAvailable: true,
      accessStatus: "ACCESSIBLE",
      coordinates: [-70.65, -33.498],
      updatedAt: now,
      verificationStatus: "VERIFIED",
    },
    {
      facilityId: FAC_ORIENTE,
      name: "Clínica Oriente",
      operationalStatus: "OPEN",
      totalCapacity: 5,
      availableCapacity: 2,
      electricity: "BACKUP",
      backupHours: 8,
      waterAvailable: true,
      accessStatus: "ACCESSIBLE",
      coordinates: [-70.55, -33.41],
      updatedAt: now,
      verificationStatus: "VERIFIED",
    },
  ];
}

export function createInitialPatients(): PatientNeed[] {
  return [
    {
      id: "pat-d014",
      anonymousCode: "D-014",
      needType: "DIALYSIS",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(3),
      backupHoursRemaining: null,
      currentZone: "Independencia",
      coordinates: [-70.662, -33.418],
      mobility: "INDEPENDENT",
      contactStatus: "CONTACTED",
      caseStatus: "OPEN",
      usualFacilityId: FAC_NORTE,
    },
    {
      id: "pat-d021",
      anonymousCode: "D-021",
      needType: "DIALYSIS",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(5),
      backupHoursRemaining: null,
      currentZone: "Independencia",
      coordinates: [-70.67, -33.412],
      mobility: "REQUIRES_TRANSPORT",
      contactStatus: "PENDING",
      caseStatus: "OPEN",
      usualFacilityId: FAC_NORTE,
    },
    {
      id: "pat-d033",
      anonymousCode: "D-033",
      needType: "DIALYSIS",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(6.5),
      backupHoursRemaining: null,
      currentZone: "Recoleta",
      coordinates: [-70.642, -33.402],
      mobility: "INDEPENDENT",
      contactStatus: "CONTACTED",
      caseStatus: "OPEN",
      usualFacilityId: FAC_NORTE,
    },
    {
      id: "pat-d041",
      anonymousCode: "D-041",
      needType: "DIALYSIS",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(14),
      backupHoursRemaining: null,
      currentZone: "Independencia",
      coordinates: [-70.655, -33.422],
      mobility: "INDEPENDENT",
      contactStatus: "CONTACTED",
      caseStatus: "OPEN",
      usualFacilityId: FAC_NORTE,
    },
    {
      id: "pat-d055",
      anonymousCode: "D-055",
      needType: "DIALYSIS",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(4),
      backupHoursRemaining: null,
      currentZone: "Providencia",
      coordinates: [-70.618, -33.428],
      mobility: "INDEPENDENT",
      contactStatus: "CONTACTED",
      caseStatus: "OPEN",
      usualFacilityId: FAC_B,
    },
    {
      id: "pat-e008",
      anonymousCode: "E-008",
      needType: "ELECTRIC_SUPPORT",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(2),
      backupHoursRemaining: 2,
      currentZone: "Maipú",
      coordinates: [-70.748, -33.511],
      mobility: "REQUIRES_TRANSPORT",
      contactStatus: "CONTACTED",
      caseStatus: "OPEN",
      usualFacilityId: null,
    },
    {
      id: "pat-e012",
      anonymousCode: "E-012",
      needType: "ELECTRIC_SUPPORT",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(9),
      backupHoursRemaining: 6,
      currentZone: "Quilicura",
      coordinates: [-70.728, -33.355],
      mobility: "INDEPENDENT",
      contactStatus: "PENDING",
      caseStatus: "OPEN",
      usualFacilityId: null,
    },
    {
      id: "pat-e019",
      anonymousCode: "E-019",
      needType: "ELECTRIC_SUPPORT",
      clinicalPriority: "DEFINED_BY_PROVIDER",
      nextRequiredAttention: hoursFromNow(1.5),
      backupHoursRemaining: 1.5,
      currentZone: "San Miguel",
      coordinates: [-70.655, -33.498],
      mobility: "REQUIRES_TRANSPORT",
      contactStatus: "UNREACHABLE",
      caseStatus: "OPEN",
      usualFacilityId: null,
    },
  ];
}

export function createInitialAssignments(): Assignment[] {
  const now = new Date().toISOString();
  return [
    {
      id: "asg-e008-gen",
      patientNeedId: "pat-e008",
      facilityId: null,
      actionType: "GENERATOR",
      responsibleTeam: "Equipo municipal",
      status: "PROPOSED",
      createdAt: now,
    },
    {
      id: "asg-e019-gen",
      patientNeedId: "pat-e019",
      facilityId: null,
      actionType: "GENERATOR",
      responsibleTeam: "Equipo municipal",
      status: "PROPOSED",
      createdAt: now,
    },
    {
      id: "asg-e012-contact",
      patientNeedId: "pat-e012",
      facilityId: null,
      actionType: "CONTACT",
      responsibleTeam: "Coordinación territorial",
      status: "PROPOSED",
      createdAt: now,
    },
  ];
}

export function createInitialIncidents(): IncidentMarker[] {
  return [
    {
      id: "inc-road-norte",
      type: "ROAD_BLOCKED",
      coordinates: [-70.678, -33.385],
      description: "Acceso norte (Ruta 5) con deslizamiento; tránsito pesado cortado.",
    },
    {
      id: "inc-power-quilicura",
      type: "POWER_OUTAGE",
      coordinates: [-70.74, -33.36],
      description: "Corte eléctrico en Quilicura poniente, autonomía domiciliaria en descenso.",
    },
  ];
}

export const FACILITY_IDS = {
  norte: FAC_NORTE,
  clinicaB: FAC_B,
  sur: FAC_SUR,
  oriente: FAC_ORIENTE,
} as const;
