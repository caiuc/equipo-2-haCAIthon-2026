import type { ClinicalStructure } from "./clinical";
import { demandIncrements } from "./clinical";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishInput = {
  hospitalId: string;
  professionalId: string;
  structure: ClinicalStructure;
};

export type PublishResult = {
  voiceRecordId: string;
  patientId: string | null;
  message: string;
};

export async function publishClinicalConfirmation(
  supabase: SupabaseClient<Database>,
  input: PublishInput,
): Promise<PublishResult> {
  const { structure, hospitalId, professionalId } = input;
  const now = new Date().toISOString();

  let patientId: string | null = null;
  if (structure.patient_code_hint) {
    const code = structure.patient_code_hint.toUpperCase();
    const existing = await supabase
      .from("patients")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (existing.data?.id) {
      patientId = existing.data.id;
    } else {
      const created = await supabase
        .from("patients")
        .insert({
          code,
          hospital_id: hospitalId,
          sex: structure.sex,
          age_years: structure.age_years,
        })
        .select("id")
        .single();
      if (created.error) throw new Error(created.error.message);
      patientId = created.data.id;
    }
  } else {
    const suffix = String(Date.now()).slice(-5);
    const created = await supabase
      .from("patients")
      .insert({
        code: `PAC-${suffix}`,
        hospital_id: hospitalId,
        sex: structure.sex,
        age_years: structure.age_years,
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);
    patientId = created.data.id;
  }

  const voice = await supabase
    .from("voice_records")
    .insert({
      hospital_id: hospitalId,
      professional_id: professionalId,
      patient_id: patientId,
      transcript: structure.transcript,
      stt_engine:
        structure.source === "deepseek" ? "groq-whisper+deepseek" : "regex",
      status: "validated",
    })
    .select("id")
    .single();
  if (voice.error) throw new Error(voice.error.message);

  if (structure.events.length) {
    const rows = structure.events.map((event_kind) => ({
      voice_record_id: voice.data.id,
      hospital_id: hospitalId,
      patient_id: patientId,
      event_kind,
      icu_certainty: structure.icu.certainty,
      relevant_condition: structure.relevant_condition,
      confidence: structure.icu.confidence,
      confirmation: "confirmed" as const,
      confirmed_at: now,
      payload: {
        source: structure.source,
        isolation_required: structure.isolation_required ?? null,
      },
    }));
    const inserted = await supabase.from("clinical_events").insert(rows);
    if (inserted.error) throw new Error(inserted.error.message);
  }

  const deltas = demandIncrements(structure);
  for (const [kind, amount] of Object.entries(deltas)) {
    if (!amount) continue;
    const current = await supabase
      .from("hospital_capacity")
      .select("demand_waiting")
      .eq("hospital_id", hospitalId)
      .eq("bed_kind", kind as "uci" | "uti" | "basica")
      .single();
    if (current.error) throw new Error(current.error.message);
    const updated = await supabase
      .from("hospital_capacity")
      .update({
        demand_waiting: current.data.demand_waiting + amount,
        updated_at: now,
      })
      .eq("hospital_id", hospitalId)
      .eq("bed_kind", kind as "uci" | "uti" | "basica");
    if (updated.error) throw new Error(updated.error.message);
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
    voiceRecordId: voice.data.id,
    patientId,
    message: "Publicado en la consola central",
  };
}
