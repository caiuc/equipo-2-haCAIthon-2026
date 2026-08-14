-- Continuidad Vital / MVP hackathon
-- Pegar primero en el SQL Editor de Supabase.
-- Capacidad efectiva = fisicas - fuera_servicio - sin_dotacion - ocupadas

create type public.bed_kind as enum ('uci', 'uti', 'basica');
create type public.voice_status as enum ('pending', 'validated', 'edited', 'discarded');
create type public.event_confirmation as enum ('proposed', 'confirmed', 'rejected');
create type public.icu_certainty as enum ('confirmed', 'possible', 'not_required', 'conditional');
create type public.event_kind as enum (
  'REQUIRES_HOSPITALIZATION',
  'POSSIBLE_ICU_REQUIREMENT',
  'ICU_CONFIRMED',
  'UTI_REQUIRED',
  'BASIC_BED_REQUIRED',
  'ISOLATION_REQUIRED',
  'DISCHARGE_ORDERED',
  'PATIENT_DISCHARGED',
  'BED_CLEANING',
  'BED_AVAILABLE',
  'TRANSFER_SUGGESTED'
);

create table public.hospitals (
  id text primary key,
  name text not null,
  commune text not null,
  complexity_level text not null,
  lat double precision not null,
  lng double precision not null,
  isolation_available integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.hospital_capacity (
  hospital_id text not null references public.hospitals(id) on delete cascade,
  bed_kind public.bed_kind not null,
  physical_beds integer not null,
  out_of_service integer not null default 0,
  unstaffed integer not null default 0,
  occupied integer not null default 0,
  effective_available integer not null,
  demand_waiting integer not null default 0,
  projected_4h integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (hospital_id, bed_kind)
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals(id),
  display_name text not null,
  unit text not null
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  hospital_id text not null references public.hospitals(id),
  sex text,
  age_years integer,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.voice_records (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals(id),
  professional_id uuid references public.professionals(id),
  patient_id uuid references public.patients(id),
  transcript text not null,
  duration_seconds numeric,
  stt_engine text not null default 'groq-whisper',
  status public.voice_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.clinical_events (
  id uuid primary key default gen_random_uuid(),
  voice_record_id uuid references public.voice_records(id),
  hospital_id text not null references public.hospitals(id),
  patient_id uuid references public.patients(id),
  event_kind public.event_kind not null,
  icu_certainty public.icu_certainty,
  relevant_condition text,
  confidence numeric,
  confirmation public.event_confirmation not null default 'proposed',
  payload jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.discharge_pipeline (
  hospital_id text primary key references public.hospitals(id) on delete cascade,
  medical_discharge integer not null default 0,
  pending_egress integer not null default 0,
  bed_cleaning integer not null default 0,
  bed_ready integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.transfer_suggestions (
  id uuid primary key default gen_random_uuid(),
  from_hospital_id text not null references public.hospitals(id),
  to_hospital_id text not null references public.hospitals(id),
  bed_kind public.bed_kind not null,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);

create index clinical_events_hospital_created_idx
  on public.clinical_events (hospital_id, created_at desc);
create index voice_records_hospital_status_idx
  on public.voice_records (hospital_id, status);
create index hospital_capacity_kind_idx
  on public.hospital_capacity (bed_kind);
