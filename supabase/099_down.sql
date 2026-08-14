-- Rollback. Pegar solo si necesitas borrar el esquema del prototipo.

alter publication supabase_realtime drop table if exists public.transfer_suggestions;
alter publication supabase_realtime drop table if exists public.discharge_pipeline;
alter publication supabase_realtime drop table if exists public.voice_records;
alter publication supabase_realtime drop table if exists public.clinical_events;
alter publication supabase_realtime drop table if exists public.hospital_capacity;

drop table if exists public.transfer_suggestions cascade;
drop table if exists public.clinical_events cascade;
drop table if exists public.voice_records cascade;
drop table if exists public.patients cascade;
drop table if exists public.professionals cascade;
drop table if exists public.discharge_pipeline cascade;
drop table if exists public.hospital_capacity cascade;
drop table if exists public.hospitals cascade;

drop type if exists public.event_kind;
drop type if exists public.icu_certainty;
drop type if exists public.event_confirmation;
drop type if exists public.voice_status;
drop type if exists public.bed_kind;
