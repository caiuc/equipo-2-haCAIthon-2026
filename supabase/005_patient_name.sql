-- Nombre de paciente dictado. El código PAC-##### se sigue generando en la app.

alter table public.patients
  add column if not exists display_name text;
