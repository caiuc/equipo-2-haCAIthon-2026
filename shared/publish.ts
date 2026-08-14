import type { BedKind, ClinicalStructure } from "./clinical";
import { demandIncrements, enrichStructure } from "./clinical";
import type { Database, Json } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishInput = {
  hospitalId: string;
  professionalId: string;
  structure: ClinicalStructure;
  sttEngine?: string;
  durationSeconds?: number;
  edited?: boolean;
};

export type PublishResult = {
  voiceRecordId: string;
  patientId: string | null;
  message: string;
};

type VoiceInsert = Database["public"]["Tables"]["voice_records"]["Insert"];

export async function publishClinicalConfirmation(
  supabase: SupabaseClient<Database>,
  input: PublishInput,
): Promise<PublishResult> {
  const structure = enrichStructure(input.structure);
  const { hospitalId, professionalId } = input;
  const sttEngine = input.sttEngine;
  const durationSeconds = finiteNumber(input.durationSeconds);
  const edited = Boolean(input.edited);
  const now = new Date().toISOString();
  const patientId = await upsertPatient(supabase, hospitalId, structure);
  const recordStructure = toVoiceRecordStructure(structure);

  const baseRow: VoiceInsert = {
    hospital_id: hospitalId,
    professional_id: professionalId,
    patient_id: patientId,
    transcript: structure.transcript,
    stt_engine:
      sttEngine ||
      (structure.source === "deepseek" ? "groq-whisper+deepseek" : "regex"),
    duration_seconds: durationSeconds,
    status: edited ? "edited" : "validated",
  };

  const voice = await insertVoiceRecord(supabase, baseRow, recordStructure);

  const snapshot = jsonSafe({
    form: recordStructure,
    source: structure.source,
    isolation_required: structure.isolation_required,
    criticality: structure.criticality,
    bed_actions: structure.bed_actions,
    analysis: structure.analysis,
    clinical_summary: structure.clinical_summary,
    vital_risk: structure.vital_risk,
    patient_name: structure.patient_name,
    edited,
  });

  if (structure.events.length) {
    const rows = structure.events.map((event_kind) => ({
      voice_record_id: voice.id,
      hospital_id: hospitalId,
      patient_id: patientId,
      event_kind,
      icu_certainty: structure.icu.certainty,
      relevant_condition: structure.relevant_condition,
      confidence: finiteNumber(structure.icu.confidence),
      confirmation: "confirmed" as const,
      confirmed_at: now,
      payload: snapshot,
    }));
    const inserted = await supabase.from("clinical_events").insert(rows);
    if (inserted.error) throw new Error(inserted.error.message);
  }

  const occupy = demandIncrements(structure);
  for (const [kind, amount] of Object.entries(occupy)) {
    if (!amount) continue;
    await applyCapacityDelta(
      supabase,
      hospitalId,
      kind as BedKind,
      amount,
      now,
    );
  }

  const vacate = structure.bed_actions.find((item) => item.action === "vacate");
  if (vacate) {
    await applyCapacityDelta(supabase, hospitalId, vacate.kind, -1, now);
  }

  if (structure.discharge_ordered) {
    const pipeline = await supabase
      .from("discharge_pipeline")
      .select("medical_discharge")
      .eq("hospital_id", hospitalId)
      .single();
    if (!pipeline.error && pipeline.data) {
      await supabase
        .from("discharge_pipeline")
        .update({
          medical_discharge: pipeline.data.medical_discharge + 1,
          updated_at: now,
        })
        .eq("hospital_id", hospitalId);
    }
  }

  return {
    voiceRecordId: voice.id,
    patientId,
    message: "Publicado en la consola central",
  };
}

