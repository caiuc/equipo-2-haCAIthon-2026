-- Seed sintético: 8 hospitales del diseño SIRENA (RM). Datos ficticios.
-- Idempotente: ON CONFLICT no duplica si ya corriste este archivo.

insert into public.hospitals (id, name, commune, complexity_level, lat, lng, isolation_available) values
  ('blt', 'Hospital Barros Luco Trudeau', 'San Miguel', 'Alta complejidad', -33.4986, -70.6560, 1),
  ('sdr', 'Hospital Dr. Sótero del Río', 'Puente Alto', 'Alta complejidad', -33.5860, -70.5750, 0),
  ('sjd', 'Hospital San Juan de Dios', 'Santiago poniente', 'Alta complejidad', -33.4396, -70.6836, 2),
  ('sal', 'Hospital del Salvador', 'Providencia', 'Alta complejidad', -33.4361, -70.6220, 1),
  ('sba', 'Hospital San Borja Arriarán', 'Santiago centro', 'Alta complejidad', -33.4586, -70.6520, 0),
  ('phb', 'Hospital Padre Hurtado', 'San Ramón', 'Mediana-alta complejidad', -33.5290, -70.6350, 1),
  ('fbu', 'Hospital Dr. Félix Bulnes', 'Cerro Navia', 'Alta complejidad', -33.4310, -70.7180, 3),
  ('ela', 'Hospital El Pino', 'San Bernardo', 'Mediana complejidad', -33.5716, -70.7030, 0)
on conflict (id) do update set
  name = excluded.name,
  commune = excluded.commune,
  complexity_level = excluded.complexity_level,
  lat = excluded.lat,
  lng = excluded.lng,
  isolation_available = excluded.isolation_available,
  updated_at = now();

insert into public.hospital_capacity (
  hospital_id, bed_kind, physical_beds, out_of_service, unstaffed, occupied,
  effective_available, demand_waiting, projected_4h
) values
  ('blt', 'uci',    10, 1, 1, 6,  2,  5, 1),
  ('blt', 'uti',    16, 2, 0, 10, 4,  3, 2),
  ('blt', 'basica', 120, 4, 0, 99, 17, 8, 5),
  ('sdr', 'uci',    12, 2, 1, 8,  1,  4, 1),
  ('sdr', 'uti',    18, 1, 2, 12, 3,  5, 1),
  ('sdr', 'basica', 140, 6, 0, 125, 9, 14, 7),
  ('sjd', 'uci',    11, 0, 0, 7,  4,  1, 2),
  ('sjd', 'uti',    14, 1, 0, 7,  6,  2, 1),
  ('sjd', 'basica', 110, 3, 2, 83, 22, 6, 4),
  ('sal', 'uci',     9, 1, 0, 5,  3,  2, 1),
  ('sal', 'uti',    12, 1, 1, 8,  2,  4, 0),
  ('sal', 'basica',  95, 2, 1, 80, 12, 9, 3),
  ('sba', 'uci',    10, 2, 1, 7,  0,  3, 1),
  ('sba', 'uti',    15, 2, 1, 10, 2,  2, 1),
  ('sba', 'basica', 105, 5, 2, 92, 6, 11, 4),
  ('phb', 'uci',     8, 1, 0, 5,  2,  2, 0),
  ('phb', 'uti',    10, 0, 1, 7,  2,  2, 1),
  ('phb', 'basica',  88, 3, 1, 74, 10, 7, 2),
  ('fbu', 'uci',    12, 0, 1, 6,  5,  1, 2),
  ('fbu', 'uti',    14, 1, 0, 8,  5,  1, 2),
  ('fbu', 'basica', 130, 2, 0, 102, 26, 5, 6),
  ('ela', 'uci',     6, 1, 0, 4,  1,  2, 1),
  ('ela', 'uti',     8, 1, 0, 5,  2,  1, 0),
  ('ela', 'basica',  70, 2, 1, 59, 8,  6, 3)
on conflict (hospital_id, bed_kind) do update set
  physical_beds = excluded.physical_beds,
  out_of_service = excluded.out_of_service,
  unstaffed = excluded.unstaffed,
  occupied = excluded.occupied,
  effective_available = excluded.effective_available,
  demand_waiting = excluded.demand_waiting,
  projected_4h = excluded.projected_4h,
  updated_at = now();

