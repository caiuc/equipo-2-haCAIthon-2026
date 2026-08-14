"use client";

import {
  computeAlerts,
  computeMetrics,
  proposeAssignments,
} from "@/lib/engine/continuity";
import type { StructuredUpdate } from "@/lib/intake/parser";
import {
  FACILITY_IDS,
  INITIAL_GENERATORS,
  createInitialAssignments,
  createInitialFacilities,
  createInitialIncidents,
  createInitialPatients,
} from "@/lib/mock/data";
import type {
  Assignment,
  AuditEvent,
  FacilityStatus,
  IncidentMarker,
  OperationalAlert,
  PatientNeed,
} from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

interface RawState {
  patients: PatientNeed[];
  facilities: FacilityStatus[];
  assignments: Assignment[];
  incidents: IncidentMarker[];
  generatorsAvailable: number;
  scenarioActive: boolean;
  audit: AuditEvent[];
  focusFacilityId: string | null;
  focusAt: number;
}

interface MockStore extends RawState {
  alerts: OperationalAlert[];
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  approveAssignment: (id: string) => void;
  rejectAssignment: (id: string) => void;
  focusFacility: (facilityId: string | null) => void;
  simulateCentroNorteWaterFailure: () => void;
  resetDemo: () => void;
  confirmFacilityUpdate: (
    facilityId: string,
    patch: Partial<FacilityStatus>,
  ) => void;
  confirmPatientUpdate: (patientId: string, patch: Partial<PatientNeed>) => void;
  applyStructuredUpdate: (
    update: StructuredUpdate,
    targetFacilityId?: string,
    targetPatientId?: string,
  ) => { ok: boolean; message: string };
}

const MockDataContext = createContext<MockStore | null>(null);

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function stamp(kind: AuditEvent["kind"], message: string): AuditEvent {
  return {
    id: newId("aud"),
    at: new Date().toISOString(),
    kind,
    message,
  };
}

function withEngine(state: RawState): RawState {
  const proposals = proposeAssignments(
    state.patients,
    state.facilities,
    state.assignments,
  );
  const assignments = [...state.assignments, ...proposals];
  return { ...state, assignments };
}

function createFreshState(): RawState {
  return withEngine({
    patients: createInitialPatients(),
    facilities: createInitialFacilities(),
    assignments: createInitialAssignments(),
    incidents: createInitialIncidents(),
    generatorsAvailable: INITIAL_GENERATORS,
    scenarioActive: false,
    focusFacilityId: null,
    focusAt: 0,
    audit: [
      stamp(
        "UPDATE",
        "Tablero iniciado con datos ficticios de demostración. Sin integración clínica real.",
      ),
    ],
  });
}