export function toVoiceRecordStructure(structure: ClinicalStructure): Json {
  return jsonSafe({
    patient_code_hint: structure.patient_code_hint,
    patient_name: structure.patient_name,
    sex: structure.sex,
    age_years: finiteNumber(structure.age_years),
    requires_hospitalization: structure.requires_hospitalization,
    icu: {
      certainty: structure.icu.certainty,
      confidence: finiteNumber(structure.icu.confidence),
    },
    uti_required: structure.uti_required,
    basic_bed_required: structure.basic_bed_required,
    isolation_required: structure.isolation_required,
    relevant_condition: structure.relevant_condition,
    clinical_summary: structure.clinical_summary,
    analysis: structure.analysis,
    criticality: structure.criticality,
    vital_risk: structure.vital_risk,
    bed_actions: structure.bed_actions,
    discharge_ordered: structure.discharge_ordered,
    events: structure.events,
    confidence: "pending_verification",
    transcript: structure.transcript,
    source: structure.source,
  });
}

async function insertVoiceRecord(
  supabase: SupabaseClient<Database>,
  baseRow: VoiceInsert,
  structure: Json,
): Promise<{ id: string }> {
  const withStructure = await supabase
    .from("voice_records")
    .insert({ ...baseRow, structure })
    .select("id")
    .single();
  if (!withStructure.error && withStructure.data) return withStructure.data;
  if (!isMissingColumn(withStructure.error?.message, "structure")) {
    throw new Error(withStructure.error?.message ?? "No se pudo guardar el registro");
  }
  const fallback = await supabase
    .from("voice_records")
    .insert(baseRow)
    .select("id")
    .single();
  if (fallback.error) throw new Error(fallback.error.message);
  return fallback.data;
}

async function upsertPatient(
  supabase: SupabaseClient<Database>,
  hospitalId: string,
  structure: ClinicalStructure,
): Promise<string> {
  const code = structure.patient_code_hint?.trim()
    ? structure.patient_code_hint.toUpperCase()
    : `PAC-${String(Date.now()).slice(-5)}`;
  const existing = await supabase
    .from("patients")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  const patientId = existing.data?.id
    ? existing.data.id
    : await insertPatient(supabase, {
        code,
        hospital_id: hospitalId,
        sex: structure.sex,
        age_years: finiteNumber(structure.age_years),
      });
  if (structure.patient_name) {
    const named = await supabase
      .from("patients")
      .update({
        display_name: structure.patient_name,
        sex: structure.sex,
        age_years: finiteNumber(structure.age_years),
      })
      .eq("id", patientId);
    if (named.error && !isMissingColumn(named.error.message, "display_name")) {
      throw new Error(named.error.message);
    }
  }
  return patientId;
}

async function insertPatient(
  supabase: SupabaseClient<Database>,
  row: Database["public"]["Tables"]["patients"]["Insert"],
): Promise<string> {
  const created = await supabase.from("patients").insert(row).select("id").single();
  if (created.error) throw new Error(created.error.message);
  return created.data.id;
}

async function applyCapacityDelta(
  supabase: SupabaseClient<Database>,
  hospitalId: string,
  kind: BedKind,
  amount: number,
  now: string,
) {
  const current = await supabase
    .from("hospital_capacity")
    .select(
      "demand_waiting, occupied, effective_available, physical_beds, out_of_service, unstaffed",
    )
    .eq("hospital_id", hospitalId)
    .eq("bed_kind", kind)
    .single();
  if (current.error) throw new Error(current.error.message);
  const nextOccupied = Math.max(0, current.data.occupied + amount);
  const demand = Math.max(0, current.data.demand_waiting + amount);
  const effective = Math.max(
    0,
    current.data.physical_beds -
      current.data.out_of_service -
      current.data.unstaffed -
      nextOccupied,
  );
  const updated = await supabase
    .from("hospital_capacity")
    .update({
      demand_waiting: demand,
      occupied: nextOccupied,
      effective_available: effective,
      updated_at: now,
    })
    .eq("hospital_id", hospitalId)
    .eq("bed_kind", kind);
  if (updated.error) throw new Error(updated.error.message);
}

function finiteNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function jsonSafe(value: unknown): Json {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (typeof item === "number" && !Number.isFinite(item)) return null;
      if (item === undefined) return null;
      return item;
    }),
  ) as Json;
}

function isMissingColumn(message: string | undefined, column: string) {
  const text = message?.toLowerCase() ?? "";
  return (
    text.includes(column.toLowerCase()) &&
    (text.includes("schema cache") ||
      text.includes("could not find") ||
      text.includes("does not exist") ||
      text.includes("column"))
  );
}