insert into public.discharge_pipeline (
  hospital_id, medical_discharge, pending_egress, bed_cleaning, bed_ready
) values
  ('blt', 2, 1, 1, 3),
  ('sdr', 1, 2, 2, 1),
  ('sjd', 3, 1, 0, 2),
  ('sal', 1, 1, 1, 1),
  ('sba', 0, 2, 1, 0),
  ('phb', 1, 0, 1, 1),
  ('fbu', 2, 1, 0, 4),
  ('ela', 1, 1, 1, 1)
on conflict (hospital_id) do update set
  medical_discharge = excluded.medical_discharge,
  pending_egress = excluded.pending_egress,
  bed_cleaning = excluded.bed_cleaning,
  bed_ready = excluded.bed_ready,
  updated_at = now();

insert into public.professionals (id, hospital_id, display_name, unit) values
  ('c1a1e000-0000-4000-8000-000000000001', 'blt', 'E. Riquelme', 'Urgencia adultos')
on conflict (id) do update set
  hospital_id = excluded.hospital_id,
  display_name = excluded.display_name,
  unit = excluded.unit;

insert into public.patients (id, code, hospital_id, sex, age_years) values
  ('c1a1e000-0000-4000-8000-000000000101', 'PAC-29381', 'blt', 'F', 64),
  ('c1a1e000-0000-4000-8000-000000000102', 'PAC-29377', 'blt', 'M', 58),
  ('c1a1e000-0000-4000-8000-000000000103', 'PAC-29372', 'blt', 'M', 81),
  ('c1a1e000-0000-4000-8000-000000000104', 'PAC-29384', 'blt', 'M', 72)
on conflict (id) do update set
  code = excluded.code,
  hospital_id = excluded.hospital_id,
  sex = excluded.sex,
  age_years = excluded.age_years;

insert into public.voice_records (
  id, hospital_id, professional_id, patient_id, transcript, duration_seconds, stt_engine, status
) values
  (
    'c1a1e000-0000-4000-8000-000000000201',
    'blt',
    'c1a1e000-0000-4000-8000-000000000001',
    'c1a1e000-0000-4000-8000-000000000101',
    'Paciente PAC-29381, se indica hospitalización en cama básica, estable.',
    11,
    'groq-whisper',
    'validated'
  ),
  (
    'c1a1e000-0000-4000-8000-000000000202',
    'blt',
    'c1a1e000-0000-4000-8000-000000000001',
    'c1a1e000-0000-4000-8000-000000000102',
    'PAC-29377 con alta médica, egreso pendiente de gestión de cama.',
    9,
    'groq-whisper',
    'validated'
  ),
  (
    'c1a1e000-0000-4000-8000-000000000203',
    'blt',
    'c1a1e000-0000-4000-8000-000000000001',
    'c1a1e000-0000-4000-8000-000000000103',
    'PAC-29372 probablemente requiera UCI si empeora. No confirmar UCI.',
    14,
    'groq-whisper',
    'pending'
  )
on conflict (id) do update set
  transcript = excluded.transcript,
  status = excluded.status;

insert into public.clinical_events (
  id, hospital_id, patient_id, voice_record_id, event_kind, icu_certainty,
  relevant_condition, confidence, confirmation, confirmed_at, payload
) values
  (
    'c1a1e000-0000-4000-8000-000000000301',
    'blt', 'c1a1e000-0000-4000-8000-000000000101', 'c1a1e000-0000-4000-8000-000000000201',
    'BASIC_BED_REQUIRED', 'not_required', null, 0.94, 'confirmed', now() - interval '40 minutes',
    '{"source":"seed"}'::jsonb
  ),
  (
    'c1a1e000-0000-4000-8000-000000000302',
    'blt', 'c1a1e000-0000-4000-8000-000000000102', 'c1a1e000-0000-4000-8000-000000000202',
    'DISCHARGE_ORDERED', 'not_required', null, 0.91, 'confirmed', now() - interval '25 minutes',
    '{"source":"seed"}'::jsonb
  ),
  (
    'c1a1e000-0000-4000-8000-000000000303',
    'blt', 'c1a1e000-0000-4000-8000-000000000103', 'c1a1e000-0000-4000-8000-000000000203',
    'POSSIBLE_ICU_REQUIREMENT', 'possible', null, 0.71, 'proposed', null,
    '{"source":"seed","note":"no suma a demanda"}'::jsonb
  )
on conflict (id) do update set
  event_kind = excluded.event_kind,
  confirmation = excluded.confirmation,
  payload = excluded.payload;

insert into public.transfer_suggestions (
  id, from_hospital_id, to_hospital_id, bed_kind, status
) values (
  'c1a1e000-0000-4000-8000-000000000401',
  'blt', 'fbu', 'uci', 'proposed'
)
on conflict (id) do update set
  status = excluded.status;
