import { getAllBeds, getBedMetrics, updateBed } from "@/lib/db/beds";
import type { BedOccupancy, ErPatientStatus } from "@/types/beds";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const STATUSES = new Set<BedOccupancy>(["FREE", "OCCUPIED"]);
const PATIENT_STATUSES = new Set<ErPatientStatus>([
  "STABLE",
  "CRITICAL",
  "OBSERVATION",
  "WAITING",
]);

export async function GET() {
  const beds = getAllBeds();
  return NextResponse.json({ beds, metrics: getBedMetrics(beds) });
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const bedNumber = Number(payload.bedNumber);
  const status = payload.status;

  if (!Number.isInteger(bedNumber) || bedNumber < 1 || bedNumber > 8) {
    return NextResponse.json({ error: "invalid_bed" }, { status: 400 });
  }
  if (typeof status !== "string" || !STATUSES.has(status as BedOccupancy)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  if (
    payload.patientStatus != null &&
    (typeof payload.patientStatus !== "string" ||
      !PATIENT_STATUSES.has(payload.patientStatus as ErPatientStatus))
  ) {
    return NextResponse.json({ error: "invalid_patient_status" }, { status: 400 });
  }

  try {
    const bed = updateBed({
      bedNumber,
      status: status as BedOccupancy,
      patientLabel:
        typeof payload.patientLabel === "string" ? payload.patientLabel : null,
      patientStatus: (payload.patientStatus as ErPatientStatus | null) ?? null,
      chiefComplaint:
        typeof payload.chiefComplaint === "string"
          ? payload.chiefComplaint
          : null,
      notes: typeof payload.notes === "string" ? payload.notes : null,
    });
    const beds = getAllBeds();
    return NextResponse.json({
      bed,
      beds,
      metrics: getBedMetrics(beds),
      message:
        bed.status === "FREE"
          ? `Cama ${bed.bedNumber} marcada como libre.`
          : `Cama ${bed.bedNumber} actualizada en urgencias.`,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "update_failed";
    const statusCode = code === "patient_status_required" ? 400 : 404;
    return NextResponse.json({ error: code }, { status: statusCode });
  }
}
