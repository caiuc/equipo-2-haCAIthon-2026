-- DEMO ONLY: prototipo sin login. Anon puede leer y escribir tablas sintéticas.
-- Idempotente: se puede volver a pegar si las policies ya existen.

alter table public.hospitals enable row level security;
alter table public.hospital_capacity enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.voice_records enable row level security;
alter table public.clinical_events enable row level security;
alter table public.discharge_pipeline enable row level security;
alter table public.transfer_suggestions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'hospitals',
    'hospital_capacity',
    'professionals',
    'patients',
    'voice_records',
    'clinical_events',
    'discharge_pipeline',
    'transfer_suggestions'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_demo', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_demo', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_demo', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_select_demo',
      t
    );
    execute format(
      'create policy %I on public.%I for insert to anon, authenticated with check (true)',
      t || '_insert_demo',
      t
    );
    execute format(
      'create policy %I on public.%I for update to anon, authenticated using (true) with check (true)',
      t || '_update_demo',
      t
    );
  end loop;
end $$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.hospital_capacity;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.clinical_events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.voice_records;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.discharge_pipeline;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.transfer_suggestions;
  exception when duplicate_object then null;
  end;
end $$;
