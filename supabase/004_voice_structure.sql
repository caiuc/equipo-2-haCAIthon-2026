-- Opcional. El prototipo ya guarda el formulario en clinical_events.payload.
-- Solo pégalo si el SQL Editor responde; si falla "Failed to fetch", ignóralo.

alter table public.voice_records
  add column if not exists structure jsonb default '{}'::jsonb;
