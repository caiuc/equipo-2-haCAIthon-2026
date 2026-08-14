import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type {
  BedMetrics,
  BedUpdatePayload,
  EmergencyBed,
  ErPatientStatus,
} from "@/types/beds";

const BED_COUNT = 8;

type BedRow = {
  bed_number: number;
  status: "FREE" | "OCCUPIED";
  patient_label: string | null;
  patient_status: ErPatientStatus | null;
  chief_complaint: string | null;
  notes: string | null;
  updated_at: string;
};

let db: Database.Database | null = null;

function dbPath() {
  return path.join(process.cwd(), "data", "urgencias.db");
}

function getDb() {
  if (db) return db;
  mkdirSync(path.dirname(dbPath()), { recursive: true });
  db = new Database(dbPath());
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS beds (
      bed_number INTEGER PRIMARY KEY CHECK (bed_number BETWEEN 1 AND 8),
      status TEXT NOT NULL CHECK (status IN ('FREE', 'OCCUPIED')),
      patient_label TEXT,
      patient_status TEXT,
      chief_complaint TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(database: Database.Database) {
  const count = database.prepare("SELECT COUNT(*) AS n FROM beds").get() as {
    n: number;
  };
  if (count.n > 0) return;
  const now = new Date().toISOString();
  const insert = database.prepare(
    `INSERT INTO beds (bed_number, status, patient_label, patient_status, chief_complaint, notes, updated_at)
     VALUES (?, 'FREE', NULL, NULL, NULL, NULL, ?)`,
  );
  const tx = database.transaction(() => {
    for (let n = 1; n <= BED_COUNT; n += 1) insert.run(n, now);
  });
  tx();
}

function mapRow(row: BedRow): EmergencyBed {
  return {
    bedNumber: row.bed_number,
    status: row.status,
    patientLabel: row.patient_label,
    patientStatus: row.patient_status,
    chiefComplaint: row.chief_complaint,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export function getAllBeds(): EmergencyBed[] {
  const rows = getDb()
    .prepare(
      `SELECT bed_number, status, patient_label, patient_status, chief_complaint, notes, updated_at
       FROM beds ORDER BY bed_number`,
    )
    .all() as BedRow[];
  return rows.map(mapRow);
}

export function getBedMetrics(beds = getAllBeds()): BedMetrics {
  return {
    total: beds.length,
    free: beds.filter((bed) => bed.status === "FREE").length,
    occupied: beds.filter((bed) => bed.status === "OCCUPIED").length,
    critical: beds.filter((bed) => bed.patientStatus === "CRITICAL").length,
  };
}

export function updateBed(payload: BedUpdatePayload): EmergencyBed {
  const existing = getDb()
    .prepare(
      `SELECT bed_number, status, patient_label, patient_status, chief_complaint, notes, updated_at
       FROM beds WHERE bed_number = ?`,
    )
    .get(payload.bedNumber) as BedRow | undefined;

  if (!existing) {
    throw new Error("bed_not_found");
  }

  const now = new Date().toISOString();
  const next: BedRow =
    payload.status === "FREE"
      ? {
          bed_number: payload.bedNumber,
          status: "FREE",
          patient_label: null,
          patient_status: null,
          chief_complaint: null,
          notes: payload.notes?.trim() || null,
          updated_at: now,
        }
      : {
          bed_number: payload.bedNumber,
          status: "OCCUPIED",
          patient_label:
            payload.patientLabel?.trim() ||
            existing.patient_label ||
            `Paciente U-00${payload.bedNumber}`,
          patient_status: payload.patientStatus ?? existing.patient_status,
          chief_complaint:
            payload.chiefComplaint?.trim() || existing.chief_complaint,
          notes: payload.notes?.trim() || existing.notes,
          updated_at: now,
        };

  if (next.status === "OCCUPIED" && !next.patient_status) {
    throw new Error("patient_status_required");
  }

  getDb()
    .prepare(
      `UPDATE beds
       SET status = ?, patient_label = ?, patient_status = ?, chief_complaint = ?, notes = ?, updated_at = ?
       WHERE bed_number = ?`,
    )
    .run(
      next.status,
      next.patient_label,
      next.patient_status,
      next.chief_complaint,
      next.notes,
      next.updated_at,
      next.bed_number,
    );

  return mapRow(next);
}