function findFacilityName(facilities: FacilityStatus[], hint: string | null) {
  if (!hint) return undefined;
  const needle = hint.toLowerCase();
  return facilities.find((facility) =>
    facility.name.toLowerCase().includes(needle),
  );
}

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RawState>(() => createFreshState());
  const [theme, setTheme] = useState<ThemeMode>("light");

  const alerts = useMemo(
    () => computeAlerts(state.patients, state.facilities, state.assignments),
    [state.patients, state.facilities, state.assignments],
  );

  const approveAssignment = useCallback((id: string) => {
    setState((current) => {
      const assignment = current.assignments.find((item) => item.id === id);
      if (!assignment || assignment.status !== "PROPOSED") return current;

      let generatorsAvailable = current.generatorsAvailable;
      const facilities = current.facilities.map((facility) => ({ ...facility }));
      const patients = current.patients.map((patient) => ({ ...patient }));

      if (assignment.actionType === "GENERATOR") {
        if (generatorsAvailable <= 0) return current;
        generatorsAvailable -= 1;
      }

      if (
        assignment.facilityId &&
        (assignment.actionType === "TRANSFER" ||
          assignment.actionType === "TRANSPORT")
      ) {
        const facility = facilities.find(
          (item) => item.facilityId === assignment.facilityId,
        );
        if (facility && facility.availableCapacity > 0) {
          facility.availableCapacity -= 1;
        }
      }

      const patient = patients.find(
        (item) => item.id === assignment.patientNeedId,
      );
      if (patient) {
        patient.caseStatus = "ASSIGNED";
        if (assignment.actionType === "CONTACT") {
          patient.contactStatus = "CONTACTED";
        }
      }

      const assignments = current.assignments.map((item) =>
        item.id === id ? { ...item, status: "APPROVED" as const } : item,
      );

      const code = patient?.anonymousCode ?? assignment.patientNeedId;
      return withEngine({
        ...current,
        facilities,
        patients,
        assignments,
        generatorsAvailable,
        focusFacilityId: assignment.facilityId ?? current.focusFacilityId,
        focusAt: assignment.facilityId ? Date.now() : current.focusAt,
        audit: [
          stamp(
            "APPROVAL",
            `Acción ${assignment.actionType} aprobada para ${code}. Responsable: ${assignment.responsibleTeam}.`,
          ),
          ...current.audit,
        ],
      });
    });
  }, []);

  const rejectAssignment = useCallback((id: string) => {
    setState((current) => {
      const assignment = current.assignments.find((item) => item.id === id);
      if (!assignment || assignment.status !== "PROPOSED") return current;

      const patients = current.patients.map((patient) =>
        patient.id === assignment.patientNeedId
          ? { ...patient, caseStatus: "OPEN" as const }
          : patient,
      );
      const assignments = current.assignments.map((item) =>
        item.id === id ? { ...item, status: "REJECTED" as const } : item,
      );
      const patient = patients.find((item) => item.id === assignment.patientNeedId);
      const code = patient?.anonymousCode ?? assignment.patientNeedId;

      return withEngine({
        ...current,
        patients,
        assignments,
        audit: [
          stamp(
            "REJECTION",
            `Acción ${assignment.actionType} rechazada para ${code}. La cama no se reserva.`,
          ),
          ...current.audit,
        ],
      });
    });
  }, []);

  const focusFacility = useCallback((facilityId: string | null) => {
    setState((current) => ({
      ...current,
      focusFacilityId: facilityId,
      focusAt: Date.now(),
    }));
  }, []);

  const simulateCentroNorteWaterFailure = useCallback(() => {
    setState((current) => {
      if (current.scenarioActive) return current;
      const now = new Date().toISOString();
      const facilities = current.facilities.map((facility) =>
        facility.facilityId === FACILITY_IDS.norte
          ? {
              ...facility,
              operationalStatus: "PARTIAL" as const,
              waterAvailable: false,
              electricity: "BACKUP" as const,
              backupHours: 4,
              accessStatus: "RESTRICTED" as const,
              updatedAt: now,
              verificationStatus: "VERIFIED" as const,
            }
          : facility,
      );

      const incidents = current.incidents.some(
        (incident) => incident.id === "inc-water-norte",
      )
        ? current.incidents
        : [
            {
              id: "inc-water-norte",
              type: "FLOOD_ZONE" as const,
              coordinates: [-70.665, -33.408] as [number, number],
              description:
                "Centro Norte sin agua potable; diálisis suspendida en el recinto.",
            },
            ...current.incidents,
          ];

      return withEngine({
        ...current,
        facilities,
        incidents,
        scenarioActive: true,
        audit: [
          stamp(
            "SIMULATION",
            "Centro Norte pierde agua y queda parcialmente operativo. El motor busca alternativas.",
          ),
          ...current.audit,
        ],
      });
    });
  }, []);

  const resetDemo = useCallback(() => {
    setState(createFreshState());
  }, []);

  const confirmFacilityUpdate = useCallback(
    (facilityId: string, patch: Partial<FacilityStatus>) => {
      setState((current) => {
        const cleaned = Object.fromEntries(
          Object.entries(patch).filter(([, value]) => value !== undefined),
        ) as Partial<FacilityStatus>;
        const facilities = current.facilities.map((facility) =>
          facility.facilityId === facilityId
            ? {
                ...facility,
                ...cleaned,
                facilityId,
                updatedAt: new Date().toISOString(),
                verificationStatus: "VERIFIED" as const,
              }
            : facility,
        );
        const name =
          facilities.find((item) => item.facilityId === facilityId)?.name ??
          facilityId;
        const norteDown =
          facilityId === FACILITY_IDS.norte &&
          (cleaned.waterAvailable === false ||
            cleaned.operationalStatus === "PARTIAL" ||
            cleaned.operationalStatus === "CLOSED");
        return withEngine({
          ...current,
          facilities,
          scenarioActive: current.scenarioActive || norteDown,
          audit: [
            stamp(
              "INTAKE",
              `Actualización de establecimiento verificada: ${name}.`,
            ),
            ...current.audit,
          ],
        });
      });
    },
    [],
  );

  const confirmPatientUpdate = useCallback(
    (patientId: string, patch: Partial<PatientNeed>) => {
      setState((current) => {
        const patients = current.patients.map((patient) =>
          patient.id === patientId
            ? { ...patient, ...patch, id: patientId, clinicalPriority: "DEFINED_BY_PROVIDER" as const }
            : patient,
        );
        const code =
          patients.find((item) => item.id === patientId)?.anonymousCode ??
          patientId;
        return withEngine({
          ...current,
          patients,
          audit: [
            stamp("INTAKE", `Actualización de caso verificada: ${code}.`),
            ...current.audit,
          ],
        });
      });
    },
    [],
  );

  const applyStructuredUpdate = useCallback(
    (
      update: StructuredUpdate,
      targetFacilityId?: string,
      targetPatientId?: string,
    ) => {
      const facility =
        (targetFacilityId &&
          state.facilities.find((item) => item.facilityId === targetFacilityId)) ||
        findFacilityName(state.facilities, update.facilityNameHint) ||
        (update.target === "facility" ? state.facilities[0] : undefined);

      const patient =
        (targetPatientId &&
          state.patients.find((item) => item.id === targetPatientId)) ||
        state.patients.find(
          (item) =>
            update.patientCodeHint &&
            item.anonymousCode === update.patientCodeHint,
        );

      if (targetPatientId || (update.target === "patient" && !targetFacilityId)) {
        if (!patient) {
          return {
            ok: false,
            message: "No se encontró un caso ficticio para aplicar la actualización.",
          };
        }
        confirmPatientUpdate(patient.id, {
          backupHoursRemaining:
            update.backup_hours ?? patient.backupHoursRemaining,
          needType: update.need_type ?? patient.needType,
          mobility: update.mobility ?? patient.mobility,
          contactStatus: update.contact_status ?? patient.contactStatus,
        });
        return {
          ok: true,
          message: `Caso ${patient.anonymousCode} actualizado. El motor recalculará acciones.`,
        };
      }

      if (!facility) {
        return {
          ok: false,
          message: "Selecciona un establecimiento antes de confirmar.",
        };
      }

      confirmFacilityUpdate(facility.facilityId, {
        electricity: update.power_status ?? facility.electricity,
        backupHours: update.backup_hours ?? facility.backupHours,
        waterAvailable:
          update.water_status === null
            ? facility.waterAvailable
            : update.water_status === "available",
        accessStatus: update.access_status ?? facility.accessStatus,
        operationalStatus:
          update.water_status === "unavailable" ||
          update.access_status === "BLOCKED" ||
          update.power_status === "NONE"
            ? "PARTIAL"
            : facility.operationalStatus,
      });

      return {
        ok: true,
        message: `${facility.name} actualizado con verificación humana. El motor recalculará acciones.`,
      };
    },
    [confirmFacilityUpdate, confirmPatientUpdate, state.facilities, state.patients],
  );

  const value = useMemo<MockStore>(
    () => ({
      ...state,
      alerts,
      theme,
      setTheme,
      approveAssignment,
      rejectAssignment,
      focusFacility,
      simulateCentroNorteWaterFailure,
      resetDemo,
      confirmFacilityUpdate,
      confirmPatientUpdate,
      applyStructuredUpdate,
    }),
    [
      state,
      alerts,
      theme,
      approveAssignment,
      rejectAssignment,
      focusFacility,
      simulateCentroNorteWaterFailure,
      resetDemo,
      confirmFacilityUpdate,
      confirmPatientUpdate,
      applyStructuredUpdate,
    ],
  );

  return (
    <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>
  );
}

export function useMockStore() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockStore debe usarse dentro de MockDataProvider");
  }
  return context;
}

export function useDashboardMetrics() {
  const store = useMockStore();
  return computeMetrics(
    store.patients,
    store.facilities,
    store.assignments,
    store.alerts,
    store.generatorsAvailable,
  );
}
