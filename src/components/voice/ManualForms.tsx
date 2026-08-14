"use client";

import { Button } from "@/components/ui/Button";
import { useMockStore } from "@/lib/mock/mockStore";
import type { AccessStatus, ContactStatus, ElectricityStatus, MobilityStatus, OperationalStatus } from "@/types";
import { useState } from "react";

export function ManualForms() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FacilityForm />
      <PatientForm />
    </div>
  );
}

function FacilityForm() {
  const { facilities, confirmFacilityUpdate } = useMockStore();
  const [facilityId, setFacilityId] = useState(facilities[0]?.facilityId ?? "");
  const [operationalStatus, setOperationalStatus] =
    useState<OperationalStatus>("PARTIAL");
  const [electricity, setElectricity] = useState<ElectricityStatus>("BACKUP");
  const [backupHours, setBackupHours] = useState("4");
  const [waterAvailable, setWaterAvailable] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("RESTRICTED");
  const [done, setDone] = useState(false);

  return (
    <form
      className="rounded-xl border border-white/10 bg-[var(--panel)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        confirmFacilityUpdate(facilityId, {
          operationalStatus,
          electricity,
          backupHours: Number(backupHours),
          waterAvailable,
          accessStatus,
          availableCapacity: waterAvailable ? undefined : 0,
        });
        setDone(true);
      }}
    >
      <h3 className="text-sm font-semibold">Formulario de establecimiento</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Canal 2 de ingreso. Sin voz, sin modelo. Confirmación humana al enviar.
      </p>
      <Field label="Establecimiento">
        <select
          value={facilityId}
          onChange={(event) => setFacilityId(event.target.value)}
        >
          {facilities.map((facility) => (
            <option key={facility.facilityId} value={facility.facilityId}>
              {facility.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado">
          <select
            value={operationalStatus}
            onChange={(event) =>
              setOperationalStatus(event.target.value as OperationalStatus)
            }
          >
            <option value="OPEN">Operativo</option>
            <option value="PARTIAL">Parcial</option>
            <option value="CLOSED">Cerrado</option>
          </select>
        </Field>
        <Field label="Energía">
          <select
            value={electricity}
            onChange={(event) =>
              setElectricity(event.target.value as ElectricityStatus)
            }
          >
            <option value="GRID">Red</option>
            <option value="BACKUP">Generador</option>
            <option value="NONE">Sin energía</option>
          </select>
        </Field>
        <Field label="Horas de respaldo">
          <input
            type="number"
            min={0}
            value={backupHours}
            onChange={(event) => setBackupHours(event.target.value)}
          />
        </Field>
        <Field label="Acceso">
          <select
            value={accessStatus}
            onChange={(event) =>
              setAccessStatus(event.target.value as AccessStatus)
            }
          >
            <option value="ACCESSIBLE">Accesible</option>
            <option value="RESTRICTED">Restringido</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={waterAvailable}
          onChange={(event) => setWaterAvailable(event.target.checked)}
        />
        Agua disponible
      </label>
      <Button className="mt-4" type="submit">
        Verificar y actualizar establecimiento
      </Button>
      {done ? (
        <p className="mt-2 text-sm text-emerald-300">
          Estado operacional actualizado. Revisa la cola de acciones.
        </p>
      ) : null}
    </form>
  );
}

function PatientForm() {
  const { patients, confirmPatientUpdate } = useMockStore();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [backupHours, setBackupHours] = useState("2");
  const [contactStatus, setContactStatus] = useState<ContactStatus>("CONTACTED");
  const [mobility, setMobility] = useState<MobilityStatus>("REQUIRES_TRANSPORT");
  const [done, setDone] = useState(false);

  return (
    <form
      className="rounded-xl border border-white/10 bg-[var(--panel)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        confirmPatientUpdate(patientId, {
          backupHoursRemaining: Number(backupHours),
          contactStatus,
          mobility,
        });
        setDone(true);
      }}
    >
      <h3 className="text-sm font-semibold">Formulario de paciente / cuidador</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Sin diagnóstico ni historia clínica. Solo continuidad operacional.
      </p>
      <Field label="Caso (código anónimo)">
        <select
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.anonymousCode} · {patient.currentZone}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Horas de autonomía">
          <input
            type="number"
            min={0}
            step={0.5}
            value={backupHours}
            onChange={(event) => setBackupHours(event.target.value)}
          />
        </Field>
        <Field label="Contacto">
          <select
            value={contactStatus}
            onChange={(event) =>
              setContactStatus(event.target.value as ContactStatus)
            }
          >
            <option value="PENDING">Sin contactar</option>
            <option value="CONTACTED">Contactado</option>
            <option value="UNREACHABLE">No localizable</option>
          </select>
        </Field>
        <Field label="Movilidad">
          <select
            value={mobility}
            onChange={(event) =>
              setMobility(event.target.value as MobilityStatus)
            }
          >
            <option value="INDEPENDENT">Se traslada solo</option>
            <option value="REQUIRES_TRANSPORT">Requiere transporte</option>
          </select>
        </Field>
      </div>
      <Button className="mt-4" type="submit">
        Verificar y actualizar caso
      </Button>
      {done ? (
        <p className="mt-2 text-sm text-emerald-300">Caso actualizado en el tablero.</p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
      {label}
      <div className="mt-1 text-sm font-normal text-[var(--text)] [&_input]:w-full [&_select]:w-full [&_input]:rounded-lg [&_select]:rounded-lg [&_input]:border [&_select]:border [&_input]:border-white/10 [&_select]:border-white/10 [&_input]:bg-black/30 [&_select]:bg-black/30 [&_input]:p-2 [&_select]:p-2">
        {children}
      </div>
    </label>
  );
}
